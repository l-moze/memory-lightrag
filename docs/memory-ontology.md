# Memory Ontology (Lightweight) for memory-lightrag

## Purpose

Define a minimal, implementation-ready ontology so `memory-lightrag` search results are **structured recall objects** (entities/relations/sources), not only plain text snippets.

Design goals:
- Keep v1 small and deterministic.
- Align with LightRAG-style graph + chunk retrieval.
- Preserve compatibility with current text-first fallback behavior.

---

## Core Types

## 1) `MemoryEntity`

Represents a typed node extracted or recalled from memory.

```ts
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
  id: string;                 // stable id in lightrag namespace, e.g. "ent:abc123"
  type: MemoryEntityType;
  name: string;               // canonical display name
  aliases?: string[];
  summary?: string;           // short normalized description
  attributes?: Record<string, string | number | boolean | null>;
  confidence?: number;        // 0..1 extraction confidence
}
```

### Notes
- `id` must be stable per backend record to support de-dup and citation.
- `attributes` stays flat in v1 to avoid schema explosion.

---

## 2) `MemoryRelation`

Represents directed semantic links between entities.

```ts
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
  id: string;                 // e.g. "rel:def456"
  type: MemoryRelationType;
  fromEntityId: string;
  toEntityId: string;
  weight?: number;            // 0..1 relevance/strength
  evidenceSourceIds?: string[];
  confidence?: number;        // 0..1 relation confidence
}
```

### Notes
- `same_as` supports entity merge hints.
- `evidenceSourceIds` must reference `MemorySource.id`.

---

## 3) `MemorySource`

Represents provenance for recalled knowledge.

```ts
export type MemorySourceKind =
  | "file"
  | "message"
  | "doc"
  | "api"
  | "web"
  | "unknown";

export interface MemorySource {
  id: string;                 // e.g. "src:ghi789"
  kind: MemorySourceKind;
  uri?: string;               // file path / URL / channel permalink
  title?: string;
  snippet?: string;           // short evidence text
  author?: string;
  createdAt?: string;         // ISO timestamp
  updatedAt?: string;         // ISO timestamp
  metadata?: Record<string, string | number | boolean | null>;
}
```

### Notes
- `snippet` should be concise and directly support answer grounding.
- keep `uri` optional for sensitive/private contexts.

---

## 4) `MemorySearchItem` (structured recall unit)

```ts
export interface MemorySearchItem {
  id: string;                 // stable recall item id
  score: number | null;
  content: string;            // primary text field
  text?: string;              // optional alias for compatibility
  entities: MemoryEntity[];
  relations: MemoryRelation[];
  sources: MemorySource[];
  provenance: {
    backend: "lightrag";
    retrievedAt: string;      // ISO timestamp
    queryMode?: "hybrid" | "vector" | "graph" | "unknown";
  };
}
```

---

## 5) `MemorySearchResult` (adapter contract target)

```ts
export interface MemorySearchResult {
  ok: boolean;
  backend: "lightrag";
  query: string;
  items: MemorySearchItem[];
  meta: {
    topKApplied: number;
    truncated: boolean;
    latencyMs: number;
    entityCount?: number;
    relationCount?: number;
    sourceCount?: number;
  };
  fallback?: boolean;
  reason?: "UPSTREAM_5XX" | "BACKEND_DOWN" | "TIMEOUT";
  error?: {
    code: string;
    message: string;
  };
}
```

---

## Mapping Strategy from LightRAG Response

Given LightRAG payload variants (`items[]` or `results[]`):

- `text/content` -> `MemorySearchItem.content` (`text` may be mirrored as optional alias)
- `score` -> `MemorySearchItem.score`
- `metadata.entities` (if present) -> `entities`
- `metadata.relations` (if present) -> `relations`
- `metadata.sources` or source/id fields -> `sources`
- unknown fields -> preserve in `sources[].metadata` or item-level extension map (future)

If graph fields are absent:
- return `entities=[]`, `relations=[]`
- still emit one synthetic `MemorySource` from available source/id/text context

---

## Minimal Validation Rules (v1)

- `MemoryEntity.id/name/type` required.
- `MemoryRelation.id/type/fromEntityId/toEntityId` required.
- `MemorySource.id/kind` required.
- `MemorySearchItem.content` required; `text` is optional alias (can be empty string only when structured-only mode is introduced; not in v1).
- All confidence/weight numeric fields clamped to `[0,1]`.

---

## Compatibility & Rollout

1. Keep existing text fields untouched.
2. Add structured fields as additive extension.
3. If upstream has no graph metadata, still return valid schema with empty arrays.
4. Do not fail recall solely due to missing ontology fields.

---

## Runtime `details` Schema (Operator-facing)

The plugin now emits additive observability fields under tool-call `details`.

### `details.ontologyPolicy`

Intent-aware rerank policy derived from query text.

