# Graph Memory Strategy Upgrade (2026-04-01)

## Purpose

This document upgrades the project definition from:

- "a LightRAG-backed memory search plugin"

to:

- "a graph-native memory system exposed through an OpenClaw memory plugin"

The change is strategic, not cosmetic.

## Evidence Base

### 1. OpenClaw official memory docs

OpenClaw already provides:

- Markdown files as source of truth
- active memory plugin contract
- builtin hybrid search
- optional MMR re-ranking
- optional temporal decay
- automatic memory flush before compaction

Implication:
- A replacement project must not merely re-implement hybrid search.
- It must outperform the baseline on graph-specific memory tasks.

Source:
- https://docs.openclaw.ai/concepts/memory
- https://docs.openclaw.ai/reference/memory-config

### 2. LightRAG official capabilities

LightRAG already provides:

- hybrid/local/global/mix query modes
- graph storage + vector storage + KV storage
- incremental insert pipeline
- workspace-based data isolation
- entity merge / relation delete / document delete
- export and API surface for graph-backed retrieval

Implication:
- We should not rewrite generic graph-RAG infrastructure.
- We should treat LightRAG as the graph substrate.

Source:
- https://github.com/HKUDS/LightRAG
- https://arxiv.org/abs/2410.05779

### 3. MAGMA / MAMGA direction

MAGMA positions agent memory as:

- multi-graph memory for long-term conversation memory
- temporal / semantic / causal relationships
- long-horizon and multi-hop reasoning
- evaluation on LoCoMo and LongMemEval

Implication:
- "graph memory" is validated by recent research as more than snippet recall.
- Our roadmap must include graph-native write/read/eval stages.

Source:
- https://github.com/FredJiang0324/MAMGA
- https://arxiv.org/abs/2601.03236

## Strategic Reframe

## What stays

- OpenClaw plugin boundary stays.
- LightRAG stays.
- Fallback to `memory-core` stays.
- Workspace/domain policy stays.

## What changes

- The core product is no longer "adapter + router + fallback".
- The core product becomes "graph memory lifecycle".
- Query-only routing becomes a temporary helper, not the main intelligence source.

## Architecture Rule

If a new change mainly improves recall by adding query regex/features, classify it as temporary.

If a new change mainly improves:

- graph write quality
- graph traversal quality
- graph grounding quality
- graph lifecycle governance

classify it as strategic.

## Required Document Changes

## Rewrite

### 1. `ARCHITECTURE_FINAL.md`

Why:
- current wording still centers the project as a recall adapter
- it under-specifies graph-native write/read phases

Rewrite direction:
- promote LightRAG from "search backend" to "graph substrate"
- promote plugin from "adapter" to "memory lifecycle control plane"

### 2. `IMPLEMENTATION_PLAN.md`

Why:
- current milestones over-weight status/search/fallback
- graph write path and graph-native read path are not explicit milestones

Rewrite direction:
- split roadmap into P0/P1/P2/P3
- add write path, traversal path, lifecycle governance

### 3. `METRICS_AND_GATES.md`

Why:
- current KPI mostly measure generic retrieval quality
- they do not prove graph memory value

Rewrite direction:
- add multi-hop accuracy
- add temporal consistency
- add provenance completeness
- add isolation leak rate

## Update, not full rewrite

### 4. `memory-ontology.md`

Why:
- current ontology is still retrieval-result-oriented
- it needs a second layer for memory object semantics

Update direction:
- keep current retrieval schema
- add memory object layer: `Episode`, `Decision`, `Preference`, `Commitment`, `Incident`, `Source`

### 5. release status pages

Why:
- current "READY" wording reflects plugin operational readiness, not strategic readiness

Update direction:
- distinguish:
  - plugin-ready
  - graph-memory-ready

## New Documents Required

### 1. `GRAPH_MEMORY_EVAL_PLAN_2026-04-01.md`

Purpose:
- define graph-specific benchmark families
- stop using operational smoke tests as strategic proof

### 2. `GRAPH_MEMORY_SCHEMA_VNEXT.md`

Purpose:
- define memory object semantics separate from retrieval payload shape

Recommended object types:
- `Episode`
- `Decision`
- `Preference`
- `Commitment`
- `Incident`
- `Source`

### 3. `GRAPH_MEMORY_LIFECYCLE.md`

Purpose:
- define write -> promote -> decay -> revoke lifecycle

### 4. `BASELINE_COMPARISON_PLAN.md`

Purpose:
- formalize OpenClaw builtin/QMD as control groups
- compare by task class, not by intuition

## Recommended Milestones

### P0: Plugin compatibility
- `status/search/fallback`
- diagnostics
- provenance

### P1: Graph write path
- turn/event extraction
- typed memory object normalization
- LightRAG ingest
- source + workspace correctness

### P2: Graph read path
- anchor identification
- graph traversal / expansion
- evidence assembly
- answer grounding

### P3: Lifecycle governance
- promotion
- decay
- revocation
- conflict handling

## Decision Rule Going Forward

Do not ask:
- "Can LightRAG return snippets?"

Ask:
- "Can this system maintain and use graph memory better than snippet recall baselines on long-horizon tasks?"
