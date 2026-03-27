# Theme A/B 第二轮深挖（修订版 V2）

Date: 2026-03-25

> 本版针对你指出的 8 个缺口做闭环：
> 1) 域/路由/权限分离；2) 合并与冲突 contract 化；3) canonicalization 降误合并；
> 4) API 版本锁定；5) 验收补齐否定/边界用例。

---

## 0) 概念分层（强制）

- **Domain（策略语义）**：`personal | group | shared`
  - 决定访问权限、排序权重、冲突解释方式
- **Workspace（技术路由）**：`u_<uid> | g_<gid> | global_shared`
  - 仅用于 LightRAG 数据隔离与请求路由
- **AccessPolicy（OpenClaw 本地判定）**：
  - 在发起 LightRAG 请求前，先计算允许访问的 workspace 集合
  - LightRAG header 只是执行层，不能替代 OpenClaw 本地授权

### 0.1 授权闭环（防越权）
1. `deriveRequestDomain(ctx)`：从 session/channel/chat_type + actor 解析请求语义域
2. `resolveAllowedWorkspaces(domain, actor, group)`：生成 allowlist
3. `enforceWorkspace(requestedWorkspace)`：若不在 allowlist，拒绝并记录审计
4. 才发起 adapter 请求（携带 workspace）

---

## 1) 分域冲突与跨域合并（V2）

### 1.1 请求上下文判定（谁来判定）
- `personal`：direct chat / 明确用户私域请求
- `group`：group chat / thread 绑定群上下文
- `shared`：系统共享检索或显式请求
- 混合场景（群里 @bot 私聊语气）仍按 group 会话处理，禁止隐式跨到 personal

### 1.2 合并策略（避免“双重权重+配额”冲突）
采用两阶段：
- **Stage-1 每域内排序**：域内归一化后 top-k
- **Stage-2 跨域融合**：
  - 先按配额抽样（默认 `50/35/15`，可配置）
  - 再做一次全局 rerank（不再重复乘 domain 权重）

> 规则：配额与权重二选一为主，避免叠加导致反直觉。

### 1.3 抗操纵约束
- `derived-summary` 源设上限权重（如 0.75）
- 写入频率限流（按 workspace+source）
- 最近写入冷却窗口（防刷新内容挤占）

---

## 2) 冲突 contract（最小可实现）

```ts
export interface ConflictCandidate {
  itemId: string;
  workspace: string;
  domain: "personal" | "group" | "shared";
  entityId?: string;
  relationId?: string;
  claim: string;
  score: number;
  scoreBreakdown?: { sim: number; recency: number; source: number };
  evidence: Array<{ sourceId: string; path?: string; snippet?: string }>;
}

export interface ConflictSet {
  conflictType: "entity_version" | "relation_target" | "duplicate_cross_domain";
  key: string; // e.g. canon entity key or relation key
  selected: ConflictCandidate;
  candidates: ConflictCandidate[];
  resolutionPolicy:
    | "domain_priority"
    | "recency_first"
    | "multi_source_consensus"
    | "unresolved";
}
```

### 2.1 责任边界
- **检索层**：产出 `ConflictSet`（证据与候选）
- **回答层**：决定是否展示“存在冲突”与解释文案
- 不允许仅 `conflict:boolean` 粗粒度旗标上线

---

## 3) Canonicalization（降误合并版）

### 3.1 候选生成 vs 最终合并分离
- 共现、编辑距离、alias 仅用于**候选生成**
- 最终 merge 需满足至少两类强证据之一：
  1) 显式 `same_as` 或人工映射
  2) 多源一致 + 高置信阈值

### 3.2 默认策略
- 同域：允许“软合并”（保留别名链）
- 跨域：仅建立 `same_as_candidate`，不自动硬合并

### 3.3 语言与缩写
- 引入语言感知 normalize（中英文分支）
- 编辑距离阈值按名称长度自适应

---

## 4) same_as 的消费路径（防结构债）

- 检索默认不跨域跟随 same_as
- 仅当策略允许且用户显式请求“跨域关联”时，做受限扩展
- 展示层对跨域 same_as 做脱敏（不暴露 personal 细节到 group）

---

## 5) API 锁版与兼容策略（Step B 前置）

### 5.1 锁定基线
- OpenAPI 基线：`http://127.0.0.1:9621/openapi.json`
- 必须在 Step B 开工前做接口签名快照（路径 + 请求体字段）

### 5.2 Workspace 传递兼容
按优先顺序：
1. Header: `LIGHTRAG-WORKSPACE`
2. 若服务不识别，再回退 query/body 方案（仅当 openapi/源码确认支持）

---

## 6) 文件级改造清单（V2）

### 6.1 新增
- `src/policy/access.ts`：domain 判定 + allowlist 校验
- `src/policy/domain-routing.ts`：domain -> workspace 映射
- `src/policy/merge.ts`：两阶段融合 + 冲突集合
- `src/policy/canonicalize.ts`：候选生成与软合并

### 6.2 修改
- `src/adapter/lightrag.ts`
  - search/insert 接口显式接收 `workspace`
  - 增加 openapi 兼容分支与错误分类
- `src/types/contracts.ts`
  - 增加 `ConflictCandidate/ConflictSet`
  - 增加 `provenance.domain/workspace`
- `src/index.ts`
  - memory_search 前置 access 校验
  - details 中输出 `domain`, `workspace`, `conflicts`
- `src/config/schema.ts`
  - `access`, `domains`, `merge`, `antiAbuse` 配置段

---

## 7) 验收矩阵（补齐否定与边界）

1. 正向命中
- u_demo 写入 -> u_demo 查询命中
2. 串域否定
- g_demo 查询 u_demo token == 0 命中
3. shared 边界
- shared 写入在 personal/group 可见，但标记为 shared provenance
4. 重复去重
- 同文本跨域写入，返回去重结果 + `alsoSeenIn`
5. 冲突阈值
- 构造 personal 与 shared 冲突，验证阈值行为与提示文案

---

## 8) Step B 进入条件（硬门槛）

- AccessPolicy 与 WorkspaceRouting 代码存在且单测通过
- Conflict contract 已接入类型系统
- OpenAPI 基线快照完成并落盘
- 否定用例（串域 0 命中）通过
