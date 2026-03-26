import type { LightragConfig } from "../config/schema.js";
import type { MemoryDomain } from "../policy/domain-routing.js";
import { buildPolicyFileSource } from "../policy/source-tag.js";

export interface MemorySearchResult {
  success: boolean;
  results?: Array<{
    path: string;
    content: string;
    line?: number;
    score?: number;
    source?: string;
  }>;
  graph?: {
    entities: Array<{
      id: string;
      type: string;
      name: string;
      summary?: string;
      confidence?: number;
      sourceId?: string;
      filePath?: string;
      referenceId?: string;
      attributes?: Record<string, string | number | boolean | null>;
    }>;
    relationships: Array<{
      id: string;
      type: string;
      fromEntityId: string;
      toEntityId: string;
      weight?: number;
      description?: string;
      keywords?: string;
      evidenceSourceIds?: string[];
      sourceId?: string;
      filePath?: string;
      referenceId?: string;
    }>;
    sources: Array<{
      id: string;
      kind: "file" | "web" | "unknown";
      uri?: string;
      title?: string;
      snippet?: string;
      metadata?: Record<string, unknown>;
    }>;
    stats: {
      entityCount: number;
      relationCount: number;
      sourceCount: number;
    };
  };
  error?: string;
  backend?: "lightrag" | "builtin-fallback";
  fallback?: boolean;
  reason?: string;
  requestId?: string;
  latencyMs?: number;
}

export interface MemoryStatusResult {
  success: boolean;
  activeBackend?: "lightrag" | "builtin-fallback";
  lightragHealthy?: boolean;
  error?: string;
  latencyMs?: number;
}

function toErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function classifyReason(status?: number, errorText?: string): string {
  if (status === 401 || status === 403) return "UPSTREAM_4XX";
  if (status === 408) return "TIMEOUT";
  if (status === 429) return "UPSTREAM_4XX";
  if (typeof status === "number" && status >= 400 && status < 500) return "UPSTREAM_4XX";
  if (typeof status === "number" && status >= 500) return "UPSTREAM_5XX";
  if ((errorText || "").toLowerCase().includes("timeout")) return "TIMEOUT";
  return "BACKEND_DOWN";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const ENTITY_TYPE_MAP: Record<string, string> = {
  person: "person",
  people: "person",
  org: "org",
  organization: "org",
  company: "org",
  project: "project",
  task: "task",
  event: "event",
  concept: "concept",
  artifact: "artifact",
  location: "location",
  place: "location",
  time: "time",
};

const RELATION_TYPE_MAP: Record<string, string> = {
  mentions: "mentions",
  mention: "mentions",
  about: "about",
  belongs_to: "belongs_to",
  belongs: "belongs_to",
  depends_on: "depends_on",
  depend_on: "depends_on",
  causes: "causes",
  cause: "causes",
  resolved_by: "resolved_by",
  resolve_by: "resolved_by",
  updated_by: "updated_by",
  update_by: "updated_by",
  same_as: "same_as",
  equivalent_to: "same_as",
  related_to: "related_to",
  related: "related_to",
};

function normalizeEntityType(value: unknown): string {
  const raw = (asString(value) || "other").toLowerCase();
  return ENTITY_TYPE_MAP[raw] || "other";
}

function normalizeRelationType(value: unknown): string {
  const raw = (asString(value) || "related_to").toLowerCase();
  return RELATION_TYPE_MAP[raw] || "related_to";
}

function sourceKindFromUri(uri?: string): "file" | "web" | "unknown" {
  if (!uri) return "unknown";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return "web";
  return "file";
}

function mapSource(raw: any, fallbackId: string) {
  const uri = asString(raw?.uri) || asString(raw?.file_path) || asString(raw?.path) || asString(raw?.url);
  const id =
    asString(raw?.id) ||
    asString(raw?.source_id) ||
    asString(raw?.reference_id) ||
    asString(uri) ||
    fallbackId;

  return {
    id,
    kind: sourceKindFromUri(uri),
    uri,
    title: asString(raw?.title) || asString(raw?.file_name),
    snippet: asString(raw?.snippet) || asString(raw?.content) || asString(raw?.description),
    metadata: {
      sourceId: asString(raw?.source_id),
      referenceId: asString(raw?.reference_id),
      filePath: asString(raw?.file_path) || asString(raw?.path),
      chunkId: asString(raw?.chunk_id),
    },
  };
}

function mapEntity(raw: any, index: number) {
  const name = asString(raw?.entity_name) || asString(raw?.name) || asString(raw?.id);
  if (!name) return null;

  return {
    id: asString(raw?.id) || asString(raw?.entity_id) || `ent:${name}:${index}`,
    type: normalizeEntityType(asString(raw?.entity_type) || asString(raw?.type)),
    name,
    summary: asString(raw?.description) || asString(raw?.summary),
    confidence: asNumber(raw?.confidence),
    sourceId: asString(raw?.source_id),
    filePath: asString(raw?.file_path),
    referenceId: asString(raw?.reference_id),
    attributes: {
      sourceId: asString(raw?.source_id) || null,
      referenceId: asString(raw?.reference_id) || null,
      filePath: asString(raw?.file_path) || null,
    },
  };
}

function mapRelationship(raw: any, index: number) {
  const fromEntityId = asString(raw?.fromEntityId) || asString(raw?.src_id) || asString(raw?.source_entity_id);
  const toEntityId = asString(raw?.toEntityId) || asString(raw?.tgt_id) || asString(raw?.target_entity_id);
  if (!fromEntityId || !toEntityId) return null;

  const sourceId = asString(raw?.source_id);
  const referenceId = asString(raw?.reference_id);
  const filePath = asString(raw?.file_path);

  const evidenceSourceIds = [sourceId, referenceId, filePath].filter((v): v is string => Boolean(v));

  return {
    id: asString(raw?.id) || asString(raw?.relationship_id) || `rel:${fromEntityId}:${toEntityId}:${index}`,
    type: normalizeRelationType(asString(raw?.type) || asString(raw?.relation_type)),
    fromEntityId,
    toEntityId,
    weight: asNumber(raw?.weight),
    description: asString(raw?.description),
    keywords: asString(raw?.keywords),
    evidenceSourceIds: evidenceSourceIds.length ? evidenceSourceIds : undefined,
    sourceId,
    filePath,
    referenceId,
  };
}

function buildGraphPayload(rawData: any): MemorySearchResult["graph"] {
  const data = rawData && typeof rawData === "object" ? rawData : {};

  const entities = Array.isArray(data.entities)
    ? data.entities.map((e: any, i: number) => mapEntity(e, i)).filter((e: any) => Boolean(e))
    : [];

  const relationships = Array.isArray(data.relationships)
    ? data.relationships.map((r: any, i: number) => mapRelationship(r, i)).filter((r: any) => Boolean(r))
    : [];

  const sourceMap = new Map<string, ReturnType<typeof mapSource>>();
  const ensureSource = (raw: any, fallbackId: string) => {
    const mapped = mapSource(raw, fallbackId);
    if (!sourceMap.has(mapped.id)) sourceMap.set(mapped.id, mapped);
  };

  if (Array.isArray(data.sources)) {
    data.sources.forEach((s: any, i: number) => ensureSource(s, `src:data:${i}`));
  }
  if (Array.isArray(data.references)) {
    data.references.forEach((s: any, i: number) => ensureSource(s, `src:ref:${i}`));
  }
  if (Array.isArray(data.chunks)) {
    data.chunks.forEach((s: any, i: number) => ensureSource(s, `src:chunk:${i}`));
  }

  if (Array.isArray(data.entities)) {
    data.entities.forEach((e: any, i: number) => {
      if (e?.source_id || e?.reference_id || e?.file_path) {
        ensureSource(e, `src:ent:${i}`);
      }
    });
  }
  if (Array.isArray(data.relationships)) {
    data.relationships.forEach((r: any, i: number) => {
      if (r?.source_id || r?.reference_id || r?.file_path) {
        ensureSource(r, `src:rel:${i}`);
      }
    });
  }

  const sources = Array.from(sourceMap.values());

  return {
    entities,
    relationships,
    sources,
    stats: {
      entityCount: entities.length,
      relationCount: relationships.length,
      sourceCount: sources.length,
    },
  };
}

/**
 * LightRAG API adapter
 * v1 uses /query/data for structured retrieval and maps to memory_search output shape.
 */
export class LightragAdapter {
  constructor(private readonly config: LightragConfig) {}

  private headers(workspace?: string) {
    return {
      "Content-Type": "application/json",
      ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      ...(workspace ? { "LIGHTRAG-WORKSPACE": workspace } : {}),
    };
  }

  async checkHealth(workspace?: string): Promise<MemoryStatusResult> {
    const t0 = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/health`, {
        headers: {
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
          ...(workspace ? { "LIGHTRAG-WORKSPACE": workspace } : {}),
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      const latencyMs = Date.now() - t0;
      if (!res.ok) {
        return {
          success: false,
          lightragHealthy: false,
          activeBackend: "builtin-fallback",
          error: `Health check failed: ${res.status} ${res.statusText}`,
          latencyMs,
        };
      }

      return {
        success: true,
        lightragHealthy: true,
        activeBackend: "lightrag",
        latencyMs,
      };
    } catch (err) {
      return {
        success: false,
        lightragHealthy: false,
        activeBackend: "builtin-fallback",
        error: toErr(err),
        latencyMs: Date.now() - t0,
      };
    }
  }

  async search(query: string, workspace?: string): Promise<MemorySearchResult> {
    const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const t0 = Date.now();

    try {
      const res = await fetch(`${this.config.baseUrl}/query/data`, {
        method: "POST",
        headers: this.headers(workspace),
        body: JSON.stringify({
          query,
          mode: "mix",
          top_k: 8,
          include_references: true,
          include_chunk_content: true,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      const latencyMs = Date.now() - t0;
      if (!res.ok) {
        return {
          success: false,
          error: `query/data failed: ${res.status} ${res.statusText}`,
          backend: "lightrag",
          reason: classifyReason(res.status),
          requestId,
          latencyMs,
        };
      }

      const data = (await res.json()) as any;

      if (data?.status === "failure") {
        return {
          success: false,
          error: data?.message || "LightRAG returned failure",
          backend: "lightrag",
          reason: "INVALID_RESPONSE",
          requestId,
          latencyMs,
        };
      }

      const chunks = data?.data?.chunks;
      const references = data?.data?.references;

      const fromChunks: Array<{ path: string; content: string; score?: number; source?: string }> = Array.isArray(chunks)
        ? chunks
            .map((c: any) => ({
              path: c?.file_path || c?.path || "memory/unknown.md",
              content: c?.content || "",
              score: typeof c?.score === "number" ? c.score : undefined,
              source: c?.file_source || c?.file_path || c?.path,
            }))
            .filter((x: any) => x.content)
        : [];

      const fromRefs: Array<{ path: string; content: string; score?: number; source?: string }> =
        fromChunks.length === 0 && Array.isArray(references)
          ? references
              .map((r: any) => ({
                path: r?.file_path || "memory/unknown.md",
                content: r?.snippet || r?.content || "",
                score: typeof r?.score === "number" ? r.score : undefined,
                source: r?.file_source || r?.file_path,
              }))
              .filter((x: any) => x.content)
          : [];

      const mapped = (fromChunks.length ? fromChunks : fromRefs).slice(0, 8).map((r) => ({
        path: r.path,
        content: r.content,
        score: r.score,
        source: r.source,
      }));

      const graph = buildGraphPayload(data?.data);

      return {
        success: true,
        results: mapped,
        graph,
        backend: "lightrag",
        requestId,
        latencyMs,
      };
    } catch (err) {
      const error = toErr(err);
      return {
        success: false,
        error,
        backend: "lightrag",
        reason: classifyReason(undefined, error),
        requestId,
        latencyMs: Date.now() - t0,
      };
    }
  }

  async insertText(params: {
    text: string;
    workspace?: string;
    domain: MemoryDomain;
    actorUserId?: string | null;
    groupId?: string | null;
    topic?: string;
    // intentionally accepted but ignored to prevent spoofing
    userProvidedFileSource?: string;
  }): Promise<{ success: boolean; trackId?: string; error?: string; fileSource?: string }> {
    try {
      const fileSource = buildPolicyFileSource({
        domain: params.domain,
        actorUserId: params.actorUserId,
        groupId: params.groupId,
        topic: params.topic,
      });
      const res = await fetch(`${this.config.baseUrl}/documents/text`, {
        method: "POST",
        headers: this.headers(params.workspace),
        body: JSON.stringify({ text: params.text, file_source: fileSource }),
        signal: AbortSignal.timeout(this.config.timeout),
      });
      if (!res.ok) {
        return { success: false, error: `documents/text failed: ${res.status} ${res.statusText}`, fileSource };
      }
      const data = (await res.json()) as any;
      return { success: data?.status === "success", trackId: data?.track_id, error: data?.message, fileSource };
    } catch (err) {
      return { success: false, error: toErr(err) };
    }
  }
}
