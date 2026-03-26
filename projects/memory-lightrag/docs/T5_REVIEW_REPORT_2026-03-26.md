# T5 Review Report

Date: 2026-03-26
Owner: Orchestrator (health-manager)
Related plan: `docs/T5_EXECUTION_PLAN_2026-03-26.md`

## Scope
- T5-A Policy tuning (`5e22f03`)
- T5-B Expanded replay evaluation (`db687fb`)
- T5-C Tests/Docs strengthening (`9526234`)

## Validation rerun
- `npm run verify:intent-rerank` ✅
- `npm run eval:intent-replay` ✅
- `npx tsc -p tsconfig.json` ✅

## T5 objective check
Target from plan:
- GENERAL recall >= 70%
- Overall accuracy not lower than T4 by >1.5pp

Actual (120-sample replay, T4 baseline vs T5 current):
- Accuracy: **81.67% → 80.00%** (delta **-1.67pp**) ❌
- GENERAL recall: **62.50% → 60.42%** ❌

Per-intent recall deltas:
- WHY: +0.00pp
- WHEN: -4.17pp
- ENTITY: +0.00pp
- GENERAL: -2.08pp

## Verdict
**Fail (for T5 acceptance criteria)**

Reason: T5 did not meet the planned threshold gates; it regressed both overall accuracy and GENERAL recall on expanded replay evaluation.

## What still improved
- Better boundary test coverage (boundary cases 12→19)
- Better operator documentation and troubleshooting guidance
- More realistic/larger replay dataset (44→120)

## Risks observed
1. Over-suppression of weak temporal/entity cues pushed some valid WHEN/ENTITY to GENERAL.
2. Keyword/precedence policy remains brittle for mixed-intent prompts.
3. Dataset class balance shift (GENERAL overrepresentation) exposes policy sensitivity.

## Recommended T5.1 recovery plan
1. Add confidence scoring per intent (not just hard precedence), then threshold to GENERAL only when top intent confidence is weak.
2. Introduce explicit negative patterns for report/summarize/list intents to protect GENERAL without penalizing temporal fact queries.
3. Add calibration subset (20-30 hard mixed-intent queries) as mandatory gate before full replay.
4. Keep docs/tests from T5, but gate policy rollout behind feature flag.

## Merge recommendation
- Keep `db687fb` (eval artifacts) ✅
- Keep `9526234` (tests/docs) ✅
- **Do not promote `5e22f03` to production default yet**; retain behind toggle or prepare follow-up tuning.

