# T6_COMPAT_MATRIX — memory-lightrag vs existing memory plugins

## Purpose
Before coding, ensure `memory-lightrag` aligns with OpenClaw memory plugin conventions and CLI expectations.

## Compared Targets
- `memory-core` (baseline)
- `memory-lancedb` (enhanced reference)
- `memory-lightrag` (target)

## Manifest/Capability Compatibility

| Item | memory-core | memory-lancedb | memory-lightrag (target) | P0 Status |
|---|---|---|---|---|
| `kind: "memory"` | Yes | Yes | Yes | ✅ |
| Plugin slot activation via `plugins.slots.memory` | Yes | Yes | Yes | ✅ |
| Memory CLI ownership (`openclaw memory ...`) | Yes | Yes | Yes | ✅ |
| Health/status surface | Basic | Basic+ | Required (typed health) | ✅ |
| Search surface | Baseline | Vector-enhanced | Required (adapter-backed) | ✅ |
| Config schema validation | Basic | Advanced | Required (strict) | ✅ |
| Error typing | Limited | Better | Required typed taxonomy | ✅ |
| Fallback path to `memory-core` | Manual | Manual | Explicit contract | ✅ |

## Required `memory-lightrag` Manifest Fields (minimum)
- `id`: `memory-lightrag`
- `name`: `memory-lightrag`
- `version`: semver
- `kind`: `memory`
- `entry`: runtime entry module
- `config`: schema with defaults and bounds

## Capability Parity Checklist
- [ ] `memory status` implemented
- [ ] `memory search` implemented
- [ ] Invalid config fails early with actionable diagnostics
- [ ] Backend failures map to typed errors
- [ ] Fallback recommendation always included on retryable outages

## Non-Parity (intentional in v1)
- No auto-capture
- No consolidation/decay
- No advanced graph rerank pipeline

These are deferred by design and do not block v1 Go.

## Go/No-Go for Compatibility
- **Go** when all parity checklist items are implemented and validated by QA gates.
- **No-Go** if CLI contract differs from expected `memory status/search` behavior.
