# T3 审核报告（Agent Team Orchestration）

- 日期：2026-03-26
- 审核人：Orchestrator（health-manager）
- 关联计划：`docs/AGENT_ORCHESTRATION_PLAN_2026-03-26.md`
- 审核对象：
  - Builder-A: `5aae73a`（intent + rerank policy）
  - Builder-B: `9fc1271`（intent/rerank 验证脚本）
  - 依赖基线：`41aa34b`, `70b506b`

---

## 1) 审核目标与范围

本次 T3 审核目标：确认 PR-3（规则版 intent-aware）满足“可落地、可回归、可兼容”。

审核范围：
1. 功能正确性（intent 分类与权重策略）
2. 兼容性（对既有 memory_search 行为是否破坏）
3. 可测试性（是否具备可执行验证）
4. 风险与上线建议

非范围：
- 学习式 router
- 高阶图遍历策略
- 异步 consolidation

---

## 2) 交付物核验

## 2.1 Builder-A（commit: `5aae73a`）

### 文件变更
- `src/policy/query-intent.ts`（新增）
- `src/policy/rerank-policy.ts`（新增）
- `src/index.ts`（修改）

### 关键实现核验
- `QueryIntent` 类型齐全：`WHY | WHEN | ENTITY | GENERAL`
- `detectQueryIntent()`：中英关键词规则识别，优先级 `WHY → WHEN → ENTITY → GENERAL`
- `getRerankWeights()`：返回稳定数值；存在 finite 保护，避免 NaN/Infinity 扩散
- `index.ts` 中接入方式为 additive：新增 `details.ontologyPolicy`，不改变 `content` 主结构

结论：**通过**

---

## 2.2 Builder-B（commit: `9fc1271`）

### 文件变更
- `package.json`（新增 `verify:intent-rerank`）
- `test/intent-rerank.verify.mjs`（新增）
- `test/smoke-plan.md`（新增）

### 关键实现核验
- 覆盖 4 类 intent：WHY/WHEN/ENTITY/GENERAL
- 验证权重字段均为 finite number
- 验证策略方向：
  - WHY: causal > temporal/entity
  - WHEN: temporal > causal/entity
  - ENTITY: entity > causal/temporal
  - GENERAL: 权重均衡

结论：**通过**

---

## 3) Gate 审核结果

| Gate | 条件 | 结果 |
|---|---|---|
| Gate-1 Build | `npx tsc -p tsconfig.json` | ✅ Pass |
| Gate-2 Behavior | intent 分类与权重方向正确 | ✅ Pass |
| Gate-3 Compatibility | `memory_search` 主输出不破坏 | ✅ Pass |
| Gate-4 Audit | 独立审查结论 | ✅ Pass with minor notes |

验证命令：
- `npx tsc -p tsconfig.json` ✅
- `npm run verify:intent-rerank` ✅

---

## 4) 发现的问题与不足（Minor）

1. **规则匹配误判边界**
   - `ENTITY` 规则含 `what/什么`，在复杂句中可能与 GENERAL 混淆。
   - 影响：中低；可通过后续样本驱动词表收敛。

2. **运行时依赖特性**
   - 验证脚本依赖 Node `--experimental-strip-types`。
   - 影响：中（低版本 Node 兼容性风险）。

3. **细节字段扩展风险**
   - `details.ontologyPolicy` 是新增字段，通常兼容，但若下游“严格白名单校验 details 键名”可能需要同步更新。
   - 影响：低。

---

## 5) 上线与合并建议

## 5.1 建议合并顺序
1. `41aa34b` — graph-preserving adapter
2. `70b506b` — type normalization + filtering observability
3. `5aae73a` — intent + rerank policy
4. `9fc1271` — verification script

## 5.2 灰度建议
- 首先在测试/灰度环境开启，观察：
  - `details.ontology.filtering.sources.dropRate`
  - intent 分布（WHY/WHEN/ENTITY/GENERAL）
  - 回答质量是否对 WHY/WHEN 有提升

## 5.3 回滚点
- 若出现异常可按 commit 逆序回滚：
  - 先回滚 `9fc1271`（测试不影响运行）
  - 再回滚 `5aae73a`（恢复无 intent policy）
  - 如需彻底恢复旧路径，再回滚 `70b506b` / `41aa34b`

---

## 6) 最终审核结论

**结论：Pass with minor notes（可合并）**

理由：
- 需求范围内功能已完整落地；
- 编译与验证均通过；
- 改动保持 backward-compatible；
- 风险已识别且具备清晰回滚路径。

---

## 7) 下一步建议（T4 候选）

1. 把 intent 规则从关键词升级为“规则+统计”混合路由（减少边界误判）
2. 为 `details.ontologyPolicy` 与 `details.ontology.filtering` 增加文档 schema 说明
3. 追加 30~50 条真实 query 回放，形成 intent 误判基线

