# memory-lightrag 工作总结 / 代码审核 / 推进计划

> 时间：2026-03-27
> 仓库：`https://github.com/pioneerweirdo-eng/memory-lightrag.git`
> 基准分支：`master`（已推送）

---

## 1) 前期工作总结（事实基线）

### 1.1 双版本分叉已确认并收敛
- 运行版本（A）：`/home/node/.openclaw/workspace/projects/memory-lightrag`，版本 **0.1.1**
- director 镜像（B）：`/home/node/.openclaw/workspace/agents/director/projects/memory-engine-plugin/memory-lightrag`，版本 **0.1.0**
- 差异为**大规模代码分叉**（多模块缺失/重写），非小漂移。
- 已按你的要求：
  - 两边各建 snapshot 分支并推送
  - A→B 同步完成并合入 master
  - 清理冗余分支，仅保留指定 4 个

### 1.2 Gate 结论（当前态）
- **Gate1（plugins inspect）**：PASS
- **Gate3（diagnostics zero）**：PASS
- **Gate2（tool-path success + fallback details）**：**BLOCKED**
  - 阻断因素 1：`session file locked` 导致 tool-path 实测失败
  - 阻断因素 2：`openai embeddings failed: 401 invalid_api_key`

### 1.3 证据文件（已落地）
- `docs/EVIDENCE_RUN_20260327T074553Z_GATECHECK_RETRY.md`
- `docs/EVIDENCE_RUN_20260327T084659Z_TOOLPATH_SUCCESS_ATTEMPT.md`
- `docs/FINAL_ALIGNMENT_PACKAGE_2026-03-27.md`
- `docs/GIT_DIFF_ANALYSIS_2026-03-27.md`
- `docs/VERSION_DIFF_AUDIT_2026-03-27.md`

---

## 2) 当前代码审核（基于 master）

### 2.1 主要架构模块（已合入 master）
- **LightRAG Adapter**（`src/adapter/lightrag.ts`）
  - `/query/data` 拉取结构化结果
  - 提供 requestId / latencyMs / reason 等字段
  - 失败时具备 fallback 触发路径
- **访问控制与域路由**（`src/policy/*`）
  - `domain-routing`、`access`、`source-tag` 等
  - 支持 workspace 分区与来源过滤
- **工具执行与 details 规范化**（`src/index.ts`）
  - 统一 `backend / fallback / reason / requestId / latencyMs / activeBackend`
  - 具备 ontology 信息补充与 intent telemetry

### 2.2 风险点 / 技术债
1. **Gate2 实测路径不稳定**：session lock 导致 tool-path 无法稳定跑通
2. **embedding 提供方配置不统一**：`memorySearch.provider=openai` + `OPENAI_BASE_URL` 指向 siliconflow，但 key 无效
3. **docs 证据链较多**：多份证据分散，需要统一归档入口（已合并至 master，但仍需整理索引）

### 2.3 结论（代码层）
- 当前 master 已统一为运行版本 A 的实现。
- 代码本身未见结构性缺陷，**阻断来自运行环境与验证通路**。

---

## 3) 下一步推进计划（最小闭环）

### Phase A — 修复验证通路（P1）
1. **解决 session lock**
   - 在非争用会话重跑 tool-path 验证
   - 目标：产生一次完整 success/fallback evidence

2. **修正 embeddings 提供方配置**
   - 选项 A：明确 `memorySearch.remote.baseUrl= http://new-api:3000/v1`
   - 选项 B：替换为本地 provider（local/ollama）
   - 目标：避免 `openai embeddings 401`

### Phase B — Gate2 完整验收
- 成功链路：LightRAG 返回 + details 完整
- 失败链路：强制 fallback + details 完整
- 完成后更新 `TRACELOG` + 新 evidence

### Phase C — 归档清理
- 建议统一入口：`docs/FINAL_ALIGNMENT_PACKAGE_2026-03-27.md`
- 补一份 `docs/INDEX.md` 指向核心 evidence 与结论

---

## 4) 需要你确认的决策点

1. **是否允许调整 memorySearch provider 配置**（OpenAI → new-api 或 local）
2. **Gate2 复验由我直接执行，还是你指定时间窗口？**
3. **是否需要生成一份统一的 docs 索引页？**

---

## 5) 建议的工作顺序（可直接执行）
1. 修 session lock → 复验 tool-path
2. 修 embedding provider → 复验 memory_search
3. Gate2 过关后更新 TRACELOG 与 evidence

---

> 以上为对当前 master 基线的正式审核与推进建议。若你确认，我可直接进入 Phase A。
