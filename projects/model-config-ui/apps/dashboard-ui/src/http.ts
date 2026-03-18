// Minimal helper: EventSource can't send Authorization headers; we rely on sseUrl containing auth token.

export function parseAuthFromBearer(token: string) {
  const t = token.trim();
  return t ? { authorization: `Bearer ${t}` } : {};
}

export function jsonPretty(v: unknown) {
  return JSON.stringify(v, null, 2);
}
