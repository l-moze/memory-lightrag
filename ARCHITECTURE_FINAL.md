# ARCHITECTURE_FINAL — Graph Memory Substrate

## Decision
采用 **OpenClaw Memory Plugin + LightRAG Graph Substrate** 的单一路径。

该项目不再被定义为“LightRAG 检索适配器”，而是被定义为：

- 用 OpenClaw plugin 形态接入的图记忆系统
- 用 LightRAG 承担图索引、图检索、图操作底座
- 用 memory plugin 承担记忆生命周期、隔离、安全、fallback、可观测

## Scope

### Phase P0（兼容层）
- `memory status`
- `memory search`
- fallback
- provenance / diagnostics

### Phase P1（图写入闭环）
- 事件/事实写入 LightRAG
- workspace/domain 隔离
- source/provenance 可追溯
- 最小 ontology contract

### Phase P2（图原生读取）
- anchor identification
- graph-aware retrieval / traversal
- evidence assembly
- query-only routing 降级为辅助层

### Phase P3（生命周期治理）
- promotion / decay / revocation
- conflict handling
- graph quality metrics

## Boundaries
1. OpenClaw session store 仍是主会话事实源与回退基线。
2. memory plugin 负责把“图能力”变成“记忆系统能力”，而不是仅做 HTTP adapter。
3. LightRAG 负责图索引、图检索、实体关系操作与工作区隔离；不承担业务语义、信任治理、产品评测定义。
4. ontology/schema 层负责定义记忆对象与关系的类型约束，不替代检索/推理引擎。

## Responsibilities
- OpenClaw：会话管理、工具调用、slot 选择、兼容回退
- memory plugin：memory lifecycle、domain policy、budget、safety、metrics、fallback
- LightRAG：document ingest、entity/relation graph、hybrid/mix retrieval、workspace isolation、delete/merge/export
- ontology/schema：typed memory object model、validation、provenance contract

## Target Architecture
Session / turns
-> memory plugin orchestration
-> write path: extract -> normalize -> validate -> LightRAG ingest
-> read path: anchor -> LightRAG retrieval/traversal -> safety filter -> budget trim -> prompt/tool output
-> metrics + rollback hooks

## Strategic Principle
不重写 LightRAG 已经成熟的通用图 RAG 基础设施，但必须把以下能力留在项目自己的控制面：

1. 记忆对象语义（decision / preference / commitment / incident / source）
2. 生命周期治理（promotion / decay / revoke）
3. 信任与隔离边界
4. 评测与门禁

## Fallback Strategy
- 后端异常/质量下降：
  1) 缩小 traversal / recall budget
  2) 降低 topK
  3) 关闭图写入与自动晋升
  4) 切回 `plugins.slots.memory = "memory-core"`

## Rationale
该方案保留 LightRAG 作为底座，避免无意义重写；
同时把项目目标从“检索插件”提升为“图记忆系统”，避免长期停留在 query patch + snippet recall。
