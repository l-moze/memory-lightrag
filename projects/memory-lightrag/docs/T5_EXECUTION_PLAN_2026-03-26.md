# T5 执行计划（GENERAL 判别提升阶段）

日期：2026-03-26
Owner：Orchestrator (health-manager)

## 目标
在保持兼容的前提下，提升 `GENERAL` 意图识别质量，降低被 `WHEN/ENTITY` 误吸收：
1) 规则层引入负模式与轻量置信机制（不引入重模型）
2) 回放数据集扩展到 100+（覆盖更多 GENERAL 场景）
3) 输出可审核的对比结果（T4 vs T5）

## 成功标准（阶段门槛）
- Build 通过：`npx tsc -p tsconfig.json`
- Verify 通过：`npm run verify:intent-rerank`
- Eval 可复现：`npm run eval:intent-replay`
- 指标目标（相对 T4）
  - GENERAL recall 提升（目标 >= 70%）
  - Overall accuracy 不低于 T4 - 1.5%

## 任务拆分

### T5-A（Builder-Policy）
- 范围：`src/policy/query-intent.ts`
- 内容：
  1. 新增 GENERAL 保护逻辑（negative patterns / weak cue suppression）
  2. 对歧义词（what/which/什么/哪个）增加更严格上下文约束
  3. 保持 WHY → WHEN → ENTITY → GENERAL 主优先级不变
- 交付：代码 + 说明 + 边界样例前后对比

### T5-B（Builder-Eval）
- 范围：`eval/*`
- 内容：
  1. 扩充 replay 数据集到 100+ 样本（尤其 GENERAL）
  2. 运行评测，输出 confusion + per-intent 指标
  3. 给出 T4/T5 对比表
- 交付：新数据集、结果报告、对比摘要

### T5-C（Builder-Tests/Docs）
- 范围：`test/*` + `docs/*`
- 内容：
  1. 增加 GENERAL 边界回归测试
  2. 更新 runbook：GENERAL 误判排查策略
- 交付：验证脚本更新 + 文档更新

## 审核流程（可落地）
1. 先审 T5-A（功能正确性 + 兼容）
2. 再审 T5-B（指标真实性 + 可复现）
3. 最后审 T5-C（测试覆盖 + 运维可读性）
4. 汇总出 `docs/T5_REVIEW_REPORT_2026-03-26.md`

## 风险与回滚
- 风险：GENERAL 召回提升可能牺牲 WHEN/ENTITY 精度
- 回滚：按 commit 粒度逆序回滚 T5-C → T5-B → T5-A

