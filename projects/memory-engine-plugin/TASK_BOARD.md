# Task Board — Memory Plugin Research-to-Execution

## Workflow
Inbox -> Assigned -> In Progress -> Review -> Done

## Tasks

### T1 架构收敛（单一路径）
- State: Done
- Owner: Architect Role (Director proxy)
- Input: RESEARCH_REPORT.md
- Output: `ARCHITECTURE_FINAL.md`
- Acceptance:
  - 仅保留一条推荐路线
  - 包含边界/职责/降级

### T2 风险与回滚清单
- State: Done
- Owner: Risk Reviewer Role (Director proxy)
- Input: RESEARCH_REPORT.md
- Output: `RISK_REGISTER.md`
- Acceptance:
  - 每个风险有触发条件、影响、缓解、回滚

### T3 指标与验收定义
- State: Done
- Owner: Ops Metrics Role (Director proxy)
- Input: RESEARCH_REPORT.md
- Output: `METRICS_AND_GATES.md`
- Acceptance:
  - 指标可量化
  - 每阶段有通过门槛

### T4 执行清单固化
- State: Done
- Owner: Director
- Output: `EXECUTION_CHECKLIST.md`

### T5 团队章程与交接协议
- State: Done
- Owner: Director
- Output: `TEAM_CHARTER.md`
