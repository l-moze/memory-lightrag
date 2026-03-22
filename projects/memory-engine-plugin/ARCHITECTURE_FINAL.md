# ARCHITECTURE_FINAL — Memory Plugin（Single Path）

## Decision
采用 **OpenClaw Memory Plugin + LightRAG Recall Adapter** 的单一路径。

## Scope
- v1：status/search/recall budget/fallback
- 不包含：全量KG构建、复杂多后端编排、自动化治理全开

## Boundaries
1. OpenClaw session store 是唯一事实源。
2. Plugin 负责编排与注入，不接管会话系统。
3. LightRAG 作为可替换检索后端，不绑定核心生命周期。

## Responsibilities
- OpenClaw：会话管理、工具调用、slot选择
- memory plugin：recall策略、安全过滤、预算控制、指标输出
- LightRAG：检索与索引能力

## v1 Architecture
Session -> memory plugin (search) -> adapter query -> ranked recall -> safety filter -> budget trim -> prompt addition

## Fallback Strategy
- 后端异常/质量下降：
  1) 提升 minScore
  2) 降低 topK
  3) 关闭 auto-capture
  4) 切回 `plugins.slots.memory = "memory-core"`

## Rationale
该方案满足“可控、可回滚、渐进迭代”，避免一次性高复杂度引发失控。
