# Agent Team Charter — Memory Plugin推进

## Team Topology
- Orchestrator: Director（你当前会话）
- Architect: assigned role（当前由 Director 代理执行，待 subagent runtime 可用后切换）
- Risk Reviewer: assigned role（当前由 Director 代理执行）
- Ops Metrics: assigned role（当前由 Director 代理执行）

## Lifecycle
Inbox -> Assigned -> In Progress -> Review -> Done

## Handoff Protocol (mandatory)
每个任务输出必须包含：
1) What was done
2) Artifact path
3) Verification method
4) Known risks
5) Next action

## Quality Gates
- 无证据不转 Done
- 未定义回滚不进 In Progress
- 指标不可量化不进 Review

## Runtime Constraint
当前环境不可用 subagent/acp runtime（无法实际拉起成员会话），因此先按角色执行并保留可切换点。
一旦 runtime 可用，角色任务无缝转给独立成员会话。
