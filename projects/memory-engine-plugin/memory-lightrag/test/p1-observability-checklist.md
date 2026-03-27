# P1 Observability E2E Checklist (memory-lightrag)

## Goal
Verify `memory_search` returns unified details fields in real agent/tool execution path.

## Preconditions
- `openclaw plugins inspect memory-lightrag --json` shows loaded/tools/cli.
- LightRAG endpoint reachable at `http://lightrag:9621`.

## Case 1: LightRAG success path
1. Send an agent message that forces tool call:
   - `请调用 memory_search，query=env-ops-standard，只返回JSON(details)`
2. Capture tool result details.
3. Expect fields:
   - `backend: "lightrag"`
   - `fallback: false`
   - `activeBackend: "lightrag"`
   - `requestId` present
   - `latencyMs` number

## Case 2: Fallback path
1. Temporarily set wrong LightRAG endpoint in plugin config (`lightrag.baseUrl`).
2. Repeat the same tool-call forcing prompt.
3. Expect fields:
   - `backend: "memory_search"`
   - `fallback: true`
   - `activeBackend: "builtin-fallback"`
   - `reason` in `{BACKEND_DOWN,TIMEOUT,UPSTREAM_4XX,UPSTREAM_5XX,EMPTY_RESULT}`
   - `requestId` present
   - `latencyMs` number

## Known blocker in current environment (2026-03-24)
- `openclaw agent --local` e2e validation is blocked by:
  - `session file locked (timeout 10000ms): /home/node/.openclaw/agents/director/sessions/<main>.jsonl.lock`
- This blocks model execution before tool invocation; not a plugin logic failure.

## Temporary workaround
- Run verification from a non-contended session (separate process/user) or after lock clears.
- Alternatively use ACP/openclaw runtime once backend stabilizes.
