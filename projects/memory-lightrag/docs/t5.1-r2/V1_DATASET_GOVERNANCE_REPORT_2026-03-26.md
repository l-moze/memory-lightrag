# T5.1-R2 v1 Dataset Governance Report

Date: 2026-03-26
Status: Implemented

## 1) What was fixed

### 1.1 Dataset layering (anti-gaming)
- Created layered datasets:
  - `eval/datasets/dev_visible.json` (100 samples, labeled, visible)
  - `eval/datasets/calibration_visible.json` (24 samples, labeled)
  - `eval/datasets/holdout_blind_inputs.json` (20 samples, inputs only)
  - `eval/datasets/holdout_labels.json` (20 samples, labels separated)

### 1.2 Frozen baseline
- Added immutable baseline detector:
  - `eval/baselines/t4_detector_frozen.mjs`
  - version: `t4-frozen-2026-03-26`

### 1.3 Auditable runner
- Refactored runner:
  - `eval/run-intent-replay-eval.mjs`
- Reports now include:
  - baseline version
  - runner/detector/baseline hash
  - dataset hashes
- Report outputs moved to:
  - `eval/reports/intent_replay_results_2026-03-26.md`
  - `eval/reports/intent_calibration_results_2026-03-26.md`
  - `eval/reports/intent_holdout_results_2026-03-26.md`

## 2) Coverage snapshot

### dev_visible (100)
- WHY: 19
- WHEN: 19
- ENTITY: 19
- GENERAL: 43

### holdout_blind (20)
- WHY: 5
- WHEN: 5
- ENTITY: 5
- GENERAL: 5

### calibration_visible (24)
- balanced hard mixed-intent set

## 3) Independent rerun metrics (after governance refactor)

### Replay (dev_visible)
- Baseline accuracy: 81.00%
- Current accuracy: 85.00% (+4.00pp)
- GENERAL recall: 65.12% -> 76.74% (+11.63pp)

### Calibration
- Baseline accuracy: 83.33%
- Current accuracy: 83.33% (flat)

### Holdout blind
- Baseline accuracy: 85.00%
- Current accuracy: 100.00% (+15.00pp)
- Note: holdout is still small (n=20), not sufficient as sole release gate.

## 4) LightRAG feature usage clarity (requested)

Current adapter (`src/adapter/lightrag.ts`) uses:
- endpoint: `/query/data`
- mode: `mix`
- top_k: 8
- include_references: true
- include_chunk_content: true

Not yet parameterized / not yet A-B validated in pipeline:
- `enable_rerank`
- `chunk_top_k`
- `/query` / `/query/stream` as controlled comparison path

## 5) Risks still open

1. Calibration set remains small and partly synthetic.
2. Holdout is blind-separated but from same generation lineage as dev set (needs external or real-query holdout).
3. Baseline freeze exists, but CI gate to prevent baseline drift is not yet enforced.

## 6) Next mandatory actions (v1.1)

1. Add CI check:
   - baseline hash must match expected locked value.
2. Add 50+ real-world holdout queries (human-labeled).
3. Start LightRAG parameterization experiment track:
   - `enable_rerank` on/off
   - `chunk_top_k` sweep

