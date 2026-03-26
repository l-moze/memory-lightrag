# T4 执行计划（进入下一阶段）

日期：2026-03-26
Owner：Orchestrator (health-manager)

## 目标
在已完成 T3 的基础上，推进可量化验证与可持续迭代：
1) 真实/近真实 query 回放评测（30-50 条）
2) intent 规则收敛（基于误判样本）
3) schema 文档补全（ontologyPolicy/filtering）

## 工作流
Inbox → Assigned → In Progress → Review → Done/Failed

## 任务拆分

### T4-A：Replay Evaluation（Builder-Eval）
- 产出：
  - `eval/intent_replay_dataset_2026-03-26.json`
  - `eval/intent_replay_results_2026-03-26.md`
- 要求：
  - 收集 30-50 条 query（优先真实样本，不足则补充接近真实样本）
  - 输出 confusion-like 统计（WHY/WHEN/ENTITY/GENERAL）
  - 标注 Top 误判样例

### T4-B：Intent Rule Tuning（Builder-Policy）
- 产出：
  - `src/policy/query-intent.ts` 优化
  - `test/intent-rerank.verify.mjs` 增补误判回归用例
- 要求：
  - 不破坏已有通过项
  - 明确“修改前后命中差异”

### T4-C：Schema & Ops Docs（Builder-Docs）
- 产出：
  - `docs/memory-ontology.md` / `docs/AGENT_REVIEW_REPORT_2026-03-26.md` 补充 schema 字段说明
  - 运行/观测手册（如何看 ontologyPolicy/filtering）

## 审核 Gate
- Gate-1 Build：`npx tsc -p tsconfig.json`
- Gate-2 Verify：`npm run verify:intent-rerank`
- Gate-3 Evidence：回放报告可复现 + 含样本与统计
- Gate-4 Compatibility：旧路径输出不破坏

## 交付与回滚
- 每个任务独立 commit
- 按顺序合并：T4-A → T4-B → T4-C
- 若 T4-B 退化，回滚其 commit，保留 T4-A/T4-C

