import { describe, expect, it } from "vitest";
import { ConfigFileStore } from "./config-store.js";
import { EnvFileStore, redactEnv, parseEnvVars } from "./env-store.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function tmpFile(name: string, content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mc-admin-"));
  const p = path.join(dir, name);
  await fs.writeFile(p, content, "utf8");
  return p;
}

describe("ConfigFileStore", () => {
  it("computes stable etag and detects conflicts via If-Match", async () => {
    const p = await tmpFile("openclaw.json", JSON.stringify({ a: 1 }, null, 2) + "\n");
    const store = new ConfigFileStore(p);

    const snap1 = await store.readSnapshot();
    expect(snap1.etag).toMatch(/^"cfg-[a-f0-9]{64}"$/);

    // write succeeds with correct etag
    const ok = await store.writeWithOptimisticLock({ expectedEtag: snap1.etag, nextConfig: { a: 2 } });
    expect("etag" in ok && typeof ok.etag === "string").toBe(true);

    // stale etag must conflict
    const conflict = await store.writeWithOptimisticLock({ expectedEtag: snap1.etag, nextConfig: { a: 3 } });
    expect("conflict" in conflict).toBe(true);
  });
});

describe("EnvFileStore", () => {
  it("redacts and parses env vars; supports optimistic lock", async () => {
    const raw = "# comment\nFOO=bar\nexport SECRET=shhh\n";
    expect(redactEnv(raw)).toContain("FOO=REDACTED");
    expect(redactEnv(raw)).toContain("SECRET=REDACTED");
    expect(parseEnvVars(raw).FOO).toBe("bar");
    expect(parseEnvVars(raw).SECRET).toBe("shhh");

    const p = await tmpFile(".env", raw);
    const store = new EnvFileStore(p);
    const snap1 = await store.readSnapshot();
    expect(snap1.etag).toMatch(/^"env-[a-f0-9]{64}"$/);

    const ok = await store.writeWithOptimisticLock({ expectedEtag: snap1.etag, nextRaw: "FOO=baz\n" });
    expect("etag" in ok && typeof ok.etag === "string").toBe(true);

    const conflict = await store.writeWithOptimisticLock({ expectedEtag: snap1.etag, nextRaw: "FOO=oops\n" });
    expect("conflict" in conflict).toBe(true);
  });
});
