# Theme A/B 第二轮深挖：策略矩阵与改造清单

Date: 2026-03-25

## A) 分域冲突与跨域检索合并策略矩阵

### 域模型
- Personal: `u_<userId>`
- Group: `g_<groupId>`
- Shared: `global_shared`

### 冲突类型 × 合并策略

1. 同实体跨域冲突（例如同名 Project 在 personal/group 描述不一致）
- 检测：`name + normalized type` 命中同候选
- 决策：
  - 回答默认优先 personal > group > shared
  - 保留多域证据，不做静默覆盖
- 输出：`conflict=true`, `conflictDomains=[...]`, `resolutionPolicy="domain-priority"`
- 风险：个人信息覆盖公共事实
- 缓解：当 group/shared 置信度显著高于 personal（阈值 >0.15）时提示冲突

2. 同关系冲突（A depends_on B vs A related_to C）
- 检测：`(from,type)` 多 toEntity
- 决策：
  - time-aware：新近关系优先
  - source-weight：多源一致优先
- 输出：`relationConflictSet` + `selectedRelation`

3. 跨域结果重复（同内容在多个域都出现）
- 检测：chunk hash / normalized snippet
- 决策：
  - 去重显示，保留最优来源
  - `alsoSeenIn=[...]`

4. 权限越界风险（group 查询误召回 personal）
- 检测：请求上下文域与命中文档域不一致
- 决策：
  - 严格过滤：仅允许同域 + shared
  - 默认禁止 personal <- group 反向访问

### 跨域检索合并排序（v1）
- 分数：`score = sim * w_domain * w_recency * w_source`
  - `w_domain`: personal=1.0, group=0.85, shared=0.7
  - `w_recency`: 7天内1.0，30天0.8，30天+ 0.6
  - `w_source`: direct-file=1.0, derived-summary=0.8
- TopK 分配：
  - personal 60%
  - group 30%
  - shared 10%
- 合并后再 rerank（保留 provenance）

---

## B) 实体同义合并 / 关系冲突处理策略

### 实体同义合并（Entity Canonicalization）
1. 归一化键：
- `canonKey = normalize(name) + type`
- normalize 包含大小写折叠、空白/标点规整

2. 同义来源：
- 显式别名（aliases）
- 字符近似（编辑距离阈值）
- 同来源文档的共现关系（弱证据）

3. 合并规则：
- 只在同域内自动 merge
- 跨域仅建立 `same_as` 候选，不自动硬合并
- 合并后保留 `aliasOf` 与原 source ids

### 关系冲突处理（Relation Conflict）
1. 冲突识别：
- 同 `(from, relationType)` 指向多个 to 且权重接近
2. 决策顺序：
- 时间新近 > 多源一致 > 源可信度 > 域优先级
3. 输出策略：
- 主关系 + 候选关系列表
- 若冲突无法消解，answer 层显式提示“存在冲突证据”

---

## C) 文件级改造清单（可直接进入 Step B）

## C1. 必改文件
1. `src/adapter/lightrag.ts`
- 增加 workspace-aware 请求头：`LIGHTRAG-WORKSPACE`
- 增加写接口：
  - `insertText(text, fileSource, workspace)` -> `/documents/text`
  - `insertTexts(items, workspace)` -> `/documents/texts`
- query 接口支持 workspace 入参
- 返回结构扩展 provenance/domain/source

2. `src/index.ts`
- 在 `memory_search` 执行时解析上下文域（personal/group/shared）
- 调用 adapter.search(query, {workspace})
- details 增加：`domain`, `mergePolicy`, `conflict`
- 保持 fallback 路径不变

3. `src/types/contracts.ts`
- 增加：
  - `domain: "personal"|"group"|"shared"`
  - `conflict?: boolean`
  - `conflictSet?: ...`
  - `provenance.domainWorkspace`

4. `src/config/schema.ts`
- 新增域配置：
  - `domains.personalPrefix` (default `u_`)
  - `domains.groupPrefix` (default `g_`)
  - `domains.sharedWorkspace` (default `global_shared`)
- 新增合并配置：
  - `merge.domainWeights`
  - `merge.topKRatio`

## C2. 新增文件
1. `src/policy/domain-routing.ts`
- 输入：session/context
- 输出：workspace + domain

2. `src/policy/merge.ts`
- 输入：multi-domain results
- 输出：merged + conflict annotations

3. `src/policy/canonicalize.ts`
- 实体归一化与同义候选生成

4. `test/domain-isolation-smoke.md`
- 同 query 不同 workspace 对比验证

---

## D) 验收命令（Step B 预置）

1. 写入同 token 到 personal/group 各一条
2. 分别用对应 workspace 查询
3. 验证命中域正确且不串域

示例：
```bash
curl -sS -X POST http://127.0.0.1:9621/documents/text \
  -H 'Content-Type: application/json' -H 'LIGHTRAG-WORKSPACE: u_demo' \
  -d '{"text":"TOKEN_U_ONLY","file_source":"personal:test"}'

curl -sS -X POST http://127.0.0.1:9621/query/data \
  -H 'Content-Type: application/json' -H 'LIGHTRAG-WORKSPACE: u_demo' \
  -d '{"query":"TOKEN_U_ONLY","mode":"mix","top_k":5,"include_references":true,"include_chunk_content":true}'
```

---

## E) 参考依据（本轮）
- LightRAG API README: `projects/LightRAG/lightrag/api/README.md`
- LightRAG config/workspace args: `projects/LightRAG/lightrag/api/config.py`
- LightRAG health/workspace handling: `projects/LightRAG/lightrag/api/lightrag_server.py`
- Project ontology draft: `projects/memory-lightrag/docs/memory-ontology.md`
- Project type contracts: `projects/memory-lightrag/src/types/contracts.ts`
- GraphRAG reference: https://github.com/microsoft/graphrag / https://arxiv.org/abs/2404.16130
- LightRAG paper: https://arxiv.org/abs/2410.05779
- ClawHub ontology skill page: https://clawhub.ai/oswalpalash/ontology
