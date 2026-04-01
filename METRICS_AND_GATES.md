# METRICS_AND_GATES

## KPI
- Graph Grounded Recall Rate（答案是否由带 provenance 的图证据支撑）
- Multi-hop Memory Accuracy（跨节点/跨回合推理正确率）
- Temporal Consistency Accuracy（时间顺序与变更历史正确率）
- Isolation Leak Rate（跨 workspace / domain 泄露率）
- P95 Retrieval Latency（检索延迟）
- Added Token Cost per Turn（附加 token 成本）

## Benchmark Families
- Compatibility smoke：status/search/fallback
- Long conversation memory：LoCoMo-style
- Multi-session memory：LongMemEval-style
- Isolation / poisoning：内部对抗集

## Stage Gates

### P0 Gate（兼容可用）
- `status/search/fallback` 全通过
- Isolation Leak Rate = 0
- P95 Latency <= 1200ms
- Added Token <= 1200/turn

### P1 Gate（写入闭环成立）
- 写入后可命中率 >= 0.90
- Provenance completeness >= 0.95
- Isolation Leak Rate = 0
- P95 write-to-query freshness <= 60s

### P2 Gate（图读取成立）
- Multi-hop Memory Accuracy 相对 snippets baseline 提升 >= 10pp
- Temporal Consistency Accuracy >= 0.75
- Graph Grounded Recall Rate >= 0.80
- P95 Latency <= 1500ms

### P3 Gate（治理成熟）
- Conflict resolution precision >= 0.85
- Revocation / supersede correctness >= 0.95
- Isolation Leak Rate = 0
- Added Token <= 900/turn

## Pass/Fail Rule
- 任一核心 KPI 不达标 => 该阶段 Fail，不得升级到下一阶段。
- 若 P2 无法证明图路径优于 snippets baseline，则暂停新图特性扩张，回到写入质量与 ontology 设计。
