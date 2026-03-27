# memory-lightrag

Memory search plugin for OpenClaw, backed by LightRAG with automatic fallback to builtin memory search.

## What this repo contains
- `src/` — plugin implementation
- `docs/` — documentation & evidence
- `eval/` — evaluation datasets/scripts
- `test/` — test and smoke plans
- `audit/` — audit logs (kept in place)

## Quick start
1. **Enable plugin** (OpenClaw config)
2. **Verify load**
   ```bash
   openclaw plugins inspect memory-lightrag --json
   ```
3. **Run a search**
   ```bash
   openclaw memory search --query "env-ops-standard" --json
   ```

## Release readiness
- See `docs/RELEASE_READY_STATUS_2026-03-27.md`
- Checklist: `docs/RELEASE_CHECKLIST.md`
- Evidence: `docs/archived/`

## Notes
- Gate2 evidence uses CLI deep path (`openclaw memory status --deep --json`).
- Tool payload does not expose `details` by default; see release notes for rationale.

---
Maintained by the OpenClaw memory plugin team.
