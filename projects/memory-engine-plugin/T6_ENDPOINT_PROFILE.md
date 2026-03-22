# T6_ENDPOINT_PROFILE — LightRAG v1 endpoint mapping profile

## Goal
Eliminate endpoint ambiguity for v1 implementation.

## Profile Name
`lightrag-v1-default`

## Base Config
- `baseUrl`: required (e.g., `http://127.0.0.1:9621`)
- `apiKey`: optional
- `timeoutMs`: 6000
- `retryCount`: 1

## Endpoint Alias Map

### Health probe (ordered)
1. `GET /health`
2. `GET /status`
3. `POST /query` with noop payload as last-resort probe

Probe success:
- HTTP 2xx + parseable response

### Search endpoint
Primary:
- `POST /query`

Alternate aliases (deployment variants):
- `POST /search`
- `POST /api/query`

## Normalized Search Request
```json
{
  "query": "<text>",
  "top_k": 6,
  "min_score": 0.55
}
```

## Normalized Search Response
```json
{
  "items": [
    {
      "content": "...",
      "score": 0.78,
      "source": "doc_or_node_id",
      "metadata": {
        "title": "...",
        "url": "...",
        "chunk": "..."
      }
    }
  ],
  "meta": {
    "requestId": "optional",
    "latencyMs": 123,
    "truncated": false
  }
}
```

## Error Mapping Profile
- 401/403 -> `AUTH_FAILED`
- 429 -> `RATE_LIMITED`
- 500/502/503/504 -> `UPSTREAM_5XX`
- Timeout -> `TIMEOUT`
- Connection/DNS -> `BACKEND_DOWN`
- Parse failure -> `PARSE_ERROR`
- Invalid URL/params -> `BAD_CONFIG`

## Retry Policy Profile
- Retryable: `BACKEND_DOWN`, `TIMEOUT`, `UPSTREAM_5XX`, `RATE_LIMITED`
- Non-retryable: `BAD_CONFIG`, `AUTH_FAILED`, `PARSE_ERROR`
- Backoff: linear 300ms (single retry)

## Fallback Hint Profile
On typed retryable failure:
- return `fallback=true`
- include `actionHint` with exact operator action:
  - "Switch `plugins.slots.memory` to `memory-core` if outage persists"

## v1 Constraint
If no health/search endpoint alias resolves, abort with `BAD_CONFIG` and endpoint checklist message.
