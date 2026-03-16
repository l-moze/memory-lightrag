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
