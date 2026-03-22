# T7_IMPLEMENTATION_NOTES — v1 plugin scaffold implementation plan

## Objective
Prepare implementation-ready scaffold for `memory-lightrag` v1 with strict scope:
- `memory status`
- `memory search`
- deterministic fallback

No business logic implementation in this step; only structure and coding plan.

---

## 1) File Tree (v1 scaffold)

```text
memory-lightrag/
  openclaw.plugin.json
  package.json
  tsconfig.json
  src/
    index.ts                  # plugin entry + registrations
    config/
      schema.ts               # config schema + defaults + parse
    adapter/
      lightrag.ts             # endpoint resolve + status/search transport
      normalize.ts            # response normalization
      errors.ts               # typed error taxonomy
    policy/
      budget.ts               # topK/minScore/budget clamp
      safety.ts               # untrusted recall handling markers
    fallback/
      contract.ts             # fallback payload builder
    types/
      contracts.ts            # status/search/fallback contracts
  test/
    smoke-plan.md             # manual smoke checklist (v1)
```

Prepared directories already created under:
`projects/memory-engine-plugin/memory-lightrag/`

---

## 2) Step-by-step Coding Plan

### Step 1 — Manifest + Entry shell
- Create `openclaw.plugin.json` (`kind: memory`, configSchema placeholder)
- Create `src/index.ts` with plugin registration skeleton:
  - memory prompt section registration
  - memory CLI registration (`memory` command surface)
  - tool registration placeholders if required by runtime

### Step 2 — Config schema module
- Implement `src/config/schema.ts`
- Include required fields and bounds from T6 contract
- Ensure parse failures are hard + actionable

### Step 3 — Typed contracts & errors
- Implement `src/types/contracts.ts` and `src/adapter/errors.ts`
- Define status/search/fallback output types and typed errors

### Step 4 — Adapter skeleton
- Implement `src/adapter/lightrag.ts` skeleton methods:
  - `checkHealth()`
  - `search()`
- Add endpoint alias resolution hooks (no heavy logic yet)

### Step 5 — Normalize & policy hooks
- Add `normalize.ts`, `budget.ts`, `safety.ts` interfaces and stubs
- Ensure flow wiring is deterministic and testable

### Step 6 — Fallback contract builder
- Implement `src/fallback/contract.ts`
- Guarantee every operational failure maps to deterministic fallback payload

### Step 7 — CLI surface wiring
- Wire `memory status` and `memory search` handlers through plugin runtime
- Keep outputs aligned with `T6_CLI_CONTRACT.md`

### Step 8 — Smoke execution
- Populate `test/smoke-plan.md` with command sequence and expected outputs
- Run C1/C3/C4 baseline checks before any advanced tests

---

## 3) Guardrails

- Do not implement auto-capture/consolidation/decay in v1.
- Do not bypass typed error map.
- Do not emit silent fallback.
- Keep recall output explicitly marked as untrusted context.

---

## 4) Ready-to-code Gate

v1 coding may start only when:
- `T7_ADAPTER_MAPPING_FINAL.md` accepted
- `T7_QA_EXEC_PLAN.md` accepted
- Director marks T7 planning as Go
