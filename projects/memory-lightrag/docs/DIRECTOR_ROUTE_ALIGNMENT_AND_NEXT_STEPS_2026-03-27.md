# DIRECTOR_ROUTE_ALIGNMENT_AND_NEXT_STEPS_2026-03-27

## Purpose

This document translates Director's recent research + proposal thread into a practical landing plan for `memory-lightrag`.

It aims to answer four questions:

1. What in the Director route is genuinely useful?
2. What is only a transitional control-layer technique?
3. Where does it conflict with long-term MAMGA / ontology goals?
4. What should we build next inside `memory-lightrag`?

---

## Executive Summary

Director's recent direction is **not useless**, but it must be placed carefully.

The strongest part of the proposal is:
- uncertainty-aware routing
- confidence / margin thresholds
- reject option / ambiguous handling
- treating `GENERAL` as a first-class class instead of a garbage bucket

The risky part is:
- over-expanding query-surface feature engineering
- making routing intelligence depend mainly on handcrafted query features
- letting ontology/graph become only a backend evidence store instead of part of the reasoning layer

### Bottom line

**Adopt Director's route as a short-term control layer, not as the long-term core intelligence architecture.**

---

## What we learned from Director's recent conversation chain

Session source inspected:
- `/home/node/.openclaw/agents/director/sessions/bf5265f4-7c35-41fe-87f5-9b608847e205.jsonl`

### Observed sequence

1. Director researched industrial + academic approaches for boundary intent classification:
   - Dialogflow CX classification threshold / no-match
   - Rasa fallback / low-confidence handling
   - calibration
   - selective classification
   - open intent detection / adaptive decision boundary
   - conformal clarification / prediction sets

2. Director reframed the current problem as:
   - not ordinary closed-set intent classification
   - but a **boundary classification / selective classification** problem
   - especially for `GENERAL vs WHEN` and `GENERAL vs ENTITY`

3. Director proposed a T5.1-style mathematical upgrade:
   - raw score vector
   - calibration
   - confidence threshold
   - margin threshold
   - pairwise tie-breaks
   - ambiguous / fallback handling

4. Director then compressed that route into a candidate feature template, including:
   - `temporal_keyword_count`
   - `named_entity_count`
   - `broad_question_signal`
   - `causal_phrase_hit`
   - etc.

### Important interpretation

Those feature names are **not a direct quotation from one paper**.
They are a **feature-engineering abstraction** built from:
- the current `memory-lightrag` problem shape
- external research patterns
- classic NLP / intent-engineering observables

So they should be treated as:
> a candidate implementation template

Not as:
> the final memory / ontology architecture

---

## Alignment judgment: what to keep, what to limit

## A. Keep — these are worth adopting now

### A1. Uncertainty-aware routing
We should explicitly model:
- low confidence
- small top1-top2 margin
- ambiguous cases
- safe fallback behavior

This directly addresses the current failure mode:
- not total misunderstanding
- but brittle over-commitment on boundary queries

### A2. Score-based routing instead of pure rule ordering
Moving from:
- hit / no-hit rules

to:
- comparable class scores

is a real improvement.

### A3. GENERAL as a positive class
`GENERAL` must not remain a residue bucket.
It should have positive evidence and a clear semantics:
- broad question shape
- summary / overview asks
- weak structural specificity
- multi-topic or mixed asks

### A4. Reject option / tie-break
When the router is unsure, it should not force a hard decision.
For high-confusion pairs, tie-break is appropriate:
- `GENERAL vs WHEN`
- `GENERAL vs ENTITY`

---

## B. Limit — useful only as transitional control layer

### B1. Handcrafted query feature expansion
A small feature set is acceptable.
An endlessly growing feature zoo is not.

Acceptable:
- a few stable temporal signals
- a few stable entity signals
- a few broadness/generality signals

Not acceptable:
- constant addition of narrow patch features for every new edge case

### B2. Query-only intelligence
If routing depends mostly on query-surface features, the system drifts toward:
- a sophisticated intent regex engine

instead of:
- graph-native / ontology-aware memory reasoning

So query-surface scoring may exist,
but it should remain shallow and bounded.

### B3. Pairwise patch inflation
A couple of pairwise tie-breaks are okay.
A growing network of hand-tuned pair rules is not.

---

## C. Avoid — this would conflict with long-term MAMGA / ontology goals

### C1. Making the query classifier the main intelligence source
If the core routing decision is mostly made by:
- handcrafted feature extraction
- handcrafted thresholds
- handcrafted pairwise comparison

then ontology becomes secondary.
That would conflict with the long-term target.

### C2. Reducing ontology to a passive evidence store
Ontology / graph should not be only:
- storage
- metadata lookup
- after-the-fact explanation

It should increasingly participate in:
- disambiguation
- structural retrieval
- relation-sensitive routing
- evidence-grounded decision making

### C3. Defining GENERAL mostly by absence
If `GENERAL` is mostly implemented as:
- lack of temporal specificity
- lack of entity specificity

then it remains a residual class in disguise.
That is unstable.

---

## Recommended architecture boundary for next phase

## Layer 1 — Thin control layer (acceptable now)

This layer may contain:
- score vector
- thresholding
- margin logic
- ambiguous handling
- limited tie-break logic

Its role:
> route safely, not think deeply

This is where Director's T5.1-style logic belongs.

---

## Layer 2 — Graph / ontology-native reasoning (main long-term target)

This layer should become the center of intelligence.
It should gradually absorb more of the real reasoning burden via:
- stronger entity linking
- stronger relation grounding
- temporal relation extraction
- causal relation grounding
- graph-aware retrieval
- evidence-aware routing / reranking

