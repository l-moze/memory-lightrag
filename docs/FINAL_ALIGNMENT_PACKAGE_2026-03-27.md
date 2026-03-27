# memory-lightrag 最终对齐包（2026-03-27）

> 目的：将 2026-03-24~25 的分散计划/任务板/排障记录收敛为单一权威状态页，避免后续口径分叉。

## 1) 权威状态（Authoritative Status）

### 当前结论
- **P0（可运行性）**：已通过（插件加载、工具注册、CLI 注册、LightRAG 基础可达）。
- **P1（可观测性与回退可见性）**：代码侧已对齐，E2E 可见性验证存在环境阻断（session lock）。
- **P1（duplicate 来源告警）**：已治理方案明确，目标是保留单一插件来源并清零 diagnostics。
- **P2（规范与文档收敛）**：进行中，本文档即为收敛落地产物。

### 上线门禁（最终口径）
仅当以下三项同时满足才可标记“可上线”：
1. `openclaw plugins inspect memory-lightrag --json` 全 PASS（loaded/tools/cli）
2. 正常查询路径 + fallback 路径均可复现，且 details 字段完整
3. duplicate plugin id 告警清零

---

## 2) 已对齐的统一事实

### 2.1 插件与端点事实
- 插件入口模式：`definePluginEntry`
- 插件类型：`kind: "memory"`
- 查询端点：`POST /query/data`
- 默认容器内地址：`http://lightrag:9621`

### 2.2 details 观测字段（统一标准）
`memory_search` 的 details 统一为：
- `backend`
- `fallback`
- `reason`
- `requestId`
- `latencyMs`
- `activeBackend`

语义口径：
- LightRAG 命中：`backend=lightrag`, `fallback=false`, `activeBackend=lightrag`
- LightRAG 失败并回退：`backend=memory_search`, `fallback=true`, `activeBackend=builtin-fallback`
- 空结果且不回退：保持 `backend=lightrag`，不做静默降级

### 2.3 非阻断但需标注项
- `openclaw memory status --json` 显示 `backend: builtin`：属于状态口径/slot 行为差异，不直接等价于插件加载失败。

---

## 3) 文档收敛映射（旧文档 -> 现口径）

- `docs/IMPLEMENTATION_ROLLOUT_PLAN.md`：保留为实施基线；最终门禁以本文为准。
- `docs/EXECUTION_PLAN_2026-03-24_to-25.md`：保留为历史执行计划，不再作为当前状态依据。
- `docs/SUBAGENT_TASK_BOARD_2026-03-25.md`：保留为编排记录；当前以实际验收结果为准。
- `docs/SESSIONS_SPAWN_BUG_2026-03-25.md`：保留为平台阻断记录（与 memory-lightrag 逻辑层解耦）。
- `docs/TRACELOG.md`：保留为时序追踪，新增本次对齐里程碑。

---

## 4) 当前阻断与风险

### 阻断项（环境）
- E2E 验证路径受 `session file locked (...jsonl.lock)` 影响，导致某些本地 agent 调用链无法稳定复现到 tool 结果透传层。

### 风险项
- 若继续并行维护多个“计划/状态”文档，后续会再次出现口径分叉。

---

## 5) 下一步（最小闭环）

1. 在非争用会话完成一次 P1 E2E 可见性复验（success + fallback 各 1 次）
2. 将复验命令与关键输出追加到 `docs/EVIDENCE_RUN_*.log`
3. 在 `docs/TRACELOG.md` 补一条“门禁是否全部达成”的结论行

---

## 6) 变更范围说明

本次“最终对齐包”仅包含**文档收敛与门禁口径统一**，不引入代码逻辑变更。
