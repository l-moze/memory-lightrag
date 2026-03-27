# Intent Replay Evaluation Results (2026-03-26)

## Audit Header
- Dataset: `datasets/dev_visible.json`
- Samples: **90**
- Baseline detector: **t4-frozen-2026-03-26**
- Baseline hash: `52042d976d3e9e01dab08e15b3a18cf286d3f87e837cc7c521b71b6f8adf045b`
- Runner hash: `0cc7223f8c0b450c525e3acfac9e5109cc30be9e02e7cb52fc846dff6cb57ac7`
- Current detector hash: `35d67c5239fe1e39fcb61aed4b92665d1d3070f5dcb6973d2dee7192fcc9370e`

- Accuracy (Baseline -> Current): **81.11% -> 88.89% (7.78pp)**

## Baseline Metrics

- Samples: **90**
- Correct: **73**
- Accuracy: **81.11%**

| Intent | Precision | Recall | Hit | Miss | Support |
|---|---:|---:|---:|---:|---:|
| WHY | 100.00% | 88.89% | 16 | 2 | 18 |
| WHEN | 58.06% | 100.00% | 18 | 0 | 18 |
| ENTITY | 85.00% | 94.44% | 17 | 1 | 18 |
| GENERAL | 95.65% | 61.11% | 22 | 14 | 36 |

| Actual\Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 16 | 1 | 0 | 1 |
| WHEN | 0 | 18 | 0 | 0 |
| ENTITY | 0 | 1 | 17 | 0 |
| GENERAL | 0 | 11 | 3 | 22 |

## Current Metrics

- Samples: **90**
- Correct: **80**
- Accuracy: **88.89%**

| Intent | Precision | Recall | Hit | Miss | Support |
|---|---:|---:|---:|---:|---:|
| WHY | 100.00% | 88.89% | 16 | 2 | 18 |
| WHEN | 77.27% | 94.44% | 17 | 1 | 18 |
| ENTITY | 89.47% | 94.44% | 17 | 1 | 18 |
| GENERAL | 90.91% | 83.33% | 30 | 6 | 36 |

| Actual\Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 16 | 0 | 0 | 2 |
| WHEN | 0 | 17 | 0 | 1 |
| ENTITY | 0 | 1 | 17 | 0 |
| GENERAL | 0 | 4 | 2 | 30 |

- Margin p50/p90: 2.300 / 4.070
- TopScore p50/p90: 2.100 / 3.760
- Low-margin errors: 1/5

## Delta Summary
| Intent | ΔPrecision | ΔRecall | ΔHit | ΔMiss |
|---|---:|---:|---:|---:|
| WHY | 0.00pp | 0.00pp | 0 | 0 |
| WHEN | 19.21pp | -5.56pp | -1 | 1 |
| ENTITY | 4.47pp | 0.00pp | 0 | 0 |
| GENERAL | -4.74pp | 22.22pp | 8 | -8 |

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

