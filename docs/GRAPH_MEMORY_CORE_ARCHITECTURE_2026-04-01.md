# Graph Memory Core Architecture (2026-04-01)

## Purpose

Define the minimum implementable core architecture for `memory-lightrag` as a graph-native memory system.

This document answers one question:

- what must exist for the project to be more than a LightRAG-backed search plugin

## Design Constraints

1. Do not rewrite LightRAG internals already covered by the upstream project.
2. Preserve OpenClaw plugin compatibility and fallback.
3. Make graph memory lifecycle explicit: write, retrieve, update, decay, revoke.
4. Keep the first production version minimal enough to implement.

## Architectural North Star

The system should store and retrieve memory through typed graph objects and typed graph relations, not only through text snippets.

Operationally:

- OpenClaw provides the runtime shell and compatibility boundary.
- LightRAG provides the graph retrieval/storage substrate.
- `memory-lightrag` provides memory semantics and lifecycle control.

## Core Layers

## Layer 0. Source Layer

Raw inputs:

- session turns
- tool outputs
- daily memory files
- curated long-term memory files
- explicit user corrections

Responsibilities:

- preserve raw source material
- provide provenance anchors

This layer remains outside the graph substrate.

## Layer 1. Memory Object Layer

This is the first project-owned semantic layer.

Minimum object types:

- `Episode`
- `Decision`
- `Preference`
- `Commitment`
- `Incident`
- `Source`

### Object definitions

#### `Episode`
- one bounded interaction, event, or observation
- usually created from a turn or grouped turns
- carries:
  - `id`
  - `timestamp`
  - `participants`
  - `summary`
  - `sourceIds`

#### `Decision`
- a resolved conclusion with possible future impact
- carries:
  - `id`
  - `statement`
  - `status`
  - `effectiveAt`
  - `sourceIds`

#### `Preference`
- a user/team preference or stable working convention
- carries:
  - `id`
  - `owner`
  - `statement`
  - `scope`
  - `validFrom`
  - `validTo`
  - `sourceIds`

#### `Commitment`
- todo, obligation, or promised action
- carries:
  - `id`
  - `owner`
  - `statement`
  - `status`
  - `dueAt`
  - `sourceIds`

#### `Incident`
- outage, bug, failure, or abnormal event
- carries:
  - `id`
  - `summary`
  - `severity`
  - `startedAt`
  - `endedAt`
  - `sourceIds`

#### `Source`
- provenance record
- carries:
  - `id`
  - `kind`
  - `uri`
  - `snippet`
  - `createdAt`

## Layer 2. Relation Layer

Minimum relation families:

- `mentions`
- `about`
- `happened_before`
- `caused_by`
- `owned_by`
- `supports`
- `contradicts`
- `supersedes`
- `derived_from`

Rules:

1. Every non-source object must be attached to at least one `Source`.
2. `supersedes` and `contradicts` are first-class, not text annotations.
3. Temporal relations must be explicit where possible.

## Layer 3. Graph Substrate Layer

Implemented by LightRAG.

Responsibilities:

- ingest objects as text/documents with stable provenance fields
- maintain graph entities/relations
- support workspace/domain isolation
- execute hybrid / mix retrieval
- return graph-aware evidence payloads

Project rule:

- We use LightRAG as the graph engine.
- We do not fork/rewrite its generic storage or retrieval stack unless blocked by a proven limitation.

## Layer 4. Memory Lifecycle Control Layer

Implemented by `memory-lightrag`.

Responsibilities:

- normalize raw inputs into memory objects
- validate required fields
- assign workspace/domain/source tags
- upsert or supersede objects
- apply promotion / decay / revoke policies
- assemble grounded recall output

This is the real product layer.

## Write Path

## Goal

Convert raw interactions into graph memory safely and repeatably.

## Pipeline

1. raw turn/event captured
2. extract candidate memory objects
3. classify object type
4. attach provenance
5. validate required fields
6. assign workspace/domain
7. upsert into LightRAG
8. record audit event

## Minimum P1 implementation

The first write-path implementation only needs to support:

- `Episode`
- `Decision`
- `Preference`
- `Source`

Reason:

- these four cover the highest-value memory cases without requiring full incident/todo governance on day one

## Read Path

## Goal

Answer memory questions through graph-grounded evidence, not only snippet matching.

## Pipeline

1. incoming memory query
2. identify anchor candidates
   - entity anchor
   - event/episode anchor
   - temporal anchor
3. retrieve graph evidence from LightRAG
4. expand locally by relation policy
5. prune by domain/safety/budget
6. assemble response evidence
7. return:
   - text answer context
   - provenance
   - graph evidence summary

## Important rule

Query-only regex routing may remain as a helper for anchor selection,
but it must not be the long-term primary intelligence layer.

## Update Path

Graph memory cannot be append-only forever at the semantic level.

Minimum update behaviors:

- new fact may `support` an old object
- corrected fact may `contradict` an old object
- replacement fact may `supersede` an old object
- revoked fact must stop surfacing in top answers

Implementation note:

- prefer relation-based state transitions over destructive deletion
- destructive cleanup remains an operator path, not the main semantic path

## Decay and Promotion

Not all captured memory should remain equally salient.

Minimum lifecycle states:

- `candidate`
- `promoted`
- `stale`
- `revoked`

Minimum policies:

- repeated support raises promotion confidence
- contradiction lowers surfacing priority
- revoked objects remain auditable but should not be surfaced normally

## Isolation Model

Isolation must be enforced outside pure retrieval ranking.

Required dimensions:

- `workspace`
- `domain`
- `actorUserId`
- `groupId`
- `source tag`

Rule:

- filtered-out evidence is removed before rerank and before response assembly

## Fallback Model

Fallback remains part of the core architecture.

Fallback cases:

- LightRAG unavailable
- auth/config invalid
- retrieval returns unusable graph payload
- lifecycle control detects unsafe output

Fallback target:

- OpenClaw builtin memory search / memory-core

## Minimal Implementable Closed Loop

The project is architecturally real once the following loop exists:

1. a turn creates an `Episode` or `Decision`
2. the object is written into LightRAG with provenance
3. a later query retrieves it through graph-aware evidence
4. the answer includes correct provenance
5. a correction can supersede it

If this loop is absent, the project is still a graph-enhanced search plugin, not a graph memory system.

## Mapping to Current Project

### Already present

- OpenClaw plugin shell
- LightRAG adapter
- workspace/domain policy
- fallback behavior
- retrieval-side ontology payload

### Missing or incomplete

- memory object layer
- write-path normalization contract
- supersede/contradict/revoke semantics
- graph-native read assembly
- lifecycle metrics

## Immediate Build Order

1. define memory object schema
2. implement write-path normalization for `Episode/Decision/Preference/Source`
3. persist provenance + stable ids
4. implement graph-grounded read assembly
5. add supersede/revoke path

## Anti-patterns

Do not call the system graph-native if it mainly does:

- query regex routing
- snippet retrieval with optional graph decoration
- graph fields only in diagnostics

## Decision Rule

When deciding whether a feature belongs in the core architecture, ask:

- does it improve memory object quality?
- does it improve graph-grounded retrieval?
- does it improve lifecycle governance?

If not, it is likely auxiliary, not core.
