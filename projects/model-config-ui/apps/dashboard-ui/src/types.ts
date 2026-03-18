export type SiteEntry = {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv?: string; // e.g. YAO_API_KEY
  enabled?: boolean;
};

export type UiConfig = {
  stableSites: SiteEntry[];
  publicSites: SiteEntry[];
};

export type ConfigResponse = {
  etag: string;
  mtimeMs: number;
  config: Record<string, unknown>;
};

export type RunCreateResponse = {
  runId: string;
  status: string;
  sseUrl: string;
};

export type SseEvent = {
  id: string;
  ts: string;
  runId: string;
  type: string;
  data: any;
};
