---
name: env-ops-standard
description: Safe .env key-first operations (CRUD) with secret-safe defaults. Use when troubleshooting missing env keys, auth/config failures, or when asked to add/update/remove/list .env entries. Always list/check keys first and never expose secret values unless the user explicitly requests it.
---

# env-ops-standard

Enforce a **Key-First SOP** for `.env` management.

## Workflow (mandatory)

1. Run key discovery first (no values):
   - `node {baseDir}/scripts/envsafe.js --file <ENV_FILE> keys`
2. Confirm target key exists/does not exist:
   - `node {baseDir}/scripts/envsafe.js --file <ENV_FILE> exists KEY`
3. Then perform write operation only if needed:
   - set/update: `set`
   - delete: `unset`
4. Validate after every write:
   - `node {baseDir}/scripts/envsafe.js --file <ENV_FILE> lint`

## Safety rules

- Default env file: `/home/node/.openclaw/.env` unless user specifies otherwise.
- Never print `.env` full content.
- Never print raw secret values in chat/logs.
- Prefer `--stdin` for `set` to avoid leaking values in shell history.
- `unset` is destructive; confirm intent if user did not explicitly ask to remove key.

## Commands

- List keys (no values):
  - `node {baseDir}/scripts/envsafe.js --file /home/node/.openclaw/.env keys`
- Check key exists:
  - `node {baseDir}/scripts/envsafe.js --file /home/node/.openclaw/.env exists OPENAI_API_KEY`
- Set/update key (safe stdin):
  - `printf '%s' 'NEW_VALUE' | node {baseDir}/scripts/envsafe.js --file /home/node/.openclaw/.env set OPENAI_API_KEY --stdin`
- Remove key:
  - `node {baseDir}/scripts/envsafe.js --file /home/node/.openclaw/.env unset OPENAI_API_KEY`
- Lint format/duplicates:
  - `node {baseDir}/scripts/envsafe.js --file /home/node/.openclaw/.env lint`

## Output contract

- `keys`: one key per line
- `exists`: prints `present` or `missing`
- `set`/`unset`: prints changed count + backup file path
- `lint`: prints `OK` if clean; otherwise prints findings and exits non-zero
