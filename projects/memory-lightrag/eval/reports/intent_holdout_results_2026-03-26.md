# Intent Holdout Evaluation Results (2026-03-26)

## Audit Header
- Dataset: `datasets/holdout_blind_inputs.json`
- Samples: **20**
- Baseline detector: **t4-frozen-2026-03-26**
- Baseline hash: `52042d976d3e9e01dab08e15b3a18cf286d3f87e837cc7c521b71b6f8adf045b`
- Runner hash: `0cc7223f8c0b450c525e3acfac9e5109cc30be9e02e7cb52fc846dff6cb57ac7`
- Current detector hash: `dbc2cb0e12f7d3abd93bcdc0f4e843262857d52b1df7d88d548fd64a6d8e5c73`

- Accuracy (Baseline -> Current): **85.00% -> 100.00% (15.00pp)**

## Baseline Metrics

- Samples: **20**
- Correct: **17**
- Accuracy: **85.00%**

| Intent | Precision | Recall | Hit | Miss | Support |
|---|---:|---:|---:|---:|---:|
| WHY | 100.00% | 100.00% | 5 | 0 | 5 |
| WHEN | 71.43% | 100.00% | 5 | 0 | 5 |
| ENTITY | 83.33% | 100.00% | 5 | 0 | 5 |
| GENERAL | 100.00% | 40.00% | 2 | 3 | 5 |

| Actual\Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 5 | 0 | 0 | 0 |
| WHEN | 0 | 5 | 0 | 0 |
| ENTITY | 0 | 0 | 5 | 0 |
| GENERAL | 0 | 2 | 1 | 2 |

## Current Metrics

- Samples: **20**
- Correct: **20**
- Accuracy: **100.00%**

| Intent | Precision | Recall | Hit | Miss | Support |
|---|---:|---:|---:|---:|---:|
| WHY | 100.00% | 100.00% | 5 | 0 | 5 |
| WHEN | 100.00% | 100.00% | 5 | 0 | 5 |
| ENTITY | 100.00% | 100.00% | 5 | 0 | 5 |
| GENERAL | 100.00% | 100.00% | 5 | 0 | 5 |

| Actual\Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 5 | 0 | 0 | 0 |
| WHEN | 0 | 5 | 0 | 0 |
| ENTITY | 0 | 0 | 5 | 0 |
| GENERAL | 0 | 0 | 0 | 5 |

- Margin p50/p90: 2.800 / 3.820
- TopScore p50/p90: 2.750 / 3.520
- Low-margin errors: 0/0

## Delta Summary
| Intent | ΔPrecision | ΔRecall | ΔHit | ΔMiss |
|---|---:|---:|---:|---:|
| WHY | 0.00pp | 0.00pp | 0 | 0 |
| WHEN | 28.57pp | 0.00pp | 0 | 0 |
| ENTITY | 16.67pp | 0.00pp | 0 | 0 |
| GENERAL | 0.00pp | 60.00pp | 3 | -3 |

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

