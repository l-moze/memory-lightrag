# Research Notes — Memory Engine Plugin (LightRAG-adapted)

Date: 2026-03-22

## Scope
Deep research for adapting a memory engine to OpenClaw plugin layer using selective adoption from LightRAG and community practices.

## Sources Reviewed

### OpenClaw official docs / source
- `docs/cli/memory.md` (memory CLI is provided by active memory plugin)
- `docs/plugins/manifest.md` (native plugin manifest, `kind: "memory"`, slots)
- `docs/concepts/context-engine.md` (context lifecycle + compaction ownership)
- `extensions/memory-core/*` (minimal memory plugin pattern)
- `extensions/memory-lancedb/*` (auto-capture/recall, injection guard patterns)

### LightRAG
- Repo: `workspace/projects/LightRAG`
- README + architecture sections (hybrid retrieval, rerank, graph-augmented retrieval)

### Moltbook posts/comments (high-signal)
- `5113ad4d-...` The Memory Architecture: Why Most Agent Memory Systems Are Just Expensive Caches
- `442bbe6e-...` How AI Agents Actually Remember (Without Drowning in Context)
- `a959c51e-...` Minimize hidden state / typed artifact handoffs
- `37b472f9-...` Memory Poisoning Attacks
- `64bdff86-...` Incremental rollout and avoid enabling everything at once

---

## Selection Matrix (Adopt vs Defer vs Reject)

### Adopt now
1. **Hybrid retrieval as backend capability** (LightRAG strength)
   - Why: better recall quality than pure vector similarity.
2. **Incremental rollout** (community + ops best practice)
   - Why: reduce blast radius and simplify debugging.
3. **Typed memory artifacts / explicit handoff contracts**
   - Why: reduces hidden state and improves auditability.
4. **Prompt-injection / memory-poisoning guardrails**
   - Why: required for safe recall injection.

### Defer (later phase)
1. Full knowledge-graph extraction pipeline
   - Reason: complexity high; validate basic recall ROI first.
2. Full reranker stack in v1
   - Reason: useful but not required for initial stable launch.
3. Heavy multi-store deployments
   - Reason: avoid operational overhead in first iteration.

### Reject for this plugin
1. Replacing OpenClaw session source-of-truth with external memory DB
   - Reason: violates architecture and makes recovery harder.
2. One-shot “enable everything” memory mode
   - Reason: causes noisy capture and unstable retrieval behavior.

---

## Proposed v1 Plugin Contract (Minimal + Safe)

- Plugin id: `memory-lightrag`
- Kind: `memory`
- Slot: `plugins.slots.memory = "memory-lightrag"`
- Capabilities:
  1. `memory status` -> dependency/config health
  2. `memory search` -> LightRAG-backed recall adapter
  3. Prompt section -> "recall first" guidance + source citation mode

No auto-capture in v1.

## v2 Capabilities
- Auto-capture with strict gates:
  - max length threshold
  - user-intent signal
  - dedup hash
  - poison/injection regex filter
- after-turn batch writes (fewer larger writes)

## v3 Capabilities
- consolidation policy (episodic -> semantic)
- decay policy (time/access-based downrank)
- quality metrics (hit-rate, false recall rate, token cost)

---

## Evaluation Criteria
1. Retrieval quality: meaningful top-k relevance under budget
2. Stability: no startup regressions; graceful fallback
3. Safety: no instruction execution from recalled memory text
4. Cost: bounded latency/token increase per turn
5. Auditability: search result provenance visible and testable

---

## Immediate Next Step
Implement v1 plugin skeleton and run smoke tests:
- `openclaw memory status`
- `openclaw memory search "..."`
- fallback behavior when LightRAG unavailable
