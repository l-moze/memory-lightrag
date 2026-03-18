export const API_BASE = "/plugins/model-config-admin/api/v1";

export type ConfigResponse = {
  etag: string;
  mtimeMs: number;
  config: Record<string, unknown>;
};

export async function getConfig(headers: Record<string, string>): Promise<ConfigResponse> {
  const res = await fetch(`${API_BASE}/config`, { headers });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  return JSON.parse(txt);
}

export async function putConfig(headers: Record<string, string>, etag: string, body: string) {
  const res = await fetch(`${API_BASE}/config`, {
    method: "PUT",
    headers: { ...headers, "if-match": etag },
    body,
  });
  const txt = await res.text();
  return { res, txt };
}

export type RunCreateResponse = { runId: string; status: string; sseUrl: string };

export async function createRun(headers: Record<string, string>, payload: any): Promise<RunCreateResponse> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  return JSON.parse(txt);
}