This is where MAMGA / ontology goals live.

---

## Layer 3 — Retrieval feedback loop (missing bridge)

The router should not rely on query text alone.
Over time, routing should be informed by:
- what retrieval actually returns
- whether evidence is temporally concentrated
- whether evidence is entity-centered
- whether evidence is broad and mixed

This is the correct bridge between:
- shallow query control
- deep graph-native reasoning

---

## Concrete landing plan for `memory-lightrag`

## Phase P0 — Stabilize current routing without overcommitting to feature engineering

### Goal
Fix current brittleness while keeping the implementation small.

### Build now

#### 1. Add a score-vector layer
Produce four scores:
- `WHY`
- `WHEN`
- `ENTITY`
- `GENERAL`

These may initially come from lightweight heuristic features.

#### 2. Add two decision controls
- `tau_conf`
- `tau_margin`

Decision pattern:
- if top1 < `tau_conf` => ambiguous-safe path
- else if top1 - top2 < `tau_margin` => tie-break path
- else => direct class

#### 3. Add only two pairwise tie-breaks
- `GENERAL vs WHEN`
- `GENERAL vs ENTITY`

No wider pair matrix at this stage.

#### 4. Redefine GENERAL positively
GENERAL must include positive signals, not only residual negatives.

#### 5. Add observability
Log at least:
- score vector
- top1
- top2
- margin
- route mode (`direct` / `tiebreak` / `general_safe`)
- confusion pair tags

### Explicit constraint for P0
Do **not** add a large feature catalog.
Cap it to a small, reviewable set.

---

## Phase P1 — Move from query-only scoring to retrieval-aware scoring

### Goal
Reduce reliance on query surface alone.

### Build next
Add retrieval-derived evidence into score construction, e.g.:
- temporal evidence concentration from recalled items
- entity concentration / dominant node evidence
- relation support evidence
- broad / mixed evidence pattern

This will make routing more graph-aware without requiring a full ontology-native router yet.

### Why this matters
This is the most important anti-drift step.
It prevents the system from becoming only a query feature classifier.

---

## Phase P2 — Shift core intelligence toward ontology / graph-native routing

### Goal
Let ontology reasoning increasingly replace handcrafted query control.

### Build later
Examples:
- route classes derived from graph evidence types
- relation-typed recall policies
- temporal/causal edge-aware retrieval strategies
- graph-native disambiguation between entity and broad asks

At this phase, some current handcrafted features should be retired.

---

## What should be implemented in code next

Suggested focus areas in `memory-lightrag`:

### 1. `src/policy/intent-routing.ts` (or equivalent)
Add:
- score vector output
- confidence / margin decision
- route mode enum
- tie-break entry points

### 2. `src/policy/tiebreak/`
Add only:
- `general-vs-when.ts`
- `general-vs-entity.ts`

### 3. `src/policy/observability.ts`
Log:
- raw scores
- normalized scores
- threshold outcomes
- selected route mode
- fallback reason

### 4. `eval/`
Add explicit evaluation for:
- GENERAL recall
- GENERAL↔WHEN confusion
- GENERAL↔ENTITY confusion
- abstention / ambiguous rate
- rescue rate from tie-break

---

## Evaluation rules for the next iteration

Do not judge success only by overall accuracy.

Track at least:
- Accuracy
- Macro-F1
- GENERAL recall
- GENERAL precision
- GENERAL↔WHEN confusion
- GENERAL↔ENTITY confusion
- ambiguous rate
- tie-break rescue rate

If calibration is added later, also track:
- ECE
- risk-coverage behavior

---

## Product / architecture guardrails

To prevent drift away from MAMGA / ontology goals, adopt these explicit rules:

### Guardrail 1
No uncontrolled feature growth.
Every new feature must justify why graph / retrieval evidence cannot provide the same signal more cleanly.

### Guardrail 2
No uncontrolled pairwise rules.
Only the two highest-value confusion pairs are allowed in the near term.

### Guardrail 3
Routing logic must gradually become retrieval-aware.
If routing remains query-only for too long, the architecture is drifting.

### Guardrail 4
Ontology must evolve from storage to reasoning support.
Every routing milestone should ask:
- did graph evidence participate more than before?

### Guardrail 5
GENERAL must be positively defined.
If GENERAL is implemented mostly as “not enough X / not enough Y”, redesign is needed.

---

## Final recommendation

### Recommended stance
Adopt Director's route as:
- a **short-term control/stabilization layer**

Do not adopt it as:
- the **long-term core memory intelligence architecture**

### One-sentence decision rule
If a change improves routing mainly by adding more handcrafted query features, treat it as temporary.
If a change improves routing mainly by increasing graph / ontology / evidence participation, treat it as strategic.

---

## Immediate next step

For the next development cycle, implement:
1. score vector
2. confidence threshold
3. margin threshold
4. two tie-breaks only
5. observability
6. evaluation on confusion pairs

And explicitly defer:
- large feature catalog expansion
- broad pairwise rule expansion
- treating feature routing as final architecture

---

## Maintainer note

This document is intended to guide the next implementation step without overfitting the system to a handcrafted feature-engineering path.

It should be read together with:
- `MAMGA_ENVIRONMENT_MEMORY_MODEL_ANALYSIS_2026-03-26.md`
- `TARGET_ALIGNMENT_AND_BOUNDARIES.md`
- `memory-ontology.md`
- T4 / T5 / T5.1 routing and evaluation docs
