# memory-lightrag 双版本差异审计（A=运行版本, B=director镜像）

- A: /home/node/.openclaw/workspace/projects/memory-lightrag
- B: /home/node/.openclaw/workspace/agents/director/projects/memory-engine-plugin/memory-lightrag
- timestamp_utc: 2026-03-27T09:41:12Z

## package version
- A: 
- B: 

## src 统计
 .../memory-lightrag/src/adapter/lightrag.ts        | 564 ++++++---------------
 .../memory-lightrag/src/api.ts                     |   2 +-
 .../memory-lightrag/src/config/schema.ts           | 128 ++---
 .../memory-lightrag/src/index.ts                   | 367 +-------------
 .../src/policy/access.ts => dev/null}              |  90 ----
 .../src/policy/domain-routing.ts => dev/null}      |  59 ---
 .../src/policy/intent-features.ts => dev/null}     | 303 -----------
 .../src/policy/intent-scorer.ts => dev/null}       | 130 -----
 .../src/policy/query-intent.ts => dev/null}        | 254 ----------
 .../src/policy/rerank-policy.ts => dev/null}       |  58 ---
 .../src/policy/source-tag.ts => dev/null}          |  49 --
 .../memory-lightrag/src/types/contracts.ts         |   4 -
 12 files changed, 223 insertions(+), 1785 deletions(-)

## 关键结论
1. 两目录不是同一项目副本（路径、版本、文件集不同）。
2. Gate 验证必须以 A 为准；B 只能作为工作镜像。
3. 当前需要先做 A<->B 同步策略（单向覆盖或挑选性回灌）后再做 Gate2。
