import type { IncomingMessage, ServerResponse } from "node:http";

export function setJsonHeaders(res: ServerResponse): void {
  res.setHeader("cache-control", "no-store, max-age=0");
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
}

export function setSseHeaders(res: ServerResponse): void {
  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream; charset=utf-8");
  res.setHeader("cache-control", "no-cache, no-transform");
  res.setHeader("connection", "keep-alive");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  setJsonHeaders(res);
  res.end(JSON.stringify(body));
}

export async function readJsonBody(req: IncomingMessage, limitBytes = 1_000_000): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > limitBytes) {
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return null;
  }
  return JSON.parse(raw);
}

export function parseUrl(req: IncomingMessage): URL | null {
  if (!req.url) {
    return null;
  }
  try {
    return new URL(req.url, "http://127.0.0.1");
  } catch {
    return null;
  }
}

export function requireMethod(req: IncomingMessage, res: ServerResponse, allowed: string[]): boolean {
  if (!req.method || !allowed.includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("allow", allowed.join(", "));
    res.end("Method not allowed");
    return false;
  }
  return true;
}

export function getHeader(req: IncomingMessage, name: string): string | undefined {
  const v = req.headers?.[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return v;
}
