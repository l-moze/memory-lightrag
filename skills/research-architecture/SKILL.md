---
name: research-architecture
description: Structured deep research and architecture design workflow. Use when the user asks for deep investigation, technical tradeoff analysis, or controlled architecture planning before implementation.
metadata: {"openclaw":{"emoji":"🧭"}}
---

# Research + Architecture Skill

## When to use
- User asks for deep research before coding
- User says current plan is fragmented/uncontrolled
- Need architecture decision records, phased rollout, and risk controls

## Output contract (must follow)
Always deliver these sections:
1. Scope & constraints
2. Evidence table (source, claim, confidence)
3. Option matrix (Adopt / Defer / Reject)
4. Architecture decision (single recommended path)
5. Phased plan (v1/v2/v3)
6. Risks, rollback, and metrics

## Research method
1. Gather at least 3 source types:
   - Official docs/source code
   - Production/community writeups
   - Implementation examples
2. Prefer high-signal sources; de-duplicate repeated claims.
3. Mark uncertain claims explicitly.
4. Do not start implementation until option matrix is complete.

## Architecture rules
- Keep a single source of truth for state
- Avoid hidden state and implicit time coupling
- Separate orchestration from core engine logic
- Prefer incremental rollout with measurable milestones

## Deliverable files
For each project, write under a dedicated folder:
- `RESEARCH_NOTES.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`
- Optional: `ADR-*.md` for major decisions

## Quality gate before implementation
- Is the chosen architecture reversible?
- Are fallback paths defined?
- Are success metrics measurable?
- Is blast radius limited in v1?

If any answer is "no", continue research/design; do not code yet.
