# RISK_REGISTER

| Risk | Trigger | Impact | Mitigation | Rollback | Owner | Priority |
|---|---|---|---|---|---|---|
| 误召回（无关记忆注入） | recall阈值过低 | 答复偏离/幻觉 | 提高minScore，加入source标注 | 降低topK并切回memory-core | Risk Reviewer | High |
| 记忆污染（poisoning） | 恶意文本被capture/recall | 决策被操纵 | 注入模式检测，recalled text不执行 | 关闭capture，清空近期索引分区 | Risk Reviewer | High |
| 成本失控 | recall预算过大 | 延迟和token成本上升 | recallBudgetChars上限，topK限制 | 关闭auto-recall，仅手动search | Ops | High |
| 后端不可用 | LightRAG服务故障 | recall中断 | 健康探测+重试+超时 | 立即切回memory-core | Ops | High |
| 复杂度过早引入 | v1引入过多特性 | 推进停滞 | 严格v1范围管理 | 暂停v2/v3，仅保留status/search | Orchestrator | Medium |
| 指标不可观测 | 未定义日志与KPI | 无法判断效果 | 定义hit-rate/latency/false-recall | 不达标则不进入下一阶段 | Ops | Medium |
