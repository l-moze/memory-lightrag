# Release Checklist (memory-lightrag)

## 1) Preconditions
- [ ] `openclaw plugins inspect memory-lightrag --json` shows `status: loaded`
- [ ] `diagnostics: []`
- [ ] memorySearch embeddings probe OK (`openclaw memory status --deep --json`)

## 2) Gate Verification
- [ ] Gate1 PASS (plugins inspect)
- [ ] Gate2 PASS (CLI deep evidence)
- [ ] Gate3 PASS (diagnostics empty)

## 3) Artifacts
- [ ] Evidence files archived under `docs/archived/`
- [ ] Gate summary present: `docs/archived/GATE_SUMMARY_2026-03-27.md`
- [ ] Release ready page updated: `docs/RELEASE_READY_STATUS_2026-03-27.md`

## 4) Regression Safety
- [ ] Run `openclaw memory search --query <smoke>` and confirm results
- [ ] Validate fallback (force lightrag baseUrl invalid for one run, then restore)

## 5) Final
- [ ] Commit docs changes
- [ ] Push to master (subtree split)
