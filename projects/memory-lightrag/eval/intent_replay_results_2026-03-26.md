# Intent Replay Evaluation Results (2026-03-26)

## Summary

- Dataset: `eval/intent_replay_dataset_2026-03-26.json`
- Samples: **44**
- Correct: **38**
- Overall accuracy: **86.36%**
- Misclassified: **6**

## Per-intent Metrics

| Intent | Support | Predicted | Hit | Miss | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| WHY | 11 | 10 | 10 | 1 | 100.00% | 90.91% |
| WHEN | 11 | 15 | 11 | 0 | 73.33% | 100.00% |
| ENTITY | 11 | 12 | 11 | 0 | 91.67% | 100.00% |
| GENERAL | 11 | 7 | 6 | 5 | 85.71% | 54.55% |

## Confusion Matrix (actual -> predicted)

| Actual \ Pred | WHY | WHEN | ENTITY | GENERAL |
|---|---:|---:|---:|---:|
| WHY | 10 | 0 | 0 | 1 |
| WHEN | 0 | 11 | 0 | 0 |
| ENTITY | 0 | 0 | 11 | 0 |
| GENERAL | 0 | 4 | 1 | 6 |

## Top Misclassified Cases

| ID | Expected | Predicted | Query |
|---|---|---|---|
| Q006 | WHY | GENERAL | what caused the reranker score drop |
| Q034 | GENERAL | WHEN | 总结一下最近一周 memory recall 的变化 |
| Q035 | GENERAL | WHEN | give me a concise recap of yesterday's debugging notes |
| Q036 | GENERAL | ENTITY | 帮我整理一下这个项目的复盘要点 |
| Q041 | GENERAL | WHEN | extract action items from recent notes |
| Q042 | GENERAL | WHEN | 把最近讨论合成一段摘要 |

