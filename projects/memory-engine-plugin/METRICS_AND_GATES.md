# METRICS_AND_GATES

## KPI
- Recall Hit Rate（命中率）
- False Recall Rate（误召回率）
- P95 Recall Latency（检索延迟）
- Added Token Cost per Turn（附加token成本）

## Stage Gates

### v1 Gate (可用)
- Hit Rate >= 0.65
- False Recall <= 0.15
- P95 Latency <= 1200ms
- Added Token <= 1200/turn

### v2 Gate (稳定)
- Hit Rate >= 0.72
- False Recall <= 0.10
- P95 Latency <= 1000ms
- Added Token <= 900/turn
- Capture去重命中 >= 0.25

### v3 Gate (治理)
- Hit Rate >= 0.78
- False Recall <= 0.07
- P95 Latency <= 900ms
- Added Token <= 800/turn
- Decay后有效记忆占比提升 >= 20%

## Pass/Fail Rule
- 任一核心KPI不达标 => 该阶段Fail，不得升级到下一阶段。
- 连续两轮Fail => 触发回滚评审（切回memory-core或关闭auto-capture）。
