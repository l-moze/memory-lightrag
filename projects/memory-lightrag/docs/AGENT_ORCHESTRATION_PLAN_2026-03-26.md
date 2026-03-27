# Agent Orchestration Plan — memory-lightrag

Date: 2026-03-26
Orchestrator: health-manager
Goal: Multi-agent推进 `memory-lightrag` 的下一阶段（PR-3 + 可审核验证），并确保可落地审查。

## 1) Scope

本轮范围：
1. 引入 intent-aware 基础策略（WHY/WHEN/ENTITY/GENERAL）
2. 引入 rerank 权重策略模块（规则版）
3. 建立可复现测试与审核清单（避免仅“看起来可用”）

不在本轮：
- 复杂 beam search
- 异步 consolidation worker（后续阶段）

## 2) Team Roles

- Orchestrator（本会话）
  - 路由、状态管理、审核 gate
- Builder-A（实现）
  - 产出: `src/policy/query-intent.ts`, `src/policy/rerank-policy.ts`, 以及必要 wiring
- Builder-B（测试）
  - 产出: 测试/样例/最小验证脚本（覆盖 intent 分类与权重映射）
- Reviewer（后置）
  - 产出: 审核报告（功能正确性、兼容性、风险）

## 3) Task Lifecycle

Inbox → Assigned → In Progress → Review → Done/Failed

### Task T1 (Assigned)
- Owner: Builder-A
- Objective: 实现规则版 intent + rerank policy，并保持兼容
- Acceptance:
  - 不破坏当前 `memory_search` 输出
  - 新模块有清晰类型定义
  - 编译通过

### Task T2 (Assigned)
- Owner: Builder-B
- Objective: 补 intent/rerank 的可验证测试
- Acceptance:
  - 至少覆盖 WHY/WHEN/ENTITY/GENERAL
  - 覆盖未知输入回落策略
  - 测试命令可执行并给出结果

### Task T3 (Pending, gated)
- Owner: Reviewer
- Trigger: T1 + T2 完成后
- Objective: 独立审核并给出可合并建议
- Acceptance:
  - 审核 checklist 完整
  - 列出阻塞项（如有）

## 4) Handoff Protocol

每个 agent 交付必须包含：
1. 改动文件列表
2. 关键设计说明
3. 验证命令 + 结果
4. 已知风险
5. 推荐下一步

## 5) Review Gates

Gate-1 (Build Gate)
- `npx tsc -p tsconfig.json` 必须通过

Gate-2 (Behavior Gate)
- intent 分类符合规则
- 权重映射无空值/NaN

Gate-3 (Compatibility Gate)
- `memory_search` 兼容旧字段与 fallback 行为

Gate-4 (Audit Gate)
- Reviewer 明确给出：Pass / Pass with minor / Block

## 6) Artifacts

- 本计划文档: `docs/AGENT_ORCHESTRATION_PLAN_2026-03-26.md`
- 代码改动: `src/policy/*`, 可能含 `src/index.ts`
- 审核输出: `docs/AGENT_REVIEW_REPORT_2026-03-26.md`

## 7) Escalation

阻塞条件：
- 类型系统冲突
- 兼容性破坏（旧调用方受影响）
- 测试不稳定

处理：
- 立即标记 Failed + 写明原因
- 保留最小可合并变更，不硬拼功能

---

Status Snapshot:
- T1: Assigned
- T2: Assigned
- T3: Pending (wait T1/T2)

