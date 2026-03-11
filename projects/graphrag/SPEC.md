# SPEC — OpenClaw GraphRAG sidecar (MVP)

## 0. Scope
A minimal GraphRAG prototype that augments OpenClaw retrieval with **graph expansion** while keeping OpenClaw stable.

Non-goals (MVP): Neo4j, community detection, ontology, global summaries, long-running watchers.

---

## 1. Integration contract (single stable interface)

### 1.1 Sidecar query interface
Prefer **CLI** first (simplest deployment + failure isolation).

Command:
```bash
openclaw-graphrag query --question "..." --index main --format json
```

Output JSON schema (v1):
```json
{
  "schemaVersion": 1,
  "indexId": "main",
  "answerContext": "...text to inject...",
  "citations": [
    {"path": "memory/2026-03-11.md", "chunkId": "c_...", "start": 120, "end": 260}
  ],
  "chunks": [
    {"chunkId": "c_...", "path": "...", "start": 120, "end": 260, "score": 0.83, "why": "seed|expanded(entity)"}
  ],
  "subgraph": {
    "entities": [{"id": "e_...", "name": "...", "type": "Concept"}],
    "relations": [{"src": "e_...", "dst": "e_...", "predicate": "related_to", "evidenceChunkId": "c_..."}]
  },
  "debug": {
    "timingMs": {"seed": 12, "expand": 8, "format": 2},
    "budgets": {"maxFiles": 5000, "maxChunks": 200000, "maxEntities": 200000, "maxEdges": 1000000}
  }
}
```

Failure mode:
- non-zero exit code + stderr message
- main agent must **ignore** sidecar and fall back to baseline retrieval.

### 1.2 Main agent glue (minimal change)
Flow (pseudo):
1) baseline: call `memory_search` to get top-K seed chunks
2) optional: call sidecar `query(question)`
3) inject sidecar `answerContext` + citations into the prompt as additional context

Hard rule: sidecar results are **optional context**, never the only source of truth.

---

## 2. Storage & data model (SQLite, rebuildable)
All sidecar artifacts live under an isolated sandbox directory, e.g.:
```
<workspace>/graphrag_sandbox/
  inputs/          # optional: explicit copied inputs; or just paths
  indices/
    main/
      manifest.json
      db.sqlite
      staging/     # atomic build
  logs/
  tmp/
```

SQLite minimal tables (v1):
- `documents(doc_id PRIMARY KEY, path, mtime, checksum)`
- `chunks(chunk_id PRIMARY KEY, doc_id, start, end, text, checksum)`
- `entities(entity_id PRIMARY KEY, name, type, canonical_key, summary)`
- `entity_mentions(entity_id, chunk_id, start, end)` (optional but recommended)
- `relations(rel_id PRIMARY KEY, src_entity_id, dst_entity_id, predicate, qualifiers_json, evidence_chunk_id, evidence_span)`

**Evidence binding requirement**:
- every `relation` must reference `evidence_chunk_id`
- optionally store `evidence_span` for precise quoting

---

## 3. GraphRAG retrieval algorithm (minimal)

### 3.1 Seed retrieval
- Seed = baseline `memory_search(question)` topK_seed (e.g. 6)

### 3.2 Entity extraction (MVP choices)
- v0 (local rules): proper nouns patterns, @mentions, #tags, CamelCase, URLs, file names.
- v1 (LLM JSON): extract `{entities, relations}` from each seed chunk, strictly grounded in text.

### 3.3 Expansion
- Build entity set E from seed chunks
- Expand 1-hop (default) on `entity_mentions`:
  - retrieve chunks that mention any entity in E
- Optional 2-hop behind a flag with strict cap.

### 3.4 Fusion
- Merge seed chunks + expanded chunks
- Deduplicate by chunk_id
- Enforce context budget (max chunks or max tokens)

---

## 4. Hard limits & guardrails (defaults)
Safety-first defaults (tune later):

Input/chunk budgets:
- `maxFiles = 5000`
- `maxInputBytes = 500MB`
- `maxFileBytes = 20MB`
- `maxChunksTotal = 200000`
- `maxChunkChars = 2000`

Graph budgets:
- `maxEntities = 200000`
- `maxEdges = 1000000`
- `maxRelationsPerEntity = 200`

Runtime controls:
- build concurrency = 1 (single writer)
- `perFileTimeout = 60s`
- `totalRunTimeout = 30min`
- sandbox disk quota target = 10GB
- no filesystem watcher by default

Privacy:
- path allowlist; reject symlink escape
- index directory permissions 0700
- PII/secret scan + redact before any external embedding/LLM call

Atomicity:
- build to `staging/` + validate + rename to activate
- keep last successful index for rollback

---

## 5. MVP delivery plan

### Milestone A — Wiring + FTS-only (no graph yet)
- Implement chunking + SQLite FTS5
- Implement `query()` returning relevant chunks + citations
- Proves: integration point, rollback, no crash.

### Milestone B — Add entity mentions + 1-hop expansion
- Add entity extractor (rules)
- Build `entity_mentions`
- Expand from seed entities to extra chunks

### Milestone C — Optional: LLM-based extraction (quality)
- Replace/augment entity extractor with LLM JSON extractor
- Enforce evidence binding strictly

---

## 6. Evaluation plan (small, repeatable)
- 36 questions: 12 single-hop / 12 multi-hop / 12 disambiguation
- Same model/prompt/temp=0, same context budget
- Score: correctness, completeness, evidence support, gold evidence hit, noise rate, latency, tokens

Pass criteria (multi-hop subset): evidence hit rate + completeness meaningfully improves without large hallucination/latency regressions.
