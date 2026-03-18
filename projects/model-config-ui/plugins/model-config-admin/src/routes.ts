import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { readFile } from "node:fs/promises";
import { ConfigFileStore } from "./config-store.js";
import { EnvFileStore } from "./env-store.js";
import { getHeader, parseUrl, readJsonBody, requireMethod, sendJson, setSseHeaders } from "./http.js";
import { InMemoryRunStore } from "./run-store.js";
import { writeSse, writeSseComment } from "./sse.js";
import { defaultBenchRunner } from "./bench-runner.js";

const CONFIG_PATH = "/home/node/.openclaw/openclaw.json";
const ENV_PATH = "/home/node/.openclaw/.env";
// NOTE: routes.ts compiles to dist/routes.js.
// The built UI is placed at dist/ui/*, so we resolve relative to the compiled file.
const UI_DIST_DIR = new URL("./ui/", import.meta.url);

async function loadUiAsset(relPath: string): Promise<string | null> {
  try {
    const p = new URL(relPath, UI_DIST_DIR);
    return await readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function loadUiAssetBuffer(relPath: string): Promise<Buffer | null> {
  try {
    const p = new URL(relPath, UI_DIST_DIR);
    return await readFile(p);
  } catch {
    return null;
  }
}

function guessContentType(pathname: string): string {
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".ico")) return "image/x-icon";
  if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
  if (pathname.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

export function registerModelConfigAdminRoutes(api: OpenClawPluginApi): void {
  const logger = api.logger;
  const store = new ConfigFileStore(CONFIG_PATH);
  const envStore = new EnvFileStore(ENV_PATH);

  const runStore = new InMemoryRunStore({
    maxEvents: 2000,
    retainDoneMs: 10 * 60_000,
  });

  // Config APIs
  // Serve routes under BOTH:
  // 1) /plugins/model-config-admin/* (preferred, namespaced)
  // 2) /api/v1/* (fallback for environments where /plugins/* is blocked/routed differently)
  const bases = ["/plugins/model-config-admin", ""]; // "" => root

  for (const base of bases) {
    const prefix = base ? base : "";

    api.registerHttpRoute({
      path: `${prefix}/api/v1/config`,
      auth: "gateway",
      match: "exact",
      handler: async (req, res) => handleConfig(req, res, store, prefix),
    });

    api.registerHttpRoute({
      path: `${prefix}/api/v1/env`,
      auth: "gateway",
      match: "exact",
      handler: async (req, res) => handleEnv(req, res, envStore, prefix),
    });

    api.registerHttpRoute({
      path: `${prefix}/api/v1/config/validate`,
      auth: "gateway",
      match: "exact",
      handler: async (req, res) => handleValidate(req, res, store, prefix),
    });

    api.registerHttpRoute({
      path: `${prefix}/api/v1/runs`,
      auth: "gateway",
      match: "exact",
      handler: async (req, res) => handleRuns(api, req, res, runStore, store, envStore, logger, prefix),
    });

    api.registerHttpRoute({
      path: `${prefix}/api/v1/runs/`,
      auth: "gateway",
      match: "prefix",
      handler: async (req, res) => handleRunById(api, req, res, runStore, prefix),
    });
  }

  // UI route: register exactly once (namespaced).
  // IMPORTANT: Do not register this inside the bases loop, otherwise the root fallback base
  // would attempt to register the same exact route twice.
  // UI + assets: single prefix route.
  // Some gateway routers pass req.url as a path relative to the matched prefix,
  // so we cannot rely on seeing the full /plugins/... pathname here.
  api.registerHttpRoute({
    path: `/plugins/model-config-admin/ui`,
    auth: "plugin",
    match: "prefix",
    handler: async (req, res) => {
      if (!requireMethod(req, res, ["GET", "HEAD"])) return true;

      const url = new URL(req.url || "/", "http://localhost");
      let pathname = url.pathname || "/";

      // Normalize: strip the mount prefix if present.
      const mount = "/plugins/model-config-admin/ui";
      if (pathname.startsWith(mount)) pathname = pathname.slice(mount.length);
      if (!pathname.startsWith("/")) pathname = `/${pathname}`;

      // If requesting the UI root ("/" or empty), serve index.html
      if (pathname === "/" || pathname === "") {
        const html = await loadUiAsset("index.html");
        if (!html) {
          res.statusCode = 500;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end("UI build not found. Run dashboard-ui build.");
          return true;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.setHeader("cache-control", "no-store");
        if (req.method === "HEAD") res.end();
        else res.end(html);
        return true;
      }

      // Asset request: /assets/* etc.
      const rel = pathname.replace(/^\//, "");
      if (!rel || rel.includes("..")) {
        res.statusCode = 404;
        res.end("Not Found");
        return true;
      }
      const asset = await loadUiAssetBuffer(rel);
      if (!asset) {
        res.statusCode = 404;
        res.end("Not Found");
        return true;
      }
      res.statusCode = 200;
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
      res.setHeader("content-type", guessContentType(rel));
      if (req.method === "HEAD") res.end();
      else res.end(asset);
      return true;
    },
  });

  logger.info("model-config-admin: routes registered");
}

async function handleConfig(
  req: IncomingMessage,
  res: ServerResponse,
  store: ConfigFileStore,
  base: string,
): Promise<boolean> {
  const url = parseUrl(req);
  if (!url) return false;
  if (url.pathname !== `${base}/api/v1/config`) return false;

  if (req.method === "GET" || req.method === "HEAD") {
    const snap = await store.readSnapshot();
    res.setHeader("etag", snap.etag);
    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.end();
      return true;
    }
    sendJson(res, 200, { etag: snap.etag, mtimeMs: snap.mtimeMs, config: snap.config });
    return true;
  }

  if (req.method === "PUT") {
    const ifMatch = getHeader(req, "if-match");
    if (!ifMatch) {
      sendJson(res, 428, { error: "PRECONDITION_REQUIRED", message: "Missing If-Match" });
      return true;
    }

    const body = await readJsonBody(req);
    const nextConfig = (body as any)?.config;
    const validation = await store.validateConfig(nextConfig);
    if (!validation.ok) {
      sendJson(res, 422, { error: "VALIDATION_FAILED", ...validation });
      return true;
    }

    const result = await store.writeWithOptimisticLock({ expectedEtag: ifMatch, nextConfig });
    if ((result as any).conflict) {
      sendJson(res, 409, { error: "ETAG_MISMATCH", serverEtag: (result as any).etag });
      return true;
    }

    res.setHeader("etag", (result as any).etag);
    sendJson(res, 200, { etag: (result as any).etag });
    return true;
  }

  sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  return true;
}

async function handleValidate(
  req: IncomingMessage,
  res: ServerResponse,
  store: ConfigFileStore,
  base: string,
): Promise<boolean> {
  const url = parseUrl(req);
  if (!url) return false;
  if (url.pathname !== `${base}/api/v1/config/validate`) return false;
  if (!requireMethod(req, res, ["POST"])) return true;
  const body = await readJsonBody(req);
  const cfg = (body as any)?.config;
  const result = await store.validateConfig(cfg);
  sendJson(res, 200, result);
  return true;
}

async function handleEnv(
  req: IncomingMessage,
  res: ServerResponse,
  store: EnvFileStore,
  base: string,
): Promise<boolean> {
  const url = parseUrl(req);
  if (!url) return false;
  if (url.pathname !== `${base}/api/v1/env`) return false;

  if (req.method === "GET" || req.method === "HEAD") {
    const snap = await store.readSnapshot();
    res.setHeader("etag", snap.etag);
    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.end();
      return true;
    }
    sendJson(res, 200, { etag: snap.etag, mtimeMs: snap.mtimeMs, env: snap.redacted });
    return true;
  }

  if (req.method === "PUT") {
    const ifMatch = getHeader(req, "if-match");
    if (!ifMatch) {
      sendJson(res, 428, { error: "PRECONDITION_REQUIRED", message: "Missing If-Match" });
      return true;
    }

    const body = await readJsonBody(req);
    const nextEnv = (body as any)?.env;
    if (typeof nextEnv !== "string") {
      sendJson(res, 422, { error: "VALIDATION_FAILED", message: "env must be string" });
      return true;
    }

    const result = await store.writeWithOptimisticLock({ expectedEtag: ifMatch, nextRaw: nextEnv });
    if ((result as any).conflict) {
      sendJson(res, 409, { error: "ETAG_MISMATCH", serverEtag: (result as any).etag });
      return true;
    }

    res.setHeader("etag", (result as any).etag);
    sendJson(res, 200, { etag: (result as any).etag });
    return true;
  }

  sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  return true;
}

type BenchOverrides = {
  // Which site pool to use (configured in openclaw.json->__modelConfigAdmin)
  // "stable" by default; "public" for a separate pool.
  siteId?: "stable" | "public";

  // Model selection: either "provider/model" or just "model".
  modelId?: string;

  repeat?: number;
  messages?: { role: string; content: string }[];
};

async function handleRuns(
  api: OpenClawPluginApi,
  req: IncomingMessage,
  res: ServerResponse,
  runStore: InMemoryRunStore,
  logger: OpenClawPluginApi["logger"],
  base: string,
): Promise<boolean> {
  const url = parseUrl(req);
  if (!url) return false;
  if (url.pathname !== `${base}/api/v1/runs`) return false;

  if (!requireMethod(req, res, ["POST"])) return true;

  const body = await readJsonBody(req);
  const presetId = (body as any)?.presetId ?? "ui";
  const overrides = ((body as any)?.overrides ?? {}) as BenchOverrides;

  const run = runStore.createRun({ presetId, overrides });
  runStore.pushEvent(run.id, "run.created", { presetId, overrides });

  // Start async execution
  const aborter = new AbortController();
  runStore.setStatus(run.id, "running");
  runStore.pushEvent(run.id, "run.status", { status: "running" });

  void (async () => {
    try {
      const modelId = overrides.modelId ?? "default";
      const repeat = Math.max(1, Number(overrides.repeat ?? 1));
      const messages = Array.isArray(overrides.messages) && overrides.messages.length > 0
        ? overrides.messages
        : [{ role: "user", content: "你好" }];

      for (let i = 1; i <= repeat; i++) {
        runStore.pushEvent(run.id, "run.progress", {
          phase: "bench.running",
          percent: Math.floor(((i - 1) / repeat) * 100),
          message: `第 ${i}/${repeat} 次`,
        });

        // Resolve bench site configuration from openclaw.json + .env
        const cfgSnap = await store.readSnapshot();
        const cfg: any = cfgSnap.config || {};
        const adminCfg = (cfg as any).__modelConfigAdmin || {};
        const stableSites = Array.isArray(adminCfg.stableSites) ? adminCfg.stableSites : [];
        const publicSites = Array.isArray(adminCfg.publicSites) ? adminCfg.publicSites : [];
        const pool = (overrides.siteId ?? "stable") === "public" ? publicSites : stableSites;
        const enabledSites = pool.filter((x: any) => x && x.enabled !== false && x.baseUrl);
        if (!enabledSites.length) {
          throw new Error("NO_ENABLED_SITES");
        }
        const targetSite = enabledSites[0];
        const envSnap = await envStore.readSnapshot();
        const apiKey = targetSite.apiKeyEnv ? envSnap.vars[targetSite.apiKeyEnv] : undefined;

        await defaultBenchRunner.run({
          api,
          input: {
            modelId,
            messages,
            repeat: 1,
            baseUrl: targetSite.baseUrl,
            apiKey,
          },
          signal: aborter.signal,
          onEvent: (evt) => {
            if (evt.type === "request") {
              runStore.pushEvent(run.id, "model.request", {
                attempt: i,
                site: targetSite.name || targetSite.baseUrl,
              });
              return;
            }
            if (evt.type === "done") {
              runStore.pushEvent(run.id, "metric.sample", {
                attempt: i,
                site: targetSite.name || targetSite.baseUrl,
                ...evt.metrics,
              });
            }
          },
        });
      }

      runStore.setStatus(run.id, "succeeded");
      runStore.pushEvent(run.id, "run.result", { ok: true });
      runStore.pushEvent(run.id, "run.status", { status: "succeeded" });
    } catch (e) {
      logger.warn(`run ${run.id} failed: ${String(e)}`);
      runStore.setStatus(run.id, "failed");
      runStore.pushEvent(run.id, "run.error", { code: "RUN_FAILED", message: String(e) });
      runStore.pushEvent(run.id, "run.status", { status: "failed" });
    }
  })();

  sendJson(res, 202, {
    runId: run.id,
    status: run.status,
    // Browser EventSource cannot set Authorization header.
    // Provide a per-run token via query params for SSE + follow-up reads.
    runToken: run.runToken,
    sseUrl: `${base}/api/v1/runs/${run.id}/events?token=${encodeURIComponent(run.runToken || "")}`,
    statusUrl: `${base}/api/v1/runs/${run.id}?token=${encodeURIComponent(run.runToken || "")}`,
    cancelUrl: `${base}/api/v1/runs/${run.id}/cancel?token=${encodeURIComponent(run.runToken || "")}`,
  });
  return true;
}

async function handleRunById(
  api: OpenClawPluginApi,
  req: IncomingMessage,
  res: ServerResponse,
  runStore: InMemoryRunStore,
  base: string,
): Promise<boolean> {
  const url = parseUrl(req);
  if (!url) return false;
  if (!url.pathname.startsWith(`${base}/api/v1/runs/`)) return false;

  const parts = url.pathname.split("/").filter(Boolean);
  // parts: ["plugins","model-config-admin","api","v1","runs",":runId", ...]
  const runId = parts[5];
  const tail = parts.slice(6).join("/");
  if (!runId) return false;

  if (tail === "events") {
    if (!requireMethod(req, res, ["GET"])) return true;

    const run = runStore.getRun(runId);
    if (!run) {
      res.statusCode = 404;
      res.end("Run not found");
      return true;
    }

    // SSE auth: must match run.runToken (browser-friendly; EventSource can't set headers)
    const token = url.searchParams.get("token") || "";
    if (!run.runToken || token !== run.runToken) {
      res.statusCode = 401;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Unauthorized");
      return true;
    }

    setSseHeaders(res);

    const lastEventId = getHeader(req, "last-event-id");
    const replay = runStore.listEventsSince(runId, lastEventId);

    if (lastEventId && replay.length === 0) {
      // resync required
      const evt = runStore.pushEvent(runId, "run.resync_required", {
        latestEventId: run.events.at(-1)?.id ?? null,
      });
      if (evt) writeSse(res, evt);
    } else {
      for (const evt of replay) {
        writeSse(res, evt);
      }
    }

    const subscriber = {
      runId,
      lastSentId: replay.at(-1)?.id,
      send: (evt: { id: string; event: string; data: any }) => {
        writeSse(res, evt);
      },
      close: () => {
        try {
          res.end();
        } catch {
          // ignore
        }
      },
    };
    runStore.addSubscriber(subscriber);

    // heartbeat
    const hb = setInterval(() => {
      try {
        writeSseComment(res, "keep-alive");
      } catch {
        // ignore
      }
    }, 15_000);

    req.on("close", () => {
      clearInterval(hb);
      runStore.removeSubscriber(subscriber);
    });

    return true;
  }

  // Allow browser-friendly follow-ups (status/cancel) without Authorization header.
  // These read/write actions require the per-run token query.
  const token = url.searchParams.get("token") || "";
  const run = runStore.getRun(runId);
  if (!run) {
    sendJson(res, 404, { error: "NOT_FOUND" });
    return true;
  }
  if (!run.runToken || token !== run.runToken) {
    res.statusCode = 401;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Unauthorized");
    return true;
  }

  // GET run status
  if (req.method === "GET") {
    sendJson(res, 200, {
      runId: run.id,
      status: run.status,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    });
    return true;
  }

  // Cancel
  if (tail === "cancel" && req.method === "POST") {
    runStore.setStatus(runId, "cancelled");
    runStore.pushEvent(runId, "run.status", { status: "cancelled" });
    sendJson(res, 202, { runId, status: "cancelled" });
    return true;
  }

  sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  return true;
}
