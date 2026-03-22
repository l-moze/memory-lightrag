# T7_ADAPTER_MAPPING_FINAL — Implementation-ready adapter mapping (v1)

Aligned with: `T6_ENDPOINT_PROFILE.md`

## 1) Endpoint Resolution Strategy

### Health aliases (priority order)
1. `GET /health`
2. `GET /status`
3. `POST /query` with noop payload (`{"query":"ping","top_k":1}`) as last resort

### Search aliases (priority order)
1. `POST /query`
2. `POST /search`
3. `POST /api/query`

Resolution rule:
- Probe aliases once at startup (or first call) and cache resolved path per operation.
- If cached alias fails with 404, invalidate cache and re-probe remaining aliases once.

---

## 2) Request Mapping

### Health request
- Method: `GET` (or fallback `POST` noop)
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <apiKey>` (if configured)
- Timeout: `timeoutMs` from config

### Search request
Input contract:
- `query: string` (required)
- `topK?: number`
- `minScore?: number`

Mapped payload:
```json
{
  "query": "<query>",
  "top_k": 6,
  "min_score": 0.55
}
```

Parameter precedence:
1. per-call overrides
2. plugin config defaults

---

## 3) Response Transform Table

| Source field (LightRAG-ish) | Target field | Rule |
|---|---|---|
| `text` / `content` / `chunk` | `item.content` | first non-empty |
| `score` / `similarity` / `relevance` | `item.score` | normalize to number or null |
| `id` / `doc_id` / `node_id` | `item.source` | fallback `lightrag:unknown` |
| `title` | `item.metadata.title` | optional |
| `url` / `source_url` | `item.metadata.url` | optional |
| `chunk_id` | `item.metadata.chunk` | optional |
| response header/request id | `meta.requestId` | optional |

Additional transform rules:
- Drop rows with empty `content`.
- Keep rows with null score; policy layer can filter by score later.
- Preserve source/provenance whenever available.

---

## 4) Normalized Output Contracts

### Health output
```json
{
  "healthy": true,
  "backend": "lightrag",
  "latencyMs": 123,
  "backendVersion": "optional",
  "diagnostics": []
}
```

### Search output
```json
{
  "items": [
    {
      "content": "...",
      "score": 0.78,
      "source": "doc_123",
      "metadata": {
        "title": "...",
        "url": "...",
        "chunk": "..."
      }
    }
  ],
  "meta": {
    "requestId": "optional",
    "latencyMs": 190,
    "truncated": false
  }
}
```

---

## 5) Typed Error Map

| Condition | Type | Retryable | Action hint |
|---|---|---:|---|
| Invalid URL/config parse | `BAD_CONFIG` | No | fix config and retry |
| 401/403 | `AUTH_FAILED` | No | verify api key/permissions |
| 429 | `RATE_LIMITED` | Yes | honor Retry-After / backoff |
| timeout | `TIMEOUT` | Yes | increase timeout/check backend load |
| connection refused/DNS | `BACKEND_DOWN` | Yes | check service and network |
| 5xx | `UPSTREAM_5XX` | Yes | retry then fallback |
| invalid JSON / schema mismatch | `PARSE_ERROR` | No | inspect endpoint compatibility |

Error object shape:
```json
{
  "type": "TIMEOUT",
  "message": "...",
  "httpStatus": 504,
  "retryable": true,
  "actionHint": "..."
}
```

---

## 6) Retry & Backoff Behavior

Defaults:
- `retryCount = 1`
- `retryBackoffMs = 300`
- `timeoutMs = 6000`

Retry policy:
- Retry only retryable types (`BACKEND_DOWN`, `TIMEOUT`, `UPSTREAM_5XX`, `RATE_LIMITED`).
- For 429, if `Retry-After` exists -> wait min(`Retry-After`, timeout budget cap).
- Never retry non-retryable types.

---

## 7) Fallback Behavior Contract

Trigger:
- final failure after retries for retryable errors
- immediate failure for severe config/auth/parser errors

Output requirements:
```json
{
  "fallback": true,
  "reason": "BACKEND_DOWN",
  "error": { "type": "BACKEND_DOWN", "retryable": true, "actionHint": "Switch plugins.slots.memory to memory-core if outage persists" }
}
```

Rules:
- No silent fallback.
- Always include deterministic `reason` + operator action hint.

---

## 8) Logging Fields (mandatory)

Per operation (`status`/`search`) emit:
- `operation`
- `resolvedEndpoint`
- `latencyMs`
- `httpStatus`
- `errorType` (if any)
- `retryCountUsed`
- `resultCount` (search)

This is required for QA gate evidence and postmortem comparability.
