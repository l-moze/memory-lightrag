# Memory-Lightrag 落地可执行清单（审计修正版）

> 目标：把“规范建议”和“实测阻断”分开，先修能阻断上线的问题，再做规范收敛。
> 日期：2026-03-24

---

## 0) 当前结论（基于实测）

### 已通过（PASS）
- 插件可加载：`status=loaded`
- 工具已注册：`memory_search`, `memory_get`
- CLI 已注册：`memory`
- 入口模式：`definePluginEntry`（符合官方推荐）
- `kind: "memory"` 与 `manifest configSchema` 已存在
- LightRAG 请求端点已是 `POST /query/data`
- 默认 baseUrl 已是 `http://lightrag:9621`

### 仍有差距（P1/P2）
- `openclaw memory status --json` 仍显示全局 `backend: builtin`（这是 memory slot/状态口径问题，不代表工具不可用）
- 运行环境存在 duplicate 插件来源告警（bundled 与 config 同 ID 覆盖关系）

---

## 1) P0 阻断项（必须先过）

> P0 定义：不解决就无法加载/无法运行核心链路。

### P0-1 插件可加载（已通过）
**验收命令**
```bash
openclaw plugins inspect memory-lightrag --json
```
**通过标准**
- `plugin.status == "loaded"`
- `toolNames` 包含 `memory_search`, `memory_get`
- `cliCommands` 包含 `memory`

### P0-2 LightRAG 服务可达（已通过）
**验收命令**
```bash
curl -sSL -o /tmp/lightrag_root.html -w 'HTTP %{http_code}\n' http://lightrag:9621/
curl -sS  -o /tmp/lightrag_openapi.json -w 'HTTP %{http_code}\n' http://lightrag:9621/openapi.json
head -c 200 /tmp/lightrag_openapi.json
```
**通过标准**
- `HTTP 200`
- `openapi.json` 内容可读

### P0-3 查询端点对齐（已通过）
**代码标准**
- adapter 必须调用 `POST /query/data`
- 请求参数：`mode: "mix"`, `top_k: 8`, `include_references: true`, `include_chunk_content: true`

---

## 2) P1 重要项（尽快修）

### P1-1 结果可观测字段统一（已完成代码改造，待端到端可见性校验）
在 `memory_search` 执行结果 details 中统一输出：
- `backend`（lightrag / memory_search）
- `fallback`（boolean）
- `reason`（UPSTREAM_4XX/5XX/TIMEOUT/BACKEND_DOWN/EMPTY_RESULT）
- `requestId`
- `latencyMs`
- `activeBackend`

**本轮代码行为**
- LightRAG 命中：`backend=lightrag, fallback=false, activeBackend=lightrag`
- LightRAG 失败+fallback：`backend=memory_search, fallback=true, activeBackend=builtin-fallback`
- LightRAG 空结果且不fallback：返回空内容并保留 `backend=lightrag`（不再静默降级）

**当前验收进展**
- `plugins inspect`：PASS（插件加载/工具注册正常）
- `openclaw memory search` 只能看到 CLI 聚合结果，不透传 tool details；需通过 agent/tool 实调用日志再做最终可见性验收。
- 本环境 E2E 阻断：`session file locked (...director...jsonl.lock)` 导致 `openclaw agent --local` 无法完成模型执行；已将可复现步骤与通过标准固化到 `test/p1-observability-checklist.md`。

### P1-2 去重告警治理（已完成）
历史问题：
- `duplicate plugin id detected; bundled plugin will be overridden by config plugin`

**本次采用方案**
- 保留 bundled `memory-lightrag` 作为唯一来源
- 从 `plugins.load.paths` 移除 `/home/node/.openclaw/workspace/projects/memory-lightrag`
- 删除 `plugins.installs.memory-lightrag`
- 保留 `plugins.entries.memory-lightrag.enabled=true`，并将配置改为插件期望结构：
  - `lightrag.baseUrl`
  - `lightrag.timeout`
  - `fallbackEnabled`
  - `verbose`

**验收结果**
- `openclaw plugins inspect memory-lightrag --json` 的 `diagnostics` 已为空（duplicate id 告警清零）

---

## 3) P2 规范收敛（可排后）

### P2-1 类型安全收敛
- 去掉 `any`（能补类型就补）
- 保持 ESM import 路径可运行（`.js` 在 NodeNext/ESM 场景是可接受的）

### P2-2 文档一致性
- 在插件 README/运行手册中写清：
  - 容器内地址：`http://lightrag:9621`
  - 宿主机调试地址：`http://127.0.0.1:9621`（需端口映射）

---

## 4) 审计纠偏（避免误修）

以下“原审计说法”需修正：

1. “configSchema 必须只能在 manifest，代码里放就是阻断” → **过强结论**
2. “TS import 不能写 .js 扩展名” → **不成立**（ESM/NodeNext 常见正确写法）
3. “未用 definePluginEntry 必然阻断” → **应降级为高优先级规范问题**，是否阻断取决于实际加载器行为

---

## 5) 本轮已执行修正与验收证据

### 已执行修正
- 修复 `src/index.ts` 中 `memory_get` 返回处遗留类型断点：
  - `return memoryGetTool as AnyAgentTool;` → `return memoryGetTool;`

### 已执行验收
```bash
openclaw plugins inspect memory-lightrag --json
openclaw memory status --json
```

### 结果摘要
- `plugins inspect`：**PASS**（loaded + tools + cli）
- `memory status`：仍显示 `backend: builtin`（属状态口径/slot 行为问题，非插件加载阻断）

---

## 6) 下一步执行建议（可直接派工）

1. **Workstream A（1h）**：统一 `details` 观测字段并补两条回归测试（正常/fallback）
2. **Workstream B（0.5h）**：处理 duplicate plugin id 来源，消除告警
3. **Workstream C（0.5h）**：补文档与验收脚本，固化发布前 checklist

---

## 7) 发布前最终 Gate

满足以下三项才允许标记“可上线”：
- `plugins inspect` 全 PASS（loaded/tools/cli）
- LightRAG 正常查询与 fallback 查询均可复现且 details 完整
- duplicate id 告警清零
