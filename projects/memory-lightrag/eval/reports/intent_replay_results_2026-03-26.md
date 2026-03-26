# Intent Replay Evaluation Results (2026-03-26)

## Audit Header
- Dataset: `datasets/dev_visible.json`
- Samples: **100**
- Baseline detector: **t4-frozen-2026-03-26**
- Baseline hash: `52042d976d3e9e01dab08e15b3a18cf286d3f87e837cc7c521b71b6f8adf045b`
- Runner hash: `0cc7223f8c0b450c525e3acfac9e5109cc30be9e02e7cb52fc846dff6cb57ac7`
- Current detector hash: `dbc2cb0e12f7d3abd93bcdc0f4e843262857d52b1df7d88d548fd64a6d8e5c73`

- Accuracy (Baseline -> Current): **81.00% -> 85.00% (4.00pp)**

## Baseline Metrics

- Samples: **100**
- Correct: **81**
- Accuracy: **81.00%**

| Intent | Precision | Recall | Hit | Miss | Support |
|---|---:|---:|---:|---:|---:|
| WHY | 94.12% | 84.21% | 16 | 3 | 19 |
| WHEN | 57.58% | 100.00% | 19 | 0 | 19 |
| ENTITY | 90.00% | 94.74% | 18 | 1 | 19 |
| GENERAL | 93.33% | 65.12% | 28 | 15 | 43 |

| Actual\Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 16 | 1 | 0 | 2 |
| WHEN | 0 | 19 | 0 | 0 |
| ENTITY | 0 | 1 | 18 | 0 |
| GENERAL | 1 | 12 | 2 | 28 |

## Current Metrics

- Samples: **100**
- Correct: **85**
- Accuracy: **85.00%**

| Intent | Precision | Recall | Hit | Miss | Support |
|---|---:|---:|---:|---:|---:|
| WHY | 94.12% | 84.21% | 16 | 3 | 19 |
| WHEN | 69.23% | 94.74% | 18 | 1 | 19 |
| ENTITY | 90.00% | 94.74% | 18 | 1 | 19 |
| GENERAL | 89.19% | 76.74% | 33 | 10 | 43 |

| Actual\Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 16 | 0 | 0 | 3 |
| WHEN | 0 | 18 | 0 | 1 |
| ENTITY | 0 | 1 | 18 | 0 |
| GENERAL | 1 | 7 | 2 | 33 |

- Margin p50/p90: 1.600 / 4.710
- TopScore p50/p90: 2.050 / 4.310
- Low-margin errors: 2/7

## Delta Summary
| Intent | ΔPrecision | ΔRecall | ΔHit | ΔMiss |
|---|---:|---:|---:|---:|
| WHY | 0.00pp | 0.00pp | 0 | 0 |
| WHEN | 11.66pp | -5.26pp | -1 | 1 |
| ENTITY | 0.00pp | 0.00pp | 0 | 0 |
| GENERAL | -4.14pp | 11.63pp | 5 | -5 |

## File Hashes
| File | sha256 |
|---|---|
| datasets/dev_visible.json | `757c3d3d1599d746778e52b48a7d8ebc5dd05f4f5c34fe5837e3cb1bea5cc0a0` |
| datasets/calibration_visible.json | `e0ec02522578fd39a7a9de638e9f85fc5a890d5d9a49f9c5301e12700191cc12` |
| datasets/holdout_blind_inputs.json | `aa866ab3652d97ea4c49d757ee870e0298653c8648699f3e0fe892c1419edf34` |
| datasets/holdout_labels.json | `ef5bd6bc5c955061d373a75f62aa063e20e251414efa7ba358e1b48ea6258602` |
| run-intent-replay-eval.mjs | `0cc7223f8c0b450c525e3acfac9e5109cc30be9e02e7cb52fc846dff6cb57ac7` |
| baselines/t4_detector_frozen.mjs | `52042d976d3e9e01dab08e15b3a18cf286d3f87e837cc7c521b71b6f8adf045b` |
| ../src/policy/query-intent.ts | `dbc2cb0e12f7d3abd93bcdc0f4e843262857d52b1df7d88d548fd64a6d8e5c73` |

