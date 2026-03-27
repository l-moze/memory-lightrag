# Subagent Task Board — memory-lightrag (2026-03-25)

Orchestrator: director (review/acceptance only)
Execution: subagents

## Task A — Workspace 分域接入（个人/集体）
- Owner: subagent-A
- Scope:
  1. 在 memory-lightrag adapter 中为写入与查询增加 `LIGHTRAG-WORKSPACE` header 支持
  2. 设计并实现 workspace 路由规则（personal/group/shared）
  3. `file_source` 规范化（personal:..., group:...）
- Artifacts:
  - 代码改动（插件目录）
  - `docs/WORKSPACE_ISOLATION_DESIGN.md`
  - 验收命令与输出（附到 docs/EVIDENCE_RUN_*.log）
- Acceptance:
  - 同 query 在不同 workspace 命中不同数据域

## Task B — 衰减策略代码化（hot/warm/cold）
- Owner: subagent-B
- Scope:
  1. 输出衰减策略设计（recency/importance/frequency）
  2. 落地最小可执行实现（降权与归档，不做危险硬删）
  3. 提供可回滚方案
- Artifacts:
  - 代码改动
  - `docs/DECAY_POLICY_V1.md`
  - 验收脚本/命令
- Acceptance:
  - 可运行一次衰减流程并产出前后对比

## Task C — 端到端回归报告（真实测评）
- Owner: subagent-C
- Scope:
  1. builtin vs lightrag 对比（不少于 3 组 query）
  2. fallback 强制测试（故障场景）
  3. 分域测试（personal/group）
- Artifacts:
  - `docs/E2E_REGRESSION_REPORT_2026-03-25.md`
  - 原始命令与关键输出
- Acceptance:
  - 报告包含通过项/失败项/风险/下一步

## Workflow Rules
- 所有 subagent 只提交可核验证据，不写口头承诺
- 每个任务都要给：变更文件列表、验证命令、结果摘要、风险与回滚
- director 只做审查与验收，不代替实现
