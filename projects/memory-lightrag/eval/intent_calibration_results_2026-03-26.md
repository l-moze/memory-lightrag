# Intent Calibration Evaluation Results (2026-03-26)

> Time tag: **[AS-IS]** (current snapshot). If a different report shows inconsistent numbers, treat this file as source-of-truth for this run.

## Summary

- Dataset: `intent_calibration_dataset_2026-03-26.json`
- Samples: **24**
- Baseline: **T4 (legacy decision order)**
- Current: **T5.1-R2 (scored routing)**
- Accuracy (T4 -> T5.1-R2): **83.33% -> 83.33% (0.00pp)**

## T4 Baseline Metrics

- Samples: **24**
- Correct: **20**
- Overall accuracy: **83.33%**
- Misclassified: **4**

### Per-intent Metrics

| Intent | Support | Predicted | Hit | Miss | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| WHY | 6 | 6 | 6 | 0 | 100.00% | 100.00% |
| WHEN | 6 | 10 | 6 | 0 | 60.00% | 100.00% |
| ENTITY | 6 | 6 | 6 | 0 | 100.00% | 100.00% |
| GENERAL | 6 | 2 | 2 | 4 | 100.00% | 33.33% |

### Confusion Matrix (actual -> predicted)

| Actual \ Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 6 | 0 | 0 | 0 |
| WHEN | 0 | 6 | 0 | 0 |
| ENTITY | 0 | 0 | 6 | 0 |
| GENERAL | 0 | 4 | 0 | 2 |

## T5.1-R2 Current Metrics

- Samples: **24**
- Correct: **20**
- Overall accuracy: **83.33%**
- Misclassified: **4**

### Per-intent Metrics

| Intent | Support | Predicted | Hit | Miss | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| WHY | 6 | 6 | 6 | 0 | 100.00% | 100.00% |
| WHEN | 6 | 6 | 4 | 2 | 66.67% | 66.67% |
| ENTITY | 6 | 6 | 6 | 0 | 100.00% | 100.00% |
| GENERAL | 6 | 6 | 4 | 2 | 66.67% | 66.67% |

### Confusion Matrix (actual -> predicted)

| Actual \ Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 6 | 0 | 0 | 0 |
| WHEN | 0 | 4 | 0 | 2 |
| ENTITY | 0 | 0 | 6 | 0 |
| GENERAL | 0 | 2 | 0 | 4 |

### Score Diagnostics

- Margin stats: min=0.200, p25=1.375, p50=2.550, p75=4.225, p90=7.140, max=7.400, mean=3.200
- Top-score stats: min=1.000, p25=1.925, p50=2.600, p75=3.925, p90=6.000, max=7.100, mean=3.163
- Low-margin (<0.080) cases: **0**; errors: **0** (0.00%)

#### Decision Reason Breakdown

| Reason | Total | Errors | Error Rate |
|---|---:|---:|---:|
| scored | 24 | 4 | 16.67% |

#### Low-margin Error Samples

None.

## T4 vs T5.1-R2 Delta

### Per-intent Delta

| Intent | Δ Precision | Δ Recall | Δ Hit | Δ Miss |
|---|---:|---:|---:|---:|
| WHY | 0.00pp | 0.00pp | 0 | 0 |
| WHEN | +6.67pp | -33.33pp | -2 | +2 |
| ENTITY | 0.00pp | 0.00pp | 0 | 0 |
| GENERAL | -33.33pp | +33.33pp | +2 | -2 |

### Confusion Shift (off-diagonal)

| Actual -> Predicted | Δ Count (T5.1-R2 - T4) |
|---|---:|
| WHEN -> GENERAL | +2 |
| GENERAL -> WHEN | -2 |

### Case-level Shift

- Recovered mistakes (T4 wrong -> T5.1-R2 correct): **2**
- New regressions (T4 correct -> T5.1-R2 wrong): **2**

#### Top Recovered

| ID | Shift | Query |
|---|---|---|
| C002 | GENERAL->WHEN -> GENERAL | which summary from last week should I share with leadership |
| C020 | GENERAL->WHEN -> GENERAL | 把最近讨论做个简短状态播报 |

#### Top Regressed

| ID | Shift | Query |
|---|---|---|
| C011 | WHEN -> GENERAL | timeline for the rollback and recovery yesterday |
| C021 | WHEN -> GENERAL | which date did hybrid retrieval become default |

