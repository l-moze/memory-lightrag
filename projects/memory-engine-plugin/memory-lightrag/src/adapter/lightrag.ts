import type {
  MemoryEntity,
  MemoryRelation,
  MemorySearchItem,
  MemorySearchResult,
  MemorySource,
  MemoryStatusResult,
} from "../types/contracts.js";
import type { LightragConfig } from "../config/schema.js";
import { fallbackError } from "../fallback/contract.js";

export class LightragAdapter {
  constructor(private readonly config: LightragConfig) {}

  async checkHealth(): Promise<MemoryStatusResult> {
    const t0 = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/health`, {
        headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : undefined,
      });
      if (!res.ok) {
        return {
          ok: false,
          backend: "lightrag",
          healthy: false,
          fallback: true,
          reason: "UPSTREAM_5XX",
          error: fallbackError("UPSTREAM_5XX", `health probe failed (${res.status})`),
        };
      }
      return {
        ok: true,
        backend: "lightrag",
        healthy: true,
        latencyMs: Date.now() - t0,
        diagnostics: [],
      };
    } catch (err) {
      return {
        ok: false,
        backend: "lightrag",
        healthy: false,
        fallback: true,
        reason: "BACKEND_DOWN",
        error: fallbackError("BACKEND_DOWN", String(err)),
      };
    }
  }

  async search(query: string, topK: number): Promise<MemorySearchResult> {
    const t0 = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/query/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({ query, top_k: topK, mode: "mix", include_references: true }),
      });
      if (!res.ok) {
        return {
          ok: false,
          backend: "lightrag",
          query,
          items: [],
          meta: { topKApplied: topK, truncated: false, latencyMs: Date.now() - t0 },
          fallback: true,
          reason: res.status === 429 ? "RATE_LIMITED" : "UPSTREAM_5XX",
          error: fallbackError(
            res.status === 429 ? "RATE_LIMITED" : "UPSTREAM_5XX",
            `search failed (${res.status})`,
          ),
        };
      }

      const payload = (await res.json()) as any;
      const items = this.fromQueryDataPayload(payload);
      return {
        ok: true,
        backend: "lightrag",
        query,
        items,
        meta: {
          topKApplied: topK,
          truncated: false,
          latencyMs: Date.now() - t0,
          requestId: payload?.metadata?.request_id,
        },
      };
    } catch (err) {
      return {
        ok: false,
        backend: "lightrag",
        query,
        items: [],
        meta: { topKApplied: topK, truncated: false, latencyMs: Date.now() - t0 },
        fallback: true,
        reason: "TIMEOUT",
        error: fallbackError("TIMEOUT", String(err)),
      };
    }
  }

  private fromQueryDataPayload(payload: any): MemorySearchItem[] {
    // Primary path: LightRAG /query/data structured format
    if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
      const data = payload.data as Record<string, any>;
      const entitiesRaw = Array.isArray(data.entities) ? data.entities : [];
      const relationsRaw = Array.isArray(data.relationships) ? data.relationships : [];
      const chunksRaw = Array.isArray(data.chunks) ? data.chunks : [];
      const refsRaw = Array.isArray(data.references) ? data.references : [];

      const entities: MemoryEntity[] = entitiesRaw.map((e: any, idx: number) => ({
        id: String(e?.entity_id ?? `ent:${idx}`),
        type: "concept",
        name: String(e?.entity_name ?? e?.name ?? "unknown"),
        summary: typeof e?.description === "string" ? e.description : undefined,
      }));

      const relations: MemoryRelation[] = relationsRaw.map((r: any, idx: number) => ({
        id: String(r?.relation_id ?? `rel:${idx}`),
        type: "related_to",
        fromEntityId: String(r?.src_id ?? "unknown:src"),
        toEntityId: String(r?.tgt_id ?? "unknown:tgt"),
        weight: typeof r?.weight === "number" ? Math.max(0, Math.min(1, r.weight)) : undefined,
      }));

      const sourceMap = new Map<string, MemorySource>();
      for (const ref of refsRaw) {
        const refId = String(ref?.reference_id ?? "");
        if (!refId) continue;
        sourceMap.set(refId, {
          id: `src:${refId}`,
          kind: "file",
          uri: typeof ref?.file_path === "string" ? ref.file_path : undefined,
          metadata: { reference_id: refId },
        });
      }

      return chunksRaw.map((chunk: any, idx: number) => {
        const refId = String(chunk?.reference_id ?? "");
        const fallbackSource: MemorySource = {
          id: `src:chunk:${idx}`,
          kind: "unknown",
          snippet: typeof chunk?.content === "string" ? chunk.content.slice(0, 200) : undefined,
          metadata: {
            chunk_id: chunk?.chunk_id ?? null,
            reference_id: refId || null,
          },
        };
        const sourceObj = refId && sourceMap.has(refId) ? sourceMap.get(refId)! : fallbackSource;

        return {
          id: String(chunk?.chunk_id ?? `item:${idx}`),
          content: String(chunk?.content ?? ""),
          score: typeof chunk?.score === "number" ? chunk.score : null,
          source: String(chunk?.file_path ?? sourceObj.uri ?? `lightrag:chunk:${idx}`),
          entities,
          relations,
          sources: [sourceObj],
          metadata: {
            rawChunk: chunk,
            queryMode: payload?.metadata?.query_mode,
          },
          provenance: {
            backend: "lightrag",
            timestamp: new Date().toISOString(),
            queryMode: String(payload?.metadata?.query_mode ?? "unknown"),
          },
        } satisfies MemorySearchItem;
      });
    }

    // Compatibility path: legacy items/results arrays
    const rows = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.results)
        ? payload.results
        : [];

    return rows.map((row: any, idx: number) => ({
      id: String(row?.id ?? `legacy:${idx}`),
      content: String(row?.content ?? row?.text ?? ""),
      score: row?.score ?? null,
      source: String(row?.source ?? row?.id ?? "lightrag:unknown"),
      entities: [],
      relations: [],
      sources: [
        {
          id: `src:legacy:${idx}`,
          kind: "unknown",
          snippet: String(row?.content ?? row?.text ?? "").slice(0, 200),
        },
      ],
      metadata: row?.metadata ?? undefined,
      provenance: { backend: "lightrag", timestamp: new Date().toISOString(), queryMode: "unknown" },
    }));
  }
}
