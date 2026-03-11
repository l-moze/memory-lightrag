## [LRN-20260311-001] correction

**Logged**: 2026-03-11T10:29:45Z
**Priority**: high
**Status**: pending
**Area**: tooling

### Summary
When upstream model endpoints become unstable, stop prolonged waiting/probing and pivot to an alternative path; earlier success doesn't guarantee current availability.

### Details
- I previously validated daiju `https://api.daiju.live/v1/chat/completions` could succeed for `llama3.1-8B` with a specific API key.
- Later, the same endpoint returned persistent 502, blocking the cleaning pipeline.
- User pointed out we should not waste time on an impossible/blocked task; should re-check assumptions (endpoint correctness) quickly, then switch to a viable fallback (e.g., deepseek/dashscope/local ollama) to keep project momentum.

### Suggested Action
- Implement a time-boxed health check (e.g., 2-3 attempts, <60s). If failing, automatically pivot to configured fallback.
- Prefer operational progress over strict provider choice when the provider is down.
- Communicate clearly: what changed (endpoint status), what we will do next, and what remains pending.

### Metadata
- Source: user_feedback
- Tags: graphrag, cleaning, reliability, failover, timeboxing
- Pattern-Key: harden.timebox_external_dependency
- Recurrence-Count: 1
---
