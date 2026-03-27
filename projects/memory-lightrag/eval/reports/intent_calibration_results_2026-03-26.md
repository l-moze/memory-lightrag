# Intent Calibration Evaluation Results (2026-03-26)

## Audit Header
- Dataset: `datasets/calibration_visible.json`
- Samples: **24**
- Baseline detector: **t4-frozen-2026-03-26**
- Baseline hash: `52042d976d3e9e01dab08e15b3a18cf286d3f87e837cc7c521b71b6f8adf045b`
- Runner hash: `0cc7223f8c0b450c525e3acfac9e5109cc30be9e02e7cb52fc846dff6cb57ac7`
- Current detector hash: `35d67c5239fe1e39fcb61aed4b92665d1d3070f5dcb6973d2dee7192fcc9370e`

- Accuracy (Baseline -> Current): **83.33% -> 83.33% (0.00pp)**

## Baseline Metrics

- Samples: **24**
- Correct: **20**
- Accuracy: **83.33%**

| Intent | Precision | Recall | Hit | Miss | Support |
|---|---:|---:|---:|---:|---:|
| WHY | 100.00% | 100.00% | 6 | 0 | 6 |
| WHEN | 60.00% | 100.00% | 6 | 0 | 6 |
| ENTITY | 100.00% | 100.00% | 6 | 0 | 6 |
| GENERAL | 100.00% | 33.33% | 2 | 4 | 6 |

| Actual\Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 6 | 0 | 0 | 0 |
| WHEN | 0 | 6 | 0 | 0 |
| ENTITY | 0 | 0 | 6 | 0 |
| GENERAL | 0 | 4 | 0 | 2 |

## Current Metrics

- Samples: **24**
- Correct: **20**
- Accuracy: **83.33%**

| Intent | Precision | Recall | Hit | Miss | Support |
|---|---:|---:|---:|---:|---:|
| WHY | 100.00% | 100.00% | 6 | 0 | 6 |
| WHEN | 66.67% | 66.67% | 4 | 2 | 6 |
| ENTITY | 100.00% | 100.00% | 6 | 0 | 6 |
| GENERAL | 66.67% | 66.67% | 4 | 2 | 6 |

| Actual\Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 6 | 0 | 0 | 0 |
| WHEN | 0 | 4 | 0 | 2 |
| ENTITY | 0 | 0 | 6 | 0 |
| GENERAL | 0 | 2 | 0 | 4 |

- Margin p50/p90: 2.550 / 7.140
- TopScore p50/p90: 2.600 / 6.000
- Low-margin errors: 0/0

## Delta Summary
| Intent | ΔPrecision | ΔRecall | ΔHit | ΔMiss |
|---|---:|---:|---:|---:|
| WHY | 0.00pp | 0.00pp | 0 | 0 |
| WHEN | 6.67pp | -33.33pp | -2 | 2 |
| ENTITY | 0.00pp | 0.00pp | 0 | 0 |
| GENERAL | -33.33pp | 33.33pp | 2 | -2 |

## File Hashes
| File | sha256 |
|---|---|
| datasets/dev_visible.json | `ade14cc40f4835c9414862ea9ccd5b565f780d676fb1e7d48efc79ac762e43cf` |
| datasets/calibration_visible.json | `e0ec02522578fd39a7a9de638e9f85fc5a890d5d9a49f9c5301e12700191cc12` |
| datasets/holdout_blind_inputs.json | `5ec65c45dbfa4a3ecfedd1170cf65f8f8c7c0ab89020c3fb4be758013e3f8804` |
| datasets/holdout_labels.json | `a2ba9ad42f6caf2da3599de6e3cf0b23a880a6e77dfe7fba9a8953d2d49e3b8b` |
| run-intent-replay-eval.mjs | `0cc7223f8c0b450c525e3acfac9e5109cc30be9e02e7cb52fc846dff6cb57ac7` |
| baselines/t4_detector_frozen.mjs | `52042d976d3e9e01dab08e15b3a18cf286d3f87e837cc7c521b71b6f8adf045b` |
| ../src/policy/query-intent.ts | `35d67c5239fe1e39fcb61aed4b92665d1d3070f5dcb6973d2dee7192fcc9370e` |

