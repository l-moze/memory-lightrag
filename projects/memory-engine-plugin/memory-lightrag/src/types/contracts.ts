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

export type MemoryEntityType =
  | "person"
  | "org"
  | "project"
  | "task"
  | "event"
  | "concept"
  | "artifact"
  | "location"
  | "time"
  | "other";

export interface MemoryEntity {
  id: string;
  type: MemoryEntityType;
  name: string;
  aliases?: string[];
  summary?: string;
  attributes?: Record<string, string | number | boolean | null>;
  confidence?: number;
}

export type MemoryRelationType =
  | "mentions"
  | "about"
  | "belongs_to"
  | "depends_on"
  | "causes"
  | "resolved_by"
  | "updated_by"
  | "same_as"
  | "related_to";

export interface MemoryRelation {
  id: string;
  type: MemoryRelationType;
  fromEntityId: string;
  toEntityId: string;
  weight?: number;
  evidenceSourceIds?: string[];
  confidence?: number;
}

export type MemorySourceKind = "file" | "message" | "doc" | "api" | "web" | "unknown";

export interface MemorySource {
  id: string;
  kind: MemorySourceKind;
  uri?: string;
  title?: string;
  snippet?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface MemorySearchItem {
  id: string;
  content: string;
  score: number | null;
  source: string;
  entities: MemoryEntity[];
  relations: MemoryRelation[];
  sources: MemorySource[];
  metadata?: Record<string, unknown>;
  provenance?: { backend: string; timestamp?: string; queryMode?: string };
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
