# LightRAG API Reference (for memory-lightrag integration)

Scope: **status/search-related endpoints only** for OpenClaw memory plugin integration.

Source basis (local code):
- `lightrag/api/lightrag_server.py`
- `lightrag/api/routers/query_routes.py`
- `lightrag/api/README.md`

> This doc is extracted from local LightRAG source, not guessed from external snippets.

---

## 1) Health / status endpoint

## Endpoint
- `GET /health`

## Evidence
- Route declaration and docs metadata: `lightrag/api/lightrag_server.py` around `@app.get("/health")` (lines ~1213+).
- Handler function `get_status(request: Request)` returns health/config payload (same section).

## Auth
- Protected by combined auth dependency:
  - `dependencies=[Depends(combined_auth)]`
- If auth/API key enabled, caller must provide valid auth token/key.

## Response shape (200)
```json
{
  "status": "healthy",
  "webui_available": true,
  "working_directory": "...",
  "input_directory": "...",
  "configuration": {
    "llm_binding": "...",
    "llm_model": "...",
    "embedding_binding": "...",
    "embedding_model": "...",
    "workspace": "...",
    "enable_rerank": true
  },
  "auth_mode": "enabled|disabled",
  "pipeline_busy": false,
  "keyed_locks": {...},
  "core_version": "...",
  "api_version": "...",
  "webui_title": "...",
  "webui_description": "..."
}
```

## Error behavior
- On handler exception: `HTTPException(status_code=500, detail=str(e))`
- Therefore plugin should treat non-2xx as backend failure.

---

## 2) Search endpoint (text answer)

## Endpoint
- `POST /query`

## Evidence
- Route in `lightrag/api/routers/query_routes.py` at `@router.post("/query")`.
- Request model `QueryRequest` declared in same file.

## Request body (core fields)
```json
{
  "query": "string(min_length=3)",
  "mode": "local|global|hybrid|naive|mix|bypass",
  "top_k": 10,
  "chunk_top_k": 10,
  "include_references": true,
  "include_chunk_content": false,
  "enable_rerank": true,
  "stream": true
}
```

Notable flags from source:
- `include_references` default `true`
- `include_chunk_content` default `false` (works with references)
- `enable_rerank` optional, default behavior controlled by server config

## Response (200)
- Model: `QueryResponse`
```json
{
  "response": "...",
  "references": [
    {"reference_id": "1", "file_path": "/path/doc"}
  ]
}
```
- With `include_chunk_content=true`, references may include `content: string[]`.

## Error behavior
- Invalid payload:
  - FastAPI validation error (typically 422 for non-`/query/data` path)
  - docs also describe 400 invalid parameter cases
- Runtime exception: handler catches and returns `HTTPException(500, detail=str(e))`.

---

## 3) Search endpoint (streaming)

## Endpoint
- `POST /query/stream`

## Evidence
- Route in `query_routes.py` at `@router.post("/query/stream")`.

## Response transport
- `Content-Type: application/x-ndjson`
- Streaming chunks:
  - first optional references line
  - subsequent response chunks
  - error line possible: `{"error":"..."}`

Example stream pattern:
```ndjson
{"references":[{"reference_id":"1","file_path":"/doc"}]}
{"response":"chunk1"}
{"response":"chunk2"}
```

## Error behavior
- Stream may emit partial content then error chunk.
- Non-stream handler exceptions -> HTTP 500.

---

## 4) Search endpoint (structured retrieval data) — **recommended for memory-lightrag**

## Endpoint
- `POST /query/data`

## Why recommended
This endpoint returns structured retrieval artifacts (entities/relationships/chunks/references), which directly supports ontology-based memory results.

## Evidence
- Route in `query_routes.py` at `@router.post("/query/data")`.
- Response model `QueryDataResponse` in same file.
- Global validation special-case in `lightrag_server.py` for `/query/data`.

## Request body
- Uses same `QueryRequest` schema as `/query`.

## Success response shape
```json
{
  "status": "success",
  "message": "Query executed successfully",
  "data": {
    "entities": [
      {
        "entity_name": "...",
        "entity_type": "...",
        "description": "...",
        "source_id": "...",
        "file_path": "...",
        "reference_id": "..."
      }
    ],
    "relationships": [
      {
        "src_id": "...",
        "tgt_id": "...",
        "description": "...",
        "keywords": "...",
        "weight": 0.85,
        "source_id": "...",
        "file_path": "...",
        "reference_id": "..."
      }
    ],
    "chunks": [
      {
        "content": "...",
        "file_path": "...",
        "chunk_id": "...",
        "reference_id": "..."
      }
    ],
    "references": [
      {"reference_id": "...", "file_path": "..."}
    ]
  },
  "metadata": {
    "query_mode": "mix",
    "keywords": {"high_level": [], "low_level": []},
    "processing_info": {...}
  }
}
```

## Validation & error behavior
- Special RequestValidationError handler in `lightrag_server.py`:
  - For `/query/data`, validation returns **HTTP 400** with normalized body:
  ```json
  {
    "status": "failure",
    "message": "Validation error: ...",
    "data": {},
    "metadata": {}
  }
  ```
- Runtime exception in route handler returns `HTTP 500 {"detail": "..."}`.

---

## 5) Error-handling guidance for adapter

For `memory-lightrag` adapter mapping:
- Non-2xx HTTP -> map to typed backend error (`UPSTREAM_5XX` or auth/config variant if identifiable).
- `/query/data` returns `status:"failure"` with 400 on validation -> map to `BAD_CONFIG` / `PARSE_ERROR` depending on request source.
- Network/timeout exceptions -> `BACKEND_DOWN` / `TIMEOUT`.

Practical mapping suggestion:
- HTTP 400 from `/query/data` with `status=failure` -> `BAD_CONFIG`
- HTTP 401/403 -> `AUTH_FAILED`
- HTTP 429 -> `RATE_LIMITED`
- HTTP >=500 -> `UPSTREAM_5XX`
- thrown timeout -> `TIMEOUT`

---

## 6) Integration recommendations (status/search)

1. `status` command should call `GET /health`.
2. `search` should prefer `POST /query/data` to get structured entities/relations/sources.
3. Keep fallback parser for legacy `items[]/results[]` style payloads to maximize compatibility.
4. Keep `mode` default to `mix` unless caller overrides.

---

## Appendix: key source anchors
- `lightrag/api/lightrag_server.py`
  - Request validation handler for `/query/data`
  - `GET /health` endpoint
- `lightrag/api/routers/query_routes.py`
  - `QueryRequest`, `QueryResponse`, `QueryDataResponse`
  - `POST /query`, `POST /query/stream`, `POST /query/data`
- `lightrag/api/README.md`
  - endpoint semantics and `include_chunk_content` notes
