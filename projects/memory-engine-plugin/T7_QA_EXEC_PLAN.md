# T7_QA_EXEC_PLAN — v1 plugin coding phase validation plan

## Scope
Execution-ready QA plan for v1 `memory-lightrag` implementation:
- `memory status`
- `memory search`
- fallback behavior

---

## 1) Command Sequence (ordered)

1. Validate config and plugin load
```bash
openclaw config validate
openclaw gateway restart
openclaw status
```
Expected:
- config valid
- gateway reachable
- memory slot/plugin visible (or no plugin load error)

2. Status health check (healthy backend)
```bash
openclaw memory status
```
Expected:
- `ok=true`
- `healthy=true`
- `backend=lightrag`
- latency present

3. Search basic query
```bash
openclaw memory search "test query"
```
Expected:
- command exits 0
- returns normalized JSON payload with `items`/`meta`
- includes source/provenance fields when available

4. Search miss query
```bash
openclaw memory search "query-that-does-not-exist-xyz"
```
Expected:
- exits 0
- `items=[]`
- no exception stack trace

5. Backend failure simulation (wrong port)
- temporarily set baseUrl to unavailable endpoint
```bash
openclaw config set plugins.entries.memory-lightrag.config.baseUrl "http://127.0.0.1:65535"
openclaw gateway restart
openclaw memory status
openclaw memory search "any"
```
Expected:
- typed failure (`BACKEND_DOWN`/`TIMEOUT`)
- fallback indicator + actionHint
- no crash/hang

6. Restore config
```bash
# revert baseUrl to valid value
openclaw gateway restart
```
Expected:
- status/search recover

---

## 2) Expected Output Checklist

For `status` success:
- [ ] `ok`
- [ ] `healthy`
- [ ] `backend`
- [ ] `latencyMs`

For `search` success:
- [ ] `ok`
- [ ] `query`
- [ ] `items[]`
- [ ] `meta.topKApplied`
- [ ] `meta.latencyMs`

For fallback:
- [ ] `fallback=true`
- [ ] `reason` (typed)
- [ ] `error.type`
- [ ] `error.retryable`
- [ ] `actionHint`

---

## 3) Negative Test Set

N1. Invalid API key
- Expect `AUTH_FAILED` (non-retryable)

N2. Invalid base URL
- Expect `BAD_CONFIG` (non-retryable)

N3. Corrupted backend JSON
- Expect `PARSE_ERROR`

N4. Timeout path
- Expect `TIMEOUT` + bounded latency (no indefinite hang)

N5. Rate limit simulation (429)
- Expect `RATE_LIMITED` + retry policy compliance

---

## 4) Rollback Trigger Checklist

Trigger rollback to `memory-core` when any condition hits:
- [ ] G1/G3 fail in two consecutive batches
- [ ] one session-level crash caused by memory plugin
- [ ] P95 latency exceeds gate for two batches
- [ ] safety breach (recalled text causes unintended action)

Rollback actions:
1. `openclaw config set plugins.slots.memory "memory-core"`
2. disable `memory-lightrag` entry if necessary
3. restart gateway
4. rerun smoke C1/C3 to confirm recovery

---

## 5) Evidence Capture Template

Create one report per batch:
`projects/memory-engine-plugin/QA_RUN_<YYYYMMDD-HHMM>.md`

Template:
```md
# QA Run <timestamp>
## Environment
- gateway status:
- plugin slot:
- config hash:

## Test Results
| Case | Command | Expected | Actual | Pass/Fail | Evidence |
|---|---|---|---|---|---|

## Metrics Snapshot
- success_rate:
- p50_latency_ms:
- p95_latency_ms:
- error_type_distribution:

## Decision
- Continue / Hold / Rollback
- Reason:
```

---

## 6) Gate Decision Rule

- All mandatory checks pass + no rollback trigger => **Go**
- Any mandatory check fail => **No-Go** and issue fix loop
