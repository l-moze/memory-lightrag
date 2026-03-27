# Intent Replay Evaluation Results (2026-03-26)

> Time tag: **[AS-IS]** (current snapshot). If a different report shows inconsistent numbers, treat this file as source-of-truth for this run.

## Summary

- Dataset: `intent_replay_dataset_2026-03-26.json`
- Samples: **120**
- Baseline: **T4 (legacy decision order)**
- Current: **T5.1-R2 (scored routing)**
- Accuracy (T4 -> T5.1-R2): **81.67% -> 87.50% (+5.83pp)**

## T4 Baseline Metrics

- Samples: **120**
- Correct: **98**
- Overall accuracy: **81.67%**
- Misclassified: **22**

### Per-intent Metrics

| Intent | Support | Predicted | Hit | Miss | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| WHY | 24 | 22 | 21 | 3 | 95.45% | 87.50% |
| WHEN | 24 | 40 | 24 | 0 | 60.00% | 100.00% |
| ENTITY | 24 | 26 | 23 | 1 | 88.46% | 95.83% |
| GENERAL | 48 | 32 | 30 | 18 | 93.75% | 62.50% |

### Confusion Matrix (actual -> predicted)

| Actual \ Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 21 | 1 | 0 | 2 |
| WHEN | 0 | 24 | 0 | 0 |
| ENTITY | 0 | 1 | 23 | 0 |
| GENERAL | 1 | 14 | 3 | 30 |

## T5.1-R2 Current Metrics

- Samples: **120**
- Correct: **105**
- Overall accuracy: **87.50%**
- Misclassified: **15**

### Per-intent Metrics

| Intent | Support | Predicted | Hit | Miss | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| WHY | 24 | 22 | 21 | 3 | 95.45% | 87.50% |
| WHEN | 24 | 31 | 23 | 1 | 74.19% | 95.83% |
| ENTITY | 24 | 25 | 23 | 1 | 92.00% | 95.83% |
| GENERAL | 48 | 42 | 38 | 10 | 90.48% | 79.17% |

### Confusion Matrix (actual -> predicted)

| Actual \ Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 21 | 0 | 0 | 3 |
| WHEN | 0 | 23 | 0 | 1 |
| ENTITY | 0 | 1 | 23 | 0 |
| GENERAL | 1 | 7 | 2 | 38 |

### Score Diagnostics

- Margin stats: min=0.000, p25=1.200, p50=2.300, p75=3.500, p90=4.070, max=7.600, mean=2.287
- Top-score stats: min=0.000, p25=1.100, p50=2.100, p75=3.000, p90=3.760, max=6.600, mean=2.236
- Low-margin (<0.080) cases: **7**; errors: **2** (28.57%)

#### Decision Reason Breakdown

| Reason | Total | Errors | Error Rate |
|---|---:|---:|---:|
| scored | 120 | 15 | 12.50% |

#### Low-margin Error Samples

| ID | Expected | Predicted | Margin | TopScore | Reason | Query |
|---|---|---|---:|---:|---|---|
| Q006 | WHY | GENERAL | 0.000 | 0.200 | scored | what caused the reranker score drop |
| Q057 | WHY | GENERAL | 0.000 | 0.200 | scored | what caused the ontology merge conflict to appear |

## T4 vs T5.1-R2 Delta

### Per-intent Delta

| Intent | Δ Precision | Δ Recall | Δ Hit | Δ Miss |
|---|---:|---:|---:|---:|
| WHY | 0.00pp | 0.00pp | 0 | 0 |
| WHEN | +14.19pp | -4.17pp | -1 | +1 |
| ENTITY | +3.54pp | 0.00pp | 0 | 0 |
| GENERAL | -3.27pp | +16.67pp | +8 | -8 |

### Confusion Shift (off-diagonal)

| Actual -> Predicted | Δ Count (T5.1-R2 - T4) |
|---|---:|
| GENERAL -> WHEN | -7 |
| WHY -> WHEN | -1 |
| WHY -> GENERAL | +1 |
| WHEN -> GENERAL | +1 |
| GENERAL -> ENTITY | -1 |

### Case-level Shift

- Recovered mistakes (T4 wrong -> T5.1-R2 correct): **12**
- New regressions (T4 correct -> T5.1-R2 wrong): **5**

#### Top Recovered

| ID | Shift | Query |
|---|---|---|
| Q034 | GENERAL->WHEN -> GENERAL | 总结一下最近一周 memory recall 的变化 |
| Q035 | GENERAL->WHEN -> GENERAL | give me a concise recap of yesterday's debugging notes |
| Q036 | GENERAL->ENTITY -> GENERAL | 帮我整理一下这个项目的复盘要点 |
| Q041 | GENERAL->WHEN -> GENERAL | extract action items from recent notes |
| Q042 | GENERAL->WHEN -> GENERAL | 把最近讨论合成一段摘要 |
| Q084 | GENERAL->WHEN -> GENERAL | summarize this week's memory system health in 5 bullets |
| Q087 | GENERAL->WHEN -> GENERAL | 整理最近讨论，输出可执行的下一步建议 |
| Q099 | GENERAL->WHEN -> GENERAL | what should we focus on next based on recent progress |
| Q100 | GENERAL->WHEN -> GENERAL | 把目前路线图讲清楚，重点放在近期动作 |
| Q102 | GENERAL->WHEN -> GENERAL | 做一份今天的工作简报 |

#### Top Regressed

| ID | Shift | Query |
|---|---|---|
| Q021 | WHEN -> GENERAL | 最近一次手动修复是在啥时候 |
| Q097 | GENERAL -> WHEN | synthesize key takeaways from the incident notes |
| Q101 | GENERAL -> WHEN | produce a compact update with decisions and open questions |
| Q110 | GENERAL -> WHEN | generate a concise end-of-day report from notes |
| Q119 | GENERAL -> WHEN | 写一个简洁版本，告诉我现在到哪一步了 |

