import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type EnvSnapshot = {
  etag: string;
  mtimeMs: number;
  raw: string;
  redacted: string;
  vars: Record<string, string>;
};

export function parseEnvVars(raw: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const cleaned = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const eq = cleaned.indexOf("=");
    if (eq === -1) continue;
    const key = cleaned.slice(0, eq).trim();
    if (!key) continue;
    let value = cleaned.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

export function redactEnv(raw: string): string {
  const lines = raw.split(/\r?\n/);
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      const match = line.match(/^([\t ]*)(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) return line;
      const indent = match[1] ?? "";
      const exportPrefix = match[2] ?? "";
      const key = match[3];
      return `${indent}${exportPrefix}${key}=REDACTED`;
    })
    .join("\n");
}

export class EnvFileStore {
  constructor(private readonly envPath: string) {}

  async readRaw(): Promise<{ raw: string; mtimeMs: number }> {
    const stat = await fs.stat(this.envPath);
    const raw = await fs.readFile(this.envPath, "utf8");
    return { raw, mtimeMs: stat.mtimeMs };
  }

  computeEtagFromRaw(raw: string): string {
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    return `"env-${hash}"`;
  }

  async readSnapshot(): Promise<EnvSnapshot> {
    const { raw, mtimeMs } = await this.readRaw();
    const etag = this.computeEtagFromRaw(raw);
    return {
      etag,
      mtimeMs,
      raw,
      redacted: redactEnv(raw),
      vars: parseEnvVars(raw),
    };
  }

  async writeWithOptimisticLock(params: {
    expectedEtag: string;
    nextRaw: string;
    keepBackups?: number;
  }): Promise<{ etag: string } | { conflict: true; etag: string }> {
    const { raw } = await this.readRaw();
    const currentEtag = this.computeEtagFromRaw(raw);
    if (currentEtag !== params.expectedEtag) {
      return { conflict: true, etag: currentEtag };
    }

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${this.envPath}.bak.${ts}`;
    await fs.copyFile(this.envPath, backupPath);

    const dir = path.dirname(this.envPath);
    const tmpPath = path.join(dir, `.${path.basename(this.envPath)}.tmp.${process.pid}.${Date.now()}`);

    const nextRaw = params.nextRaw.endsWith("\n") ? params.nextRaw : `${params.nextRaw}\n`;

    const fh = await fs.open(tmpPath, "wx", 0o600);
    try {
      await fh.writeFile(nextRaw, "utf8");
      await fh.sync();
    } finally {
      await fh.close();
    }

    await fs.rename(tmpPath, this.envPath);

    try {
      const dh = await fs.open(dir, "r");
      try {
        await dh.sync();
      } finally {
        await dh.close();
      }
    } catch {
      // ignore
    }

    const keep = params.keepBackups ?? 20;
    await this.pruneBackups(keep);

    const newEtag = this.computeEtagFromRaw(nextRaw);
    return { etag: newEtag };
  }

  private async pruneBackups(keep: number): Promise<void> {
    const dir = path.dirname(this.envPath);
    const base = path.basename(this.envPath);
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
