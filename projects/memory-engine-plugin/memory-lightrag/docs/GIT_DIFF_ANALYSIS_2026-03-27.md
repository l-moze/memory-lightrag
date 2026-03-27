# memory-lightrag 双版本 Git 差异分析

timestamp_utc: 2026-03-27T09:57:57Z
A: /home/node/.openclaw/workspace/projects/memory-lightrag
B: /home/node/.openclaw/workspace/agents/director/projects/memory-engine-plugin/memory-lightrag

## 1) Git 仓库归属
- A top-level: /home/node/.openclaw/workspace
- B top-level: /home/node/.openclaw/workspace/agents/director
- A branch: master
- B branch: master

## 2) 最近提交（各自视角）
### A log -n 5
a3f2234 memory-lightrag: add scored-routing profiles and telemetry; refresh eval reports
6f411df memory-lightrag: add scored routing config controls
5e83706 docs(memory-lightrag): update T5.1-R2 implementation plan boundaries
2a67db5 docs(memory-lightrag): add Director route alignment and landing plan
220b333 docs(eval): add AS-IS time tag to replay and calibration result reports
### B log -n 5
7ee492f docs(memory-lightrag): land final alignment package and unified gate
2c3d104 feat(env): v1.3.1 add commentPattern enforcement and help command
1b035e7 docs(env): add env key naming/comment reference and link from skill
b662599 feat(env): enforce key naming and mandatory comments for new env keys
df17204 feat(env): v1.3 lightweight hardening (strict doctor, stale-lock recovery, audit)

## 3) 关键文件 blob 指纹（git hash-object）
- package.json
  - A: d0e4019b3b4d7e791a1548f449b23865f0c07d62
  - B: 8514778b9f8e5904dae26425980333bb63191859
- src/index.ts
  - A: 809bfe4f3bbfebc2a8d6feca457a5607125117fb
  - B: b0cd53f882b18a28bc522db089055f251f6a90d7
- src/adapter/lightrag.ts
  - A: 128cc000d0b0a3c516f243c0b32046afe9331bc3
  - B: 1f1de0eb09bb7aaa3e8f8ce1bfacd0d58d07cb6d
- src/config/schema.ts
  - A: 67d63e5a434ba668c943eabe63932b1ae09e741b
  - B: 87434ff557e3c1833db24587d078944e95d94726

## 4) 代码差异统计（git --no-index）
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

## 5) 结论
1. A 与 B 处于同一大仓（top-level 相同），但并非同一路径副本。
2. 关键文件 blob 指纹全部不同，确认是不同版本实现。
3. Gate 验证必须以运行路径 A 为准；B 仅能作为镜像/工作分支参考。
