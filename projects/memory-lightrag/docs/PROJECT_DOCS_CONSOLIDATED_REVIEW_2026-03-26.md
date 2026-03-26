# Project Docs Consolidated Review (Anti-Omission)

Date: 2026-03-26
Scope: Consolidate prior docs, identify contradictions, and define current single-source-of-truth.

## 1) Current truth snapshot (code + rerun authoritative)

1. Graph-preserving adapter is implemented.
2. Intent routing has moved to scored deterministic path in code (`src/policy/query-intent.ts` + `intent-features.ts` + `intent-scorer.ts`).
3. Eval pipeline now has layered datasets + frozen baseline + hash-stamped reports:
   - `eval/datasets/dev_visible.json`
   - `eval/datasets/calibration_visible.json`
   - `eval/datasets/holdout_blind_inputs.json`
   - `eval/datasets/holdout_labels.json`
   - `eval/baselines/t4_detector_frozen.mjs`
   - `eval/run-intent-replay-eval.mjs`
4. LightRAG usage is still partial (fixed `/query/data` call path; advanced params not yet A/B parameterized in adapter runtime).

## 2) Document consistency audit (important)

## 2.1 Consistent documents (still valid)
- `docs/MAMGA_ENVIRONMENT_MEMORY_MODEL_ANALYSIS_2026-03-26.md`
  - Core gap framing remains valid: ATP + dual-stream + parameterized retrieval not fully done.
- `docs/LIGHTRAG_API_REFERENCE.md`
  - Endpoint/field coverage remains valid.
- `docs/t5.1-r2/DATASET_REPAIR_AND_LIGHTRAG_FEATURE_AUDIT_2026-03-26.md`
  - “data governance first, then parameterized LightRAG experiments” remains valid.
- `docs/t5.1-r2/V1_DATASET_GOVERNANCE_REPORT_2026-03-26.md`
  - Layered dataset + frozen baseline direction remains valid.

## 2.2 Outdated/contradictory documents (must refresh)
- `docs/t5.1-r2/ARCHITECTURE.md`
- `docs/t5.1-r2/IMPLEMENTATION_PLAN.md`
- `docs/t5.1-r2/RESEARCH_NOTES.md`

Reason: These files describe scored routing as “planned/not enabled”, while current code already includes scored routing path.

## 2.3 Metric drift caveat
- Multiple reports used different dataset splits over time (120 unified vs 100+20 layered split), so cross-report numbers are **not directly comparable** unless dataset+hash+runner are identical.

## 3) Single source of truth (effective immediately)

For decisions/release gates, trust in this order:
1. Current code in `src/` + `eval/`
2. Hash-stamped latest report outputs in `eval/reports/`
3. This consolidated review
4. Historical phase reports (T4/T5/T5.1) as context only

## 4) Core gaps vs original MAMGA target (not done yet)

1. Adaptive traversal policy in retrieval graph (beyond intent labeling) — partial only.
2. Dual-stream memory evolution (fast ingest + slow consolidation worker) — not implemented.
3. LightRAG advanced capability exploitation:
   - `enable_rerank` experiments
   - `chunk_top_k` sweep
   - `/query` vs `/query/data` controlled comparison
4. External benchmark mapping (LoCoMo/LongMemEval intent-compatible subset) — not done.

## 5) Recommended immediate cleanup tasks

1. Update T5.1-R2 docs to match current code reality (remove “planned-only” wording where obsolete).
2. Add a release checklist that requires:
   - baseline hash unchanged
   - dataset hash unchanged
   - runner hash unchanged
3. Start v1.1 experiments for LightRAG parameterization and log per-intent deltas.

## 6) No-omission checklist for next phase

Before any “phase complete” claim, require all checked:
- [ ] code merged
- [ ] replay/calibration/holdout rerun
- [ ] report contains hashes
- [ ] docs aligned with code
- [ ] open gaps list updated

---

Conclusion: We are in a solid “engineering hardening” stage, but not yet at “MAMGA core complete.”
Main risk is now documentation/metric drift, not basic implementation capability.
