# tasks — GraphRAG sidecar MVP

## Week 0 (today): lock scope + safety
- [ ] Confirm doc set scope for experiment: only `MEMORY.md + memory/*.md` OR a clean `projects/graphrag/docs/` corpus
- [ ] Pick index location: `<workspace>/graphrag_sandbox/`
- [ ] Set defaults from SPEC hard limits

## Milestone A: FTS-only sidecar (1–2h)
- [ ] Create `openclaw-graphrag` CLI skeleton
- [ ] Implement chunker (heading/paragraph)
- [ ] Create SQLite db + chunks table + FTS5
- [ ] Implement `query` → return top chunks + citations
- [ ] Add staging + atomic activate

## Milestone B: entity mentions + 1-hop expansion (2–4h)
- [ ] Add entity extractor v0 (rules)
- [ ] Build `entities` + `entity_mentions`
- [ ] Expansion: seed entities → mention-matched chunks
- [ ] Fusion + context budget clamp

## Milestone C: evaluation harness (half-day)
- [ ] Build 36-question set + gold evidence
- [ ] Run baseline vs graph; capture logs
- [ ] Blind score correctness/completeness/evidence support
- [ ] Summarize: gains by question type + failure cases

## Milestone D (optional): LLM extraction
- [ ] LLM JSON extractor with evidence-span requirements
- [ ] PII/secret redaction before network calls
