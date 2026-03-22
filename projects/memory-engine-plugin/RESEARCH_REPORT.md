# Memory Plugin 架构研究报告（可落地，不写代码）

Date: 2026-03-22  
Scope: OpenClaw 记忆系统 Plugin 层升级（选择性吸纳 LightRAG）

---

## 0) 结论先行（Executive Summary）

推荐路线：**“轻量插件 + 受控接入 LightRAG 检索能力”**。

- 不做：全量搬运 LightRAG 全家桶（KG 全流程、重服务编排、一次性全功能）
- 先做：最小可用 memory plugin（status/search）+ 严格边界 + 回退机制
- 原因：当前目标是“适合自己、可控、可回滚”，不是“最先进堆栈”

一句话：**先把记忆从“缓存堆积”升级为“可治理检索”，再逐步引入复杂能力。**

---

## 1) 约束与边界（已按你的要求）

### 目标约束
1. 仅输出可落地架构，不写实现代码。
2. 帖子/博客优先 2026 年以来；论文可放宽。
3. 选择性吸纳，避免“高级但不适配”的方案。

### 系统边界
1. OpenClaw 会话仍是主事实源（source of truth）。
2. memory plugin 负责 recall/capture 编排，不替代核心会话存储。
3. LightRAG 仅作为检索与索引能力来源，不接管整体 agent 生命周期。

---

## 2) 证据表（重点 2026+）

| 来源 | 时间 | 关键主张 | 对本项目价值 | 置信度 |
|---|---:|---|---|---|
| Moltbook: `5113ad4d` The Memory Architecture... | 2026-03 | 大多数“记忆系统”是昂贵缓存；关键是检索/巩固/衰减 | 直接定义架构目标（治理优先） | 高 |
| Moltbook: `442bbe6e` How AI Agents Actually Remember | 2026-02 | 三层记忆（daily/long-term/working）+ 低复杂度可落地 | 证明“简单分层”先于复杂引擎 | 中高 |
| Moltbook: `a959c51e` minimize hidden state | 2026-02 | 交接应是 typed artifact，减少隐式状态 | 约束 plugin 输出契约 | 高 |
| Moltbook: `37b472f9` Memory Poisoning Attacks | 2026-02 | 记忆污染可级联传播，安全要前置 | recall 注入安全边界必须做 | 中 |
| Moltbook: `696f0588` The Cost of Context | 2026-02 | 记忆成本 = token/延迟/质量三角 | 需要 recall budget + 指标化 | 高 |
| Moltbook: `ebd0c329` OpenClaw memory guide | 2026-02 | 捕获/检索/衰减需分策略 | 与官方实现方向一致 | 中 |
| OpenClaw docs: `docs/cli/memory.md` | 官方 | `openclaw memory` 由 active memory plugin 提供 | 明确插件接入点 | 高 |
| OpenClaw source: `memory-core`, `memory-lancedb` | 官方 | `kind: "memory"` + `plugins.slots.memory` | 明确插件形态与契约 | 高 |
| arXiv 2410.05779 LightRAG | 2024 | 轻量但有效的检索增强框架 | 可借鉴检索层能力 | 中高 |
| arXiv 2310.08560 MemGPT | 2023 | 将长期记忆与工作上下文分层管理 | 支持“分层+预算”的结构化设计 | 高 |
| arXiv 2308.15022 Recursively Summarizing... | 2023 | 递归总结可缓解长对话记忆衰减 | 可作为后续 consolidation 候选 | 中高 |

---

## 3) 方案筛选矩阵（Adopt / Defer / Reject）

### Adopt（现在吸纳）
1. **最小插件化入口**：`plugins.slots.memory` + 标准 memory CLI 接口
2. **检索优先**：先把 recall 做对（top-k、score、budget）
3. **安全防线**：回忆内容视为不可信文本（禁止当指令执行）
4. **可观测性**：记录 hit/miss、延迟、token 成本、误召回
5. **分层记忆策略**：working / episodic / semantic（先轻量规则）

### Defer（后续迭代）
1. 全量知识图谱构建与实体关系持续维护
2. 全链路 reranker + 多后端混合存储
3. 复杂自治策略（自动晋升/自动清洗全自动）

### Reject（当前不采用）
1. 一次性全功能上线（高复杂度，高失控风险）
2. 让外部记忆引擎替代 OpenClaw 核心会话事实源
3. 把 recalled memory 当“可执行指令”处理

---

## 4) 推荐架构（适配当前系统）

### 4.1 目标架构（文字版）

OpenClaw Session Store（事实源）
  -> Memory Plugin（orchestration）
      -> Recall Adapter（可接 LightRAG）
      -> Safety Filter（注入/污染防护）
      -> Budget Controller（top-k/score/chars）
      -> Metrics Emitter（质量与成本）

### 4.2 职责边界
- OpenClaw：消息生命周期、会话存储、工具系统
- memory plugin：检索编排、回忆注入、策略开关、可观测
- LightRAG：检索与索引能力（可替换后端）

### 4.3 运行原则
1. recall 前置，但预算受控
2. recall 结果必须可追溯（source/provenance）
3. recall 失败可降级（回到 memory-core/file memory）
4. 任何自动 capture 都要可关闭

---

## 5) 分阶段落地建议（不写代码）

### v1（2周）—— 可用且可控
- 目标：只做 status/search + recall 注入 + 预算控制
- 验收：
  - `memory status` 可探活
  - `memory search` 有稳定结果
  - recall 失败可降级

### v2（2-4周）—— 增强稳定性
- 目标：引入受控 auto-capture（阈值、去重、批量写）
- 验收：
  - capture 噪音率下降
  - 延迟/成本可接受

### v3（4周+）—— 治理成熟
- 目标：consolidation + decay + 风险预警记忆
- 验收：
  - 误召回降低
  - 长期一致性提升

---

## 6) 风险与回滚

### 主要风险
1. 检索误召回导致错误决策
2. 记忆污染（poisoning）进入回忆链路
3. 引入复杂度过早，运维失控

### 回滚策略
1. `plugins.slots.memory` 切回 `memory-core`
2. 关闭 auto-capture，仅保留 search
3. 提高 minScore / 降低 top-k / 收紧 budget

---

## 7) 成功指标（必须量化）

1. Recall 命中率（用户问“之前说过什么”时）
2. 误召回率（回忆错误/无关比例）
3. 平均附加 token 成本
4. 平均检索延迟
5. 任务连续性提升（重复询问/重复决策减少）

---

## 8) 最终建议（给当前阶段）

你现在最该做的，不是追求“最先进记忆引擎”，而是：

- 先把 **插件边界、预算控制、安全防线、降级能力** 做扎实；
- 再按指标引入 LightRAG 的更高级能力。

这条路线最符合“适合自己、可控可迭代”的要求。
