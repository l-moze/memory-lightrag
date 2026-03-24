# LEARNINGS

## [LRN-20260316-001] correction

**Logged**: 2026-03-16T05:55:00Z
**Priority**: high
**Status**: pending
**Area**: config

### Summary
OpenClaw runtime model was misreported; must trust `openclaw status`/runtime header.

### Details
Assistant claimed current model was deepseek/deepseek-chat, but runtime header shows active model is daiju/gpt-5.2 for this session.

### Suggested Action
When asked “当前用哪个模型”，answer with runtime header value (or `openclaw status --json` session entry), not a guessed default/fallback.

### Metadata
- Source: user_feedback
- Tags: model, runtime, correctness

---

## [LRN-20260324-001] best_practice

**Logged**: 2026-03-24T23:10:30Z
**Priority**: high
**Status**: pending
**Area**: config

### Summary
If `tools.allow` is set, it acts as a hard tool allowlist; `tools.web.fetch.enabled=true` alone does not guarantee `web_fetch` is usable.

### Details
User reported "webfetch 明明开启了，之前都能用". Investigation showed config had:
- `tools.web.fetch.enabled=true`
- but `tools.allow` did not include `web_fetch` nor `group:web`.

In restrictive allowlist mode, missing entries silently block tool calls even if the tool is enabled in its own config section. This can look like the agent "抽风".

Also note: per-agent `tools.profile: full` (e.g., health-manager) does not necessarily bypass global `tools.allow` restrictions.

### Suggested Action
- When diagnosing "tool suddenly unavailable", always check both:
  - `tools.allow` / `tools.deny`
  - tool-specific `tools.web.*.enabled`
- Prefer using `group:web` when enabling both `web_search` + `web_fetch` for research workflows.
- Consider documenting this in TOOLS.md as a recurring gotcha.

### Metadata
- Source: conversation
- Tags: tools.allow, tool_policy, web_fetch, debugging
- Pattern-Key: config.tools_allow_overrides_enabled
- Recurrence-Count: 1
- First-Seen: 2026-03-24
- Last-Seen: 2026-03-24

---
