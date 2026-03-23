# TOOLS.md - Local Operator Cheat Sheet

Purpose: fast, **repeatable** operations for this workspace.

> Keep this file practical. If a note can save 5+ minutes in incident handling, put it here.

---

## 1) Workspace & Paths

- Main workspace: `/home/node/.openclaw/workspace/agents/director`
- OpenClaw global config: `/home/node/.openclaw/openclaw.json`
- ACP extension path: `/app/extensions/acpx`
- ACP binary used by runtime: `/app/extensions/acpx/node_modules/.bin/acpx`
- Codex ACP stream logs:
  - `/home/node/.openclaw/agents/codex/sessions/*.acp-stream.jsonl`

---

## 2) High-Value Commands (copy/paste)

### OpenClaw basic health

```bash
openclaw status
```

### Check acpx version actually installed

```bash
/app/extensions/acpx/node_modules/.bin/acpx --version
```

### ACP codex smoke test

```bash
cd /home/node/.openclaw/workspace/agents/director
/app/extensions/acpx/node_modules/.bin/acpx --verbose --format quiet --timeout 120 codex exec "Reply with ACP_OK only"
```

### Inspect latest codex ACP stream events

```bash
tail -n 120 /home/node/.openclaw/agents/codex/sessions/*.acp-stream.jsonl
```

---

## 3) ACP / Codex Known Pitfalls (important)

### Symptom A
- `codex run failed: acpx exited with code 1`
- no agent output / stalled 60s

### Root causes seen locally
1. `OPENAI_BASE_URL=https://api.siliconflow.cn/v1` → codex-acp hits `/responses` on SiliconFlow and gets **404**.
2. Unsetting base URL falls back to OpenAI, but local `OPENAI_API_KEY` may be invalid for OpenAI → **401**.
3. Switching to other proxy URL without matching key → **401 Invalid API key**.

### Quick diagnosis
- Run verbose acpx test and read exact upstream URL/status in stderr.
- Confirm env presence (mask secrets):

```bash
node -e "for (const k of ['OPENAI_BASE_URL','OPENAI_API_KEY','CODEX_PROXY_URL','CODEX_PROXY_KEY','SILICONFLOW_API_KEY']) console.log(k, process.env[k]?'<set>':'<unset>')"
```

### Rule
- When ACP fails, **report exact URL + HTTP code + one-line root cause** before proposing fixes.

---

## 4) memory-lightrag Local Notes

### Current plugin signal
- Warning may appear:
  - `memory-lightrag: loaded without install/load-path provenance`
- Treat as **trust/provenance warning**, not immediate runtime failure.

### Relevant project docs
- `projects/memory-engine-plugin/memory-lightrag/docs/memory-ontology.md`
- `projects/memory-engine-plugin/memory-lightrag/docs/LIGHTRAG_API_REFERENCE.md`
- `projects/memory-engine-plugin/T6_ADAPTER_TASK.md`
- `projects/memory-engine-plugin/T6_ENDPOINT_PROFILE.md`
- `projects/memory-engine-plugin/T6_COMPAT_MATRIX.md`

### Source trees available locally
- `/home/node/.openclaw/workspace/projects/LightRAG`
- `/home/node/.openclaw/workspace/projects/graphrag/LightRAG`

---

## 5) Execution Style Reminders (from user preference)

- For **clear single-point issues**: do the minimal direct fix first; don’t over-design generic plans.
- For uncertain incidents: evidence first, then action.
- Prefer one-variable-at-a-time changes.
- Always leave a trace: what changed, why, evidence, rollback path.

---

## 6) Change Log

- 2026-03-23: upgraded TOOLS.md from template to operational runbook (ACP diagnostics + memory-lightrag notes + command snippets).
