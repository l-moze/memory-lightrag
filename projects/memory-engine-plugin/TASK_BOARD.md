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

### T6 Milestone-1 启动（memory-lightrag 插件骨架）
- State: In Progress
- Owner: Director
- Input: `ARCHITECTURE_FINAL.md`, `METRICS_AND_GATES.md`
- Output: `MILESTONE_1_KICKOFF.md`, plugin scaffold checklist
- Acceptance:
  - 明确 v1 范围（status/search/fallback）
  - 明确不做项（auto-capture/consolidation/decay）
  - 给出第一批实现顺序和验证脚本

#### T6-A Architect 子任务
- State: Done
- Runtime: ACP (`agentId=openclaw`, model=`slwixwph/gpt-5.4`)
- Child Session: `agent:openclaw:acp:5c7c8ae7-e513-4142-ae32-2e3fa2a1f1f1`
- Output: `T6_ARCHITECT_TASK.md`

#### T6-B Adapter 子任务
- State: Done
- Runtime: ACP (`agentId=openclaw`, model=`slwixwph/gpt-5.4`)
- Child Session: `agent:openclaw:acp:9308e503-878f-450d-a76f-5f5d5d24dba5`
- Output: `T6_ADAPTER_TASK.md`

#### T6-C QA 子任务
- State: Done
- Runtime: ACP (`agentId=openclaw`, model=`slwixwph/gpt-5.4`)
- Child Session: `agent:openclaw:acp:9c5ed99f-813e-4f83-ba08-46c11aeb599d`
- Output: `T6_QA_TASK.md`

#### T6-Review Director 评审
- State: Done (Go)
- Output: `T6_DIRECTOR_REVIEW.md`
- Decision: **Go（P0 已补齐，可进入 v1 编码）**

#### T6-P0 补齐任务
- State: Done
- Outputs:
  - `T6_COMPAT_MATRIX.md`
  - `T6_ENDPOINT_PROFILE.md`
  - `T6_CLI_CONTRACT.md`

### T7 v1 开发执行（插件骨架）
- State: In Progress
- Owner: Director (orchestrator)
- Scope: `status` + `search` + `fallback`

#### T7-A 实现任务（Scaffold Agent）
- State: Done
- Output: `T7_IMPLEMENTATION_NOTES.md` + initial file tree changes

#### T7-B 适配任务（Adapter Agent）
- State: Done
- Output: `T7_ADAPTER_MAPPING_FINAL.md`

#### T7-C 验证任务（QA Agent）
- State: Done
- Output: `T7_QA_EXEC_PLAN.md`

#### T7-D v1 插件骨架编码
- State: In Progress
- Output: `memory-lightrag/` scaffold files (`openclaw.plugin.json`, `src/index.ts`, config/adapter/policy/fallback/types)
