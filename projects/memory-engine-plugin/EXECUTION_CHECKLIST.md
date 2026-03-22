# Memory Plugin 执行清单（1页版）

## 目标
在不写代码前提下，完成可执行推进准备：范围锁定、任务分工、验收标准、风险回滚。

## DoD（完成定义）
- [ ] 单一路线架构被确认（无分叉方案）
- [ ] v1/v2/v3 边界清晰并有验收标准
- [ ] 风险与回滚可执行
- [ ] 团队任务进入可追踪状态（Assigned/In Progress/Review/Done）

## v1（先可用）
- [ ] 插件范围：status + search + recall budget
- [ ] 边界约束：不替代 OpenClaw 会话事实源
- [ ] 安全约束：recalled memory 视为不可信文本
- [ ] 降级路径：slot 切回 memory-core
- [ ] 指标：hit-rate / false-recall / latency / token cost

## v2（增强稳定）
- [ ] 受控 auto-capture（阈值/去重/批量）
- [ ] 注入/污染防护规则
- [ ] 观测看板字段确定

## v3（治理成熟）
- [ ] consolidation 规则（晋升条件）
- [ ] decay 规则（时间/访问降权）
- [ ] warning memory（风险预警）

## 风险-回滚速查
- 检索质量差 -> 提高 minScore / 降低 topK
- 成本上升 -> 收紧 recall budget
- 安全疑虑 -> 关闭 auto-capture
- 服务不稳定 -> 切回 memory-core
