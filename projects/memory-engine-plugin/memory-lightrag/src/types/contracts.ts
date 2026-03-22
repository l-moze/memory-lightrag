export type MemoryErrorType =
  | "BAD_CONFIG"
  | "AUTH_FAILED"
  | "BACKEND_DOWN"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "PARSE_ERROR"
  | "UPSTREAM_5XX";

export interface MemoryTypedError {
  type: MemoryErrorType;
  message: string;
  httpStatus?: number;
  retryable: boolean;
  actionHint: string;
}

export interface MemorySearchItem {
  content: string;
  score: number | null;
  source: string;
  metadata?: Record<string, unknown>;
  provenance?: { backend: string; timestamp?: string };
}

export interface MemorySearchResult {
  ok: boolean;
  backend: "lightrag";
  query: string;
  items: MemorySearchItem[];
  meta: {
    topKApplied: number;
    truncated: boolean;
    latencyMs: number;
    requestId?: string;
  };
  fallback?: boolean;
  reason?: MemoryErrorType;
  error?: MemoryTypedError;
}

export interface MemoryStatusResult {
  ok: boolean;
  backend: "lightrag";
  healthy: boolean;
  latencyMs?: number;
  diagnostics?: string[];
  fallback?: boolean;
  reason?: MemoryErrorType;
  error?: MemoryTypedError;
}