```ts
export type QueryIntent = "WHY" | "WHEN" | "ENTITY" | "GENERAL";

export interface RerankWeights {
  causal: number;
  temporal: number;
  entity: number;
  lexical: number;
  semantic: number;
}

export interface OntologyPolicy {
  intent: QueryIntent;
  rerankWeights: RerankWeights;
}
```

Notes:
- Emitted when `query` is non-empty.
- `intent` is rule-detected (`detectQueryIntent`).
- `rerankWeights` comes from `getRerankWeights(intent)` and is finite-number normalized.

#### T5/T5.1-R2 GENERAL disambiguation guardrails

`GENERAL` should be treated as a first-class intent, not just a fallback bucket.

Current runtime behavior (implemented):
- `detectQueryIntent` precedence is `WHY -> WHEN -> ENTITY -> GENERAL`.
- `details.ontologyPolicy` currently emits implemented fields only:
  - `intent`
  - `rerankWeights`

Observed boundary behavior:
- **Keep GENERAL** for ambiguous/open-ended prompts with weak cues only.
  - Examples: `what should we do next`, `which is better for now`, `什么情况`, `哪个更好`, `what is that`
- **Do not keep GENERAL** when explicit intent signals are present.
  - WHY cues (`why`, `原因`, `导致`) should resolve to `WHY`
  - WHEN cues (`today`, `recently`, `近期`, `昨天`) should resolve to `WHEN`
  - ENTITY cues (`who`, `team`, `project`, `服务`, ownership/responsibility wording) should resolve to `ENTITY` unless an earlier-precedence cue already matched

Scored-routing rollout note (planned):
- Threshold keys are reserved for future rollout/canary tuning:
  - `intent.scoredRouting.enabled`
  - `intent.scoredRouting.minScore`
  - `intent.scoredRouting.minMargin`
- Until implemented, these keys are documentation-level knobs only.

Troubleshooting with runtime fields:
- For suspected GENERAL **false positives** (should be WHY/WHEN/ENTITY):
  - Inspect `details.ontologyPolicy.intent`
  - Verify the query text contains explicit cues expected by current regex patterns
  - Confirm precedence behavior (WHY and WHEN intentionally outrank ENTITY)
- For suspected GENERAL **false negatives** (should stay GENERAL):
  - Check if broad words (`what/which/什么/哪个`) were matched without strong companion hints
  - Ensure no hidden temporal/entity keyword in the exact query variant
  - Reproduce with `npm run verify:intent-rerank` boundary cases before adjusting rules

---

### `details.ontology.filtering`

Filtering telemetry after domain/source access control is applied.

```ts
export interface OntologyFiltering {
  sources: {
    before: number;
    after: number;
    dropped: number;
    dropRate: number; // rounded to 4 decimals, 0..1
  };
  relationsByEvidence: {
    before: number;
    after: number;
    dropped: number;
  };
}
```

Semantics:
- `sources.*`: counts before/after `isAllowedByDomain(...)` source filtering.
- `sources.dropRate`: `dropped / before` (or `0` when `before===0`), emitted as `Number(toFixed(4))`.
- `relationsByEvidence.*`: relation counts before/after evidence pruning.
  - Evidence ids not present in allowed sources are removed from `evidenceSourceIds`.
  - Relations with `evidenceSourceIds: []` after pruning are dropped.

Related fields in `details.ontology` for context:
- `stats.entityCount | relationCount | sourceCount`
- sampled arrays: `entities`, `relations`, `sources` (each capped at top 20)

---

## Why this is enough for implementation

This ontology provides exactly the fields needed to:
- build source-grounded answers,
- deduplicate entity-centric memory,
- support future graph-based reranking,
while preserving current text-first behavior and avoiding over-modeling in v1.

---

## vNext Direction: Memory Object Layer

The schema above is sufficient for retrieval payloads, but it is not yet sufficient for a graph-native memory system.

To support graph memory lifecycle, add a second semantic layer above retrieval payloads:

- `Episode`
- `Decision`
- `Preference`
- `Commitment`
- `Incident`
- `Source`

This layer should answer:

1. what happened
2. who/what it was about
3. whether it supersedes or contradicts prior memory
4. what source/provenance justifies it

Design rule:

- keep `MemorySearchItem` as the retrieval contract
- add memory object semantics as a separate write-path contract
- do not overload retrieval payload fields to carry all lifecycle meaning

Rationale:

- LightRAG is strong at graph-backed retrieval and storage
- the project still needs its own memory semantics for lifecycle, revocation, and conflict handling

Reference docs:
- [GRAPH_MEMORY_STRATEGY_UPGRADE_2026-04-01](GRAPH_MEMORY_STRATEGY_UPGRADE_2026-04-01.md)
- [GRAPH_MEMORY_EVAL_PLAN_2026-04-01](GRAPH_MEMORY_EVAL_PLAN_2026-04-01.md)
