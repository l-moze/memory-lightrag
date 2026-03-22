import type { LightragConfig } from "../config/schema.js";
import { fallbackError } from "../fallback/contract.js";
import type { MemorySearchResult, MemoryStatusResult } from "../types/contracts.js";

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
      const res = await fetch(`${this.config.baseUrl}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({ query, top_k: topK, min_score: this.config.minScore }),
      });
      if (!res.ok) {
        return {
          ok: false,
          backend: "lightrag",
          query,
          items: [],
          meta: { topKApplied: topK, truncated: false, latencyMs: Date.now() - t0 },
          fallback: true,
          reason: "UPSTREAM_5XX",
          error: fallbackError("UPSTREAM_5XX", `search failed (${res.status})`),
        };
      }
      const payload = (await res.json()) as any;
      const rows = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.results)
          ? payload.results
          : [];
      return {
        ok: true,
        backend: "lightrag",
        query,
        items: rows.map((row: any) => ({
          content: String(row?.content ?? row?.text ?? ""),
          score: row?.score ?? null,
          source: String(row?.source ?? row?.id ?? "lightrag:unknown"),
          metadata: row?.metadata ?? undefined,
          provenance: { backend: "lightrag", timestamp: new Date().toISOString() },
        })),
        meta: { topKApplied: topK, truncated: false, latencyMs: Date.now() - t0 },
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
}
