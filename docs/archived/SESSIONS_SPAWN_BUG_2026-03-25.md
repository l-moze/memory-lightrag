# sessions_spawn Bug Report (2026-03-25)

## Symptom
Calling `sessions_spawn` with `runtime="subagent"` fails immediately with:

`streamTo is only supported for runtime=acp; got runtime=subagent`

## Reproduction
Minimal payload (as used from director session):
- runtime: subagent
- mode: run
- thread: false
- task: "Reply with exactly SUBAGENT_OK"

Observed result: same error, consistently.

## Impact
- Cannot dispatch subagent builders for project orchestration.
- Breaks agent-team-orchestration flow requiring subagent execution.

## Current Workaround
- Use local/manual execution path, or ACP runtime (if stable) for delegated runs.

## Notes
- Error suggests an internal layer injects/validates `streamTo` for non-ACP runtime.
- Needs platform-side fix in sessions_spawn runtime parameter handling.
