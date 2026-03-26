import { MemoryLightragConfigSchema } from "./config/schema.js";
import { LightragAdapter } from "./adapter/lightrag.js";
import { buildDomainContext, deriveRequestDomain, toWorkspace } from "./policy/domain-routing.js";
import type { MemoryDomain } from "./policy/domain-routing.js";
import { enforceWorkspace, resolveAllowedWorkspaces } from "./policy/access.js";
import { isAllowedByDomain } from "./policy/source-tag.js";
import { detectQueryIntent } from "./policy/query-intent.js";
import { getRerankWeights } from "./policy/rerank-policy.js";

const buildPromptSection = ({ availableTools, citationsMode }: any) => {
  const hasMemorySearch = availableTools.has("memory_search");
  const hasMemoryGet = availableTools.has("memory_get");

  if (!hasMemorySearch && !hasMemoryGet) return [];

  const lines = [
    "## Memory Recall",
    "Before answering anything about prior work, decisions, dates, people, preferences, or todos: run memory_search on MEMORY.md + memory/*.md; then use memory_get to pull only the needed lines. If low confidence after search, say you checked.",
  ];

  if (citationsMode === "off") {
    lines.push(
      "Citations are disabled: do not mention file paths or line numbers in replies unless the user explicitly asks.",
    );
  } else {
    lines.push("Citations: include Source: <path#line> when it helps the user verify memory snippets.");
  }
  lines.push("");
  return lines;
};

function toResultText(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const obj = item as Record<string, unknown>;
  const parts = [
    typeof obj.path === "string" ? `Path: ${obj.path}` : "",
    typeof obj.content === "string" ? obj.content : "",
  ].filter(Boolean);
  return parts.join("\n");
}

function toSourceTag(source: any): string {
  return String(source?.uri || source?.metadata?.filePath || source?.id || "");
}

function buildOntologyPolicy(query: string | undefined) {
  if (!query) return undefined;
  const intent = detectQueryIntent(query);
  return {
    intent,
    rerankWeights: getRerankWeights(intent),
  };
}

function buildOntologyDetails(graph: any, domainCtx: any, domain: MemoryDomain) {
  if (!graph || typeof graph !== "object") return undefined;

  const rawSources = Array.isArray(graph.sources) ? graph.sources : [];
  const sources = rawSources.filter((s: any) =>
    isAllowedByDomain(toSourceTag(s), {
      domain,
      actorUserId: domainCtx.actorUserId,
      groupId: domainCtx.groupId,
    }),
  );

  const rawSourceCount = rawSources.length;
  const keptSourceCount = sources.length;
  const droppedSourceCount = Math.max(0, rawSourceCount - keptSourceCount);
  const sourceDropRate = rawSourceCount > 0 ? droppedSourceCount / rawSourceCount : 0;

  const allowedEvidence = new Set<string>();
  for (const source of sources) {
    if (source?.id) allowedEvidence.add(String(source.id));
    if (source?.uri) allowedEvidence.add(String(source.uri));
    if (source?.metadata?.filePath) allowedEvidence.add(String(source.metadata.filePath));
  }

  const rawRelationships = Array.isArray(graph.relationships) ? graph.relationships : [];
  const relationships = rawRelationships
    .map((r: any) => {
      const evidence = Array.isArray(r?.evidenceSourceIds)
        ? r.evidenceSourceIds.filter((id: any) => allowedEvidence.has(String(id)))
        : undefined;
      return evidence !== undefined ? { ...r, evidenceSourceIds: evidence } : r;
    })
    .filter((r: any) => {
      if (!Array.isArray(r?.evidenceSourceIds)) return true;
      return r.evidenceSourceIds.length > 0;
    });

  const rawRelationCount = rawRelationships.length;
  const keptRelationCount = relationships.length;
  const droppedRelationCount = Math.max(0, rawRelationCount - keptRelationCount);

  const entities = (Array.isArray(graph.entities) ? graph.entities : []).filter((e: any) => {
    const sourceTag = String(e?.sourceId || e?.filePath || "");
    return !sourceTag || isAllowedByDomain(sourceTag, {
      domain,
      actorUserId: domainCtx.actorUserId,
      groupId: domainCtx.groupId,
    });
  });

  return {
    stats: {
      entityCount: entities.length,
      relationCount: relationships.length,
      sourceCount: sources.length,
    },
    filtering: {
      sources: {
        before: rawSourceCount,
        after: keptSourceCount,
        dropped: droppedSourceCount,
        dropRate: Number(sourceDropRate.toFixed(4)),
      },
      relationsByEvidence: {
        before: rawRelationCount,
        after: keptRelationCount,
        dropped: droppedRelationCount,
      },
    },
    entities: entities.slice(0, 20),
    relations: relationships.slice(0, 20),
    sources: sources.slice(0, 20),
  };
}

