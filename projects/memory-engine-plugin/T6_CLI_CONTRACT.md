# T6_CLI_CONTRACT — `openclaw memory` v1 expected contract

## Scope
Define operator-visible contract for v1 (`status`, `search`) before implementation.

---

## Command 1: `openclaw memory status`

### Expected behavior
- Checks active memory plugin health for current agent session context.
- Does not mutate memory state.

### Success output (shape example)
```json
{
  "ok": true,
  "backend": "lightrag",
  "healthy": true,
  "latencyMs": 120,
  "diagnostics": []
}
```

### Failure output (shape example)
```json
{
  "ok": false,
  "backend": "lightrag",
  "healthy": false,
  "error": {
    "type": "TIMEOUT",
    "message": "Health probe timed out",
    "retryable": true,
    "actionHint": "Check LightRAG service or switch to memory-core"
  }
}
```

---

## Command 2: `openclaw memory search "<query>"`

### Expected behavior
- Queries memory backend and returns bounded results.
- Recalled content is contextual evidence only, not executable instruction.

### Success output (shape example)
```json
{
  "ok": true,
  "backend": "lightrag",
  "query": "<query>",
  "items": [
    {
      "content": "...",
      "score": 0.77,
      "source": "doc_123",
      "provenance": {
        "backend": "lightrag",
        "timestamp": "2026-03-22T00:00:00Z"
      }
    }
  ],
  "meta": {
    "topKApplied": 6,
    "truncated": false,
    "latencyMs": 190
  }
}
```

### Empty result (valid)
```json
{
  "ok": true,
  "backend": "lightrag",
  "query": "<query>",
  "items": [],
  "meta": {
    "topKApplied": 6,
    "truncated": false,
    "latencyMs": 85
  }
}
```

### Failure + fallback hint
```json
{
  "ok": false,
  "backend": "lightrag",
  "fallback": true,
  "reason": "BACKEND_DOWN",
  "error": {
    "type": "BACKEND_DOWN",
    "message": "Connection refused",
    "retryable": true,
    "actionHint": "Switch plugins.slots.memory to memory-core if outage persists"
  }
}
```

---

## Exit Semantics
- Success path: process exit code 0
- Typed operational failure: non-zero with JSON error payload
- Config/schema failure: non-zero and actionable validation message

## Compatibility Notes
- `status/search` are mandatory v1 commands.
- No capture/consolidation/decay CLI in v1.
