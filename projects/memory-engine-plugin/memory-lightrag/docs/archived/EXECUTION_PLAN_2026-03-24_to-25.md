# memory-lightrag 推进执行计划（2026-03-24 → 2026-03-25）

## 目标
到明天交付一个可验证的 memory-lightrag v1.5：
1. 真实写入（/documents/text|texts）
2. 真实检索（/query/data）
3. 个人/集体记忆隔离（workspace）
4. 衰减策略（至少可执行的降权/归档方案）
5. 插件内可观测字段与回退链路稳定

---

## 硬约束（必须遵守）
- 先调研文档与源码，再改代码。
- 每次改动对应明确假设与验收命令。
- 禁止随意重启 gateway（避免中断会话）。
- 仅在必要且得到明确授权时做服务级变更。
- 失败要留痕：命令、输出、结论、下一步。

---

## 工作流（边做边验）

### Phase A：设计定稿（先规划）
- A1. 产出 workspace 隔离设计
  - personal: `u_<userId>`
  - group: `g_<groupId>`
  - optional shared: `global_shared`
- A2. 产出衰减规则 v1
  - hot(0-7d) / warm(7-30d) / cold(30d+)
  - score = recency * importance * frequency
- A3. 本体轻量化 v1（ontology-first）
  - entity: Person/Project/Decision/Preference/Todo
  - relation: prefers/decides/assigned_to/depends_on/mentions

验收：文档落地 + 字段映射表可执行。

### Phase B：插件实现
- B1. adapter 增加写接口调用（/documents/text|texts）
- B2. 查询与写入都支持 `LIGHTRAG-WORKSPACE` header
- B3. file_source 规范化（personal/group/system）
- B4. details 字段统一（backend/fallback/reason/requestId/latencyMs/activeBackend）

验收：
- 立即写入后 `/query/data` 可命中新 token
- 指定 workspace 查询只返回对应域语料

### Phase C：回归测试（真实，不模拟）
- C1. 三组 query 对比：builtin vs lightrag
- C2. fallback 强制测试（模拟 lightrag 不可用）
- C3. 个人/集体隔离测试（同 query 不同 workspace）

验收：
- 对比报告（命令+原始输出片段）
- 结论可复现

### Phase D：发布门禁
- D1. `openclaw plugins inspect memory-lightrag --json` PASS
- D2. duplicate diagnostics 为空
- D3. 写入/检索/隔离/fallback 四项均 PASS

---

## 今天到明天的里程碑
- M1（今晚）：完成 A/B 代码主线 + 首轮真实写查验证
- M2（今晚）：完成 C1/C2/C3 对比数据
- M3（明早）：整理验收报告与未决风险
- M4（明天交付）：给出“可上线/不可上线”结论与剩余gap

---

## 风险与边界
- LightRAG 当前 pipeline 可能被历史大文档占用，导致新写入可见性延迟。
- workspace 若未显式初始化，健康接口可能报 pipeline namespace 缺失。
- 若需服务级调整（实例/compose/env），先提交变更方案，再等待授权执行。

---

## 执行提醒（防中断）
- 不执行 gateway restart。
- 每完成一项立即写入 runbook 证据。
- 若遇阻断，优先切换“最小可验证路径”，不盲改。
