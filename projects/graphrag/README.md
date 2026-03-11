# GraphRAG (sidecar) prototype for OpenClaw

Goal: minimal, low-risk experiment combining **vector retrieval** (existing `memory_search`) with **graph expansion** over workspace Markdown memories.

Design principles:
- **Sidecar /旁路**: never modify OpenClaw memory files or core index; only read Markdown.
- **Glue-code first**: main agent depends on a single stable interface `query()`; implementation can iterate.
- **Explainable**: every graph edge/claim must link back to **evidence chunk** (file + range).
- **Safe-by-default**: isolated sandbox dir, budgets/quotas, no watchers by default, atomic index updates.

Docs:
- `SPEC.md` — interface + data model + hard limits + MVP steps
- `tasks.md` — execution checklist
