# Graph Memory Evaluation Plan (2026-04-01)

## Purpose

Define the minimum evaluation framework required to claim that `memory-lightrag` is a graph memory system, not only a searchable recall plugin.

## Evidence Basis

- OpenClaw official memory baseline provides hybrid search, MMR, temporal decay, and memory flush.
- LightRAG provides graph-backed retrieval infrastructure and workspace isolation.
- MAGMA evaluates long-horizon memory on LoCoMo and LongMemEval.

Sources:
- https://docs.openclaw.ai/concepts/memory
- https://docs.openclaw.ai/reference/memory-config
- https://github.com/HKUDS/LightRAG
- https://github.com/FredJiang0324/MAMGA
- https://arxiv.org/abs/2601.03236

## Control Groups

### Control A
- OpenClaw builtin memory-core

### Control B
- OpenClaw QMD memory engine, if available

### Candidate
- `memory-lightrag`

## Benchmark Families

### B1. Operational compatibility

Goal:
- prove the plugin works safely in production

Cases:
- status
- search
- fallback
- backend down
- auth failure
- workspace isolation

### B2. Write-path correctness

Goal:
- prove remembered facts become stable graph objects

Cases:
- write once -> immediate query hit
- duplicate write -> no semantic duplication explosion
- corrected write -> supersede old state
- source/provenance retained

Primary metrics:
- write-to-query hit rate
- provenance completeness
- duplicate inflation rate

### B3. Long conversation memory

Goal:
- prove graph memory helps over long-horizon dialogue

Suggested dataset/task family:
- LoCoMo-style

Primary metrics:
- exact match
- F1
- graph-grounded answer rate
- multi-hop success rate

### B4. Multi-session memory

Goal:
- prove cross-session continuity

Suggested dataset/task family:
- LongMemEval-style

Primary metrics:
- session-spanning aggregation accuracy
- temporal consistency accuracy
- stale-memory error rate

### B5. Adversarial / governance

Goal:
- prove graph memory does not degrade trust boundaries

Cases:
- cross-workspace leakage
- poisoned relation injection
- stale decision override
- revoked fact resurfacing

Primary metrics:
- isolation leak rate
- poisoned-edge survival rate
- revocation correctness

## Gate Rules

### P0
- all operational tests pass
- isolation leak rate = 0

### P1
- write-to-query hit rate >= 0.90
- provenance completeness >= 0.95

### P2
- multi-hop accuracy beats Control A by >= 10 percentage points
- temporal consistency >= 0.75

### P3
- revoked facts do not reappear in top answers
- conflict resolution precision >= 0.85

## Reporting Format

Each batch report must include:

1. evaluated commit / config
2. control group
3. benchmark family
4. metrics table
5. representative failures
6. go / no-go decision

## Important Constraint

Operational readiness is not strategic proof.

Passing `status/search/fallback` means:
- the plugin is loadable

It does not mean:
- graph memory has been validated.
