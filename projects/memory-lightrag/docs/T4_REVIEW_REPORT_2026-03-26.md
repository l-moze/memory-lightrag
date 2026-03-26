# T4 Review Report

Date: 2026-03-26
Owner: Orchestrator (health-manager)
Related plan: `docs/T4_EXECUTION_PLAN_2026-03-26.md`

## Scope reviewed
- T4-A Replay Evaluation
- T4-B Intent Rule Tuning
- T4-C Schema/Observability Docs

## Delivered commits
- `cdff99e` — eval artifacts (dataset + runner + report + npm script)
- `81eea8d` — intent rule tuning + boundary regression cases
- `d71b819` — ontologyPolicy/filtering schema docs + observability runbook

## Validation (re-run by orchestrator)
- `npm run verify:intent-rerank` ✅
- `npm run eval:intent-replay` ✅
- `npx tsc -p tsconfig.json` ✅

## Replay evaluation snapshot (current)
- samples: 44
- correct: 38
- accuracy: 86.36%
- confusion highlight:
  - GENERAL → WHEN: 4
  - GENERAL → ENTITY: 1
  - WHY → GENERAL: 1

## Gate decision
- Build Gate: PASS
- Verify Gate: PASS
- Evidence Gate: PASS
- Compatibility Gate: PASS

Final verdict: **Pass with minor notes**

## Minor notes
1. GENERAL recall remains low (54.55%) and is the primary bottleneck.
2. Keyword-first policy still has unavoidable ambiguity for mixed semantic+temporal queries.
3. Eval scripts rely on `--experimental-strip-types` (Node version sensitivity).

## Recommended T5 focus
1. Add a lightweight disambiguation step for GENERAL vs WHEN/ENTITY (e.g., negative patterns + confidence threshold).
2. Expand replay dataset to 100+ with more neutral/general intent samples.
3. Add CI-friendly non-experimental eval path (precompiled JS or tsx runner) to reduce runtime variance.

## Artifacts
- `eval/intent_replay_dataset_2026-03-26.json`
- `eval/run-intent-replay-eval.mjs`
- `eval/intent_replay_results_2026-03-26.md`
- `docs/T4_OBSERVABILITY_RUNBOOK_2026-03-26.md`
- `docs/memory-ontology.md`
- `test/intent-rerank.verify.mjs`

