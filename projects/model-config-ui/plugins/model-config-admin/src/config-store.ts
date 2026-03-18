import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type ConfigSnapshot = {
  etag: string;
  mtimeMs: number;
  versionHint: string; // used for history rows even if openclaw.json has no version
  config: unknown;
};

export type ValidationResult = {
  ok: boolean;
  warnings: string[];
  errors: { path: string; message: string }[];
};

function stableJsonStringify(obj: unknown): string {
  // Minimal stable stringify: JSON.stringify with sorted keys for objects.
  // (Keeps glue code small; no fancy canonicalizer.)
  const seen = new WeakSet();
  const norm = (v: any): any => {
    if (v && typeof v === "object") {
      if (seen.has(v)) {
        throw new Error("CIRCULAR_JSON");
      }
      seen.add(v);
      if (Array.isArray(v)) return v.map(norm);
      const out: Record<string, any> = {};
      for (const k of Object.keys(v).sort()) {
        out[k] = norm(v[k]);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(norm(obj), null, 2) + "\n";
}

export class ConfigFileStore {
  constructor(private readonly configPath: string) {}

  async readRaw(): Promise<{ raw: string; mtimeMs: number }> {
    const stat = await fs.stat(this.configPath);
    const raw = await fs.readFile(this.configPath, "utf8");
    return { raw, mtimeMs: stat.mtimeMs };
  }

  computeEtagFromRaw(raw: string): string {
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    return `"cfg-${hash}"`;
  }

  async readSnapshot(): Promise<ConfigSnapshot> {
    const { raw, mtimeMs } = await this.readRaw();
    const etag = this.computeEtagFromRaw(raw);
    const config = JSON.parse(raw);
    return { etag, mtimeMs, versionHint: String(mtimeMs), config };
  }

  async validateConfig(config: unknown): Promise<ValidationResult> {
    // MVP-1: structural validation is delegated to OpenClaw's own config validator in future.
    // Here we only ensure it's JSON-serializable + basic shape.
    try {
      JSON.stringify(config);
    } catch (e) {
      return {
        ok: false,
        warnings: [],
        errors: [{ path: "", message: `Config not JSON-serializable: ${String(e)}` }],
      };
    }

    if (!config || typeof config !== "object") {
      return { ok: false, warnings: [], errors: [{ path: "", message: "Config must be an object" }] };
    }

    return { ok: true, warnings: [], errors: [] };
  }

  async writeWithOptimisticLock(params: {
    expectedEtag: string;
    nextConfig: unknown;
    comment?: string;
    keepBackups?: number;
  }): Promise<{ etag: string } | { conflict: true; etag: string }> {
    const { raw } = await this.readRaw();
    const currentEtag = this.computeEtagFromRaw(raw);
    if (currentEtag !== params.expectedEtag) {
      return { conflict: true, etag: currentEtag };
    }

    // Backup current before overwrite.
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${this.configPath}.bak.${ts}`;
    await fs.copyFile(this.configPath, backupPath);

    const dir = path.dirname(this.configPath);
    const tmpPath = path.join(dir, `.${path.basename(this.configPath)}.tmp.${process.pid}.${Date.now()}`);

    const nextRaw = stableJsonStringify(params.nextConfig);

    // Write temp
    const fh = await fs.open(tmpPath, "wx", 0o600);
    try {
      await fh.writeFile(nextRaw, "utf8");
      await fh.sync(); // fsync(file) hard requirement
    } finally {
      await fh.close();
    }

    // Atomic replace
    await fs.rename(tmpPath, this.configPath);

    // Best-effort fsync(dir)
    try {
      const dh = await fs.open(dir, "r");
      try {
        await dh.sync();
      } finally {
        await dh.close();
      }
    } catch {
      // Allowed by contract: warn-only; no throw.
    }

    // Prune backups (keep last K)
    const keep = params.keepBackups ?? 20;
    await this.pruneBackups(keep);

    const newEtag = this.computeEtagFromRaw(nextRaw);
    return { etag: newEtag };
  }

  private async pruneBackups(keep: number): Promise<void> {
    const dir = path.dirname(this.configPath);
    const base = path.basename(this.configPath);
    const entries = await fs.readdir(dir);
    const backups = entries
      .filter((e) => e.startsWith(`${base}.bak.`))
      .map((name) => ({ name, full: path.join(dir, name) }));
    if (backups.length <= keep) return;

    const stats = await Promise.all(
      backups.map(async (b) => ({ ...b, stat: await fs.stat(b.full).catch(() => null) })),
    );
    const sorted = stats
      .filter((x) => x.stat)
      .sort((a, b) => (b.stat!.mtimeMs ?? 0) - (a.stat!.mtimeMs ?? 0));

    const toDelete = sorted.slice(keep);
    for (const item of toDelete) {
      try {
        await fs.unlink(item.full);
      } catch {
        // ignore
      }
    }
  }
}
