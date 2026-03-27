# Theme A/B 第二轮深挖（修订版 V3 - 工程闭环）

Date: 2026-03-25

> 本版专门补齐 V2 剩余 4 个高风险缺口：
> 1) ctx 最小输入 contract；2) rerank 可执行定义；3) 脱敏字段级规范；4) OpenAPI 快照强制流程。

---

## 1) `deriveRequestDomain(ctx)` 最小输入 Contract（锁死）

```ts
export interface DomainContext {
  channel: "telegram" | "feishu" | "webchat" | "discord" | "unknown";
  chatType: "direct" | "group";
  sessionKey: string;         // required
  threadId?: string | null;   // optional
  groupId?: string | null;    // required when chatType=group
  actorUserId?: string | null;// optional (anonymous channels may be null)
  mentionTarget?: "bot" | "none"; // optional
}
```

### 1.1 决策表（不可口语化）
- `chatType=direct` -> domain=`personal`
- `chatType=group` -> domain=`group`
- `chatType=group` 且 `mentionTarget=bot` -> **仍是** `group`
- `channel=unknown` -> default `group`（最保守，禁止 personal）

### 1.2 产出
```ts
export interface DomainDecision {
  domain: "personal" | "group" | "shared";
  reasonCode: "DIRECT_CHAT" | "GROUP_CHAT" | "MENTION_IN_GROUP" | "UNKNOWN_CHANNEL_FALLBACK";
}
```

---

## 2) AccessPolicy 返回语义（程序可处理）

```ts
export interface AccessPolicyError {
  code: "DOMAIN_WORKSPACE_DENY" | "CONTEXT_INCOMPLETE" | "WORKSPACE_FORGED";
  message: string;
  domain: "personal" | "group" | "shared";
  requestedWorkspace?: string;
  allowedWorkspaces: string[];
  downgradeToSharedAllowed: boolean;
}
```

### 2.1 行为
- 默认：拒绝（不静默改语义）
- 可选：若配置 `allowSafeDowngrade=true`，仅在 `group->shared` 允许自动降级
- 审计：每次 deny 都写 `audit/security-domain-access.log`

---

## 3) Rerank 可执行定义（防实现分叉）

### 3.1 Stage-1（域内）
- 对每个域分别取候选并计算：
  - `simNorm = rank-based normalization`（按域内 topK 分位到 [0,1]）
  - `recencyScore`（7d=1.0, 30d=0.8, 30d+=0.6）
  - `sourceScore`（direct-file=1.0, derived-summary=0.75）
- 域内分：`intraScore = 0.7*simNorm + 0.2*recencyScore + 0.1*sourceScore`

### 3.2 Stage-2（跨域）
- 先按配额抽样（默认 `50/35/15`）
- 再按 `intraScore` 全局排序（**不再乘 domain 权重**）

### 3.3 冲突选择依据（可解释）
`selected` 必须带：
- `resolutionPolicy`
- `selectionReason` in {`HIGHER_INTRA_SCORE`,`MORE_EVIDENCE`,`NEWER_FACT`,`DOMAIN_PRIORITY_OVERRIDE`}

---

## 4) Conflict Contract（补 domain 解释）

```ts
export interface ConflictCandidate {
  itemId: string;
  workspace: string;
  domain: "personal" | "group" | "shared";
  claim: string;
  score: number;
  scoreBreakdown: { simNorm: number; recency: number; source: number };
  evidence: Array<{ sourceId: string; path?: string; snippet?: string }>;
}

export interface ConflictSet {
  conflictType: "entity_version" | "relation_target" | "duplicate_cross_domain";
  key: string;
  selected: ConflictCandidate;
  candidates: ConflictCandidate[];
  resolutionPolicy: "recency_first" | "multi_source_consensus" | "domain_priority" | "unresolved";
  selectionReason: "HIGHER_INTRA_SCORE" | "MORE_EVIDENCE" | "NEWER_FACT" | "DOMAIN_PRIORITY_OVERRIDE";
}
```

---

## 5) Canonicalization 强证据参数化（防误合并）

```ts
canonicalize:
  minStrongEvidenceCount: 2
  simThresholdDefault: 0.92
  simThresholdPerson: 0.95
  simThresholdProject: 0.93
  simThresholdDoc: 0.90
  maxAutoMergePerRun: 50
```

### 5.1 规则
- 共现/编辑距离/alias 只做候选
- 自动 merge 必须满足：
  - 显式 same_as 或人工映射；
  - 或（跨 2 个独立 source + 高 sim + 同域）

“独立 source”定义：不同 `sourceId` 且不同 `file_source` 前缀。

---

## 6) same_as 脱敏字段规范（字段级）

### group 域展示 personal 关联时
- 允许：`hasPersonalLink=true`, `linkType="same_as"`
- 禁止：`path`, `snippet`, `sourceId`, `rawClaim`, `workspace`
- 展示文案：`存在私有域关联（详情受限）`

### personal 域访问 group/shared
- 可显示 group/shared 的 path/snippet（按常规权限）

---

## 7) OpenAPI 快照“使用方式”（强制）

### 7.1 快照文件
- `docs/openapi-baseline-127.0.0.1-9621.json`
- `docs/openapi-signature.lock.json`（仅保留关键路径签名）

### 7.2 强制流程
1. Step B 开始前执行 `scripts/check-openapi-signature.mjs`
2. 若签名不匹配：
   - 默认 fail-fast（阻止继续）
   - 允许 `--accept-new-signature` 显式更新并写变更记录

---

## 8) 验收补充（新增两条否定/回归）

1) 恶意 workspace 注入
- ctx=group，但请求传 `workspace=u_demo`
- 预期：`DOMAIN_WORKSPACE_DENY` + 审计记录

2) 同 session 多轮切换污染
- 同 sessionKey 连续两轮（group -> personal模拟）
- 预期：每轮独立判定，不使用过期域缓存

---

## 9) Step B 进入条件（V3）

- `DomainContext` / `AccessPolicyError` / `ConflictSet` 已入类型系统
- `deriveRequestDomain` 决策表单测覆盖
- OpenAPI signature check 脚本接入流程
- 恶意注入与多轮切换回归用例通过
