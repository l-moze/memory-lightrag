# IMPLEMENTATION PLAN - memory-lightrag

## Milestone 0（已完成）
- [x] 拉取 LightRAG 源码到 `workspace/projects/LightRAG`
- [x] 核对 OpenClaw memory 插件入口与 manifest 规范
- [x] 明确 `plugins.slots.memory` 激活路径

## Milestone 1（P0: 兼容层）
- [ ] 固化插件清单与入口
- [ ] `memory status` 探活与错误语义
- [ ] `memory_search` 走通 LightRAG 查询
- [ ] provenance / fallback / diagnostics 可见
- [ ] 本地 smoke test（status/search/fallback）

## Milestone 2（P1: 图写入闭环）
- [ ] 定义最小记忆对象模型：`Episode / Decision / Preference / Commitment / Incident / Source`
- [ ] after-turn ingestion：turn -> normalized memory object -> LightRAG
- [ ] `file_source` / workspace / domain policy 全链路校验
- [ ] 写入审计与幂等策略

## Milestone 3（P2: 图原生读取）
- [ ] anchor identification
- [ ] graph-aware retrieval / traversal
- [ ] evidence assembly（不是仅返回 snippets）
- [ ] query-only router 降为辅助信号，不再作为主决策

## Milestone 4（P3: 生命周期治理）
- [ ] promotion / decay / revocation
- [ ] conflict handling / supersede
- [ ] graph quality metrics
- [ ] 回归测试与文档收敛

## 验收标准
1. `openclaw memory status` 能返回插件可用状态与后端诊断。
2. `openclaw memory search "..."` 能返回带 provenance 的 LightRAG 结果。
3. 写入对象进入 LightRAG 后，可被 query/data 路径稳定命中。
4. 关闭插件时可平滑回退默认 memory 插件。
5. P2 之后必须能证明图路径优于“仅 snippets recall”的基线任务表现。