export default {
  id: "memory-lightrag",
  name: "Memory (LightRAG)",
  description: "Memory search with LightRAG backend and automatic builtin fallback",
  kind: "memory",
  configSchema: MemoryLightragConfigSchema,
  register(api: any) {
    const config = (api.pluginConfig || {}) as any;
    const lightragConfig = config?.lightrag;
    const fallbackEnabled = config?.fallbackEnabled ?? true;

    const lightragAdapter = lightragConfig ? new LightragAdapter(lightragConfig) : null;

    api.registerMemoryPromptSection(buildPromptSection);

    api.registerTool(
      (ctx: any) => {
        const builtinSearchTool = api.runtime.tools.createMemorySearchTool({
          config: ctx.config,
          agentSessionKey: ctx.sessionKey,
        });

        if (!builtinSearchTool) return null;

        const tool = {
          label: "Memory Search",
          name: "memory_search",
          description:
            "Search memory files with LightRAG backend and automatic builtin fallback. Returns path/snippet style results.",
          parameters: builtinSearchTool.parameters,
          async execute(toolCallId: string, params: any) {
            const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
            const t0 = Date.now();

            const query =
              typeof (params as any)?.query === "string"
                ? (params as any).query
                : typeof (params as any)?.q === "string"
                  ? (params as any).q
                  : "";

            if (lightragAdapter && query) {
              const domainCtx = buildDomainContext(ctx.sessionKey || "");
              const decision = deriveRequestDomain(domainCtx);
              const sharedWorkspace = config?.domains?.sharedWorkspace || "global_shared";
              const requestedWorkspace = toWorkspace(
                decision.domain,
                domainCtx.actorUserId,
                domainCtx.groupId,
                sharedWorkspace,
              );
              const allowed = resolveAllowedWorkspaces({
                domain: decision.domain,
                actorUserId: domainCtx.actorUserId,
                groupId: domainCtx.groupId,
                sharedWorkspace,
              });
              const enforced = enforceWorkspace({
                domain: decision.domain,
                requestedWorkspace,
                allowedWorkspaces: allowed,
                allowSafeDowngrade: Boolean(config?.access?.allowSafeDowngrade),
                sharedWorkspace,
              });

              if (!enforced.ok) {
                api.logger.warn("memory-lightrag access denied", enforced.error as any);
                const built = await builtinSearchTool.execute(toolCallId, params as any);
                return {
                  ...(built as any),
                  details: {
                    ...((built as any)?.details || {}),
                    backend: "memory_search",
                    fallback: true,
                    reason: enforced.error.code,
                    requestId,
                    latencyMs: Date.now() - t0,
                    activeBackend: "builtin-fallback",
                    domain: decision.domain,
                    workspace: enforced.fallbackWorkspace || requestedWorkspace,
                    reasonCode: decision.reasonCode,
                    ontologyPolicy: buildOntologyPolicy(query),
                  },
                };
              }

              const lr = await lightragAdapter.search(query, enforced.workspace);
              if (lr.success && Array.isArray(lr.results) && lr.results.length > 0) {
                const filtered = lr.results.filter((r: any) =>
                  isAllowedByDomain(String(r?.source || r?.path || ""), {
                    domain: decision.domain,
                    actorUserId: domainCtx.actorUserId,
                    groupId: domainCtx.groupId,
                  }),
                );
                const dropped = lr.results.length - filtered.length;
                const details = {
                  backend: "lightrag",
                  fallback: false,
                  reason: null,
                  requestId: lr.requestId ?? requestId,
                  latencyMs: lr.latencyMs ?? Date.now() - t0,
                  activeBackend: "lightrag",
                  domain: decision.domain,
                  workspace: enforced.workspace,
                  reasonCode: decision.reasonCode,
                  filteredDropped: dropped,
                  resultCount: filtered.length,
                  redaction: "details.results_omitted",
                  ontology: buildOntologyDetails(lr.graph, domainCtx, decision.domain),
                  ontologyPolicy: buildOntologyPolicy(query),
                };
                api.logger.info("memory-lightrag search", details as any);
                return {
                  content: filtered.slice(0, 8).map((r) => ({ type: "text", text: toResultText(r) })),
                  details,
                };
              }

              if (fallbackEnabled) {
                const built = await builtinSearchTool.execute(toolCallId, params as any);
                const details = {
                  backend: "memory_search",
                  fallback: true,
                  reason: lr.reason || lr.error || "EMPTY_RESULT",
                  requestId: lr.requestId ?? requestId,
                  latencyMs: Date.now() - t0,
                  activeBackend: "builtin-fallback",
                  domain: decision.domain,
                  workspace: enforced.workspace,
                  reasonCode: decision.reasonCode,
                  ontology: buildOntologyDetails(lr.graph, domainCtx, decision.domain),
                  ontologyPolicy: buildOntologyPolicy(query),
                };
                api.logger.warn("memory-lightrag fallback", details);

                return {
                  ...(built as any),
                  details: {
                    ...((built as any)?.details || {}),
                    ...details,
                  },
                };
              }

              const details = {
                backend: "lightrag",
                fallback: false,
                reason: lr.reason || lr.error || "EMPTY_RESULT",
                requestId: lr.requestId ?? requestId,
                latencyMs: lr.latencyMs ?? Date.now() - t0,
                activeBackend: "lightrag",
                domain: decision.domain,
                workspace: enforced.workspace,
                reasonCode: decision.reasonCode,
                ontology: buildOntologyDetails(lr.graph, domainCtx, decision.domain),
                ontologyPolicy: buildOntologyPolicy(query),
              };
              api.logger.info("memory-lightrag empty", details);
              return { content: [], details };
            }

            const built = await builtinSearchTool.execute(toolCallId, params as any);
            const details = {
              backend: "memory_search",
              fallback: false,
              reason: lightragAdapter ? "NO_QUERY" : "LIGHTRAG_NOT_CONFIGURED",
              requestId,
              latencyMs: Date.now() - t0,
              activeBackend: "builtin-fallback",
            };
            api.logger.info("memory-lightrag builtin", details);
            return {
              ...(built as any),
              details: {
                ...((built as any)?.details || {}),
                ...details,
              },
            };
          },
        };

        return tool;
      },
      { names: ["memory_search"] },
    );

    api.registerTool(
      (ctx: any) => {
        const memoryGetTool = api.runtime.tools.createMemoryGetTool({
          config: ctx.config,
          agentSessionKey: ctx.sessionKey,
        });
        if (!memoryGetTool) return null;
        return memoryGetTool;
      },
      { names: ["memory_get"] },
    );

    api.registerCli(
      ({ program }: any) => {
        api.runtime.tools.registerMemoryCli(program);
      },
      { commands: ["memory"] },
    );
  },
};
