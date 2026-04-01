# Graph Memory Schema vNext

## Purpose

Define the minimum semantic object layer required above retrieval payloads so the project can evolve from graph-backed search to graph-native memory.

## Object Types

### `Episode`
- a bounded occurrence or interaction
- anchors time, participants, and provenance

### `Decision`
- a chosen conclusion or commitment-bearing outcome
- may supersede a prior decision

### `Preference`
- a stable or semi-stable user/team preference
- should be revocable and time-scoped

### `Commitment`
- a promise, todo, or obligation
- should support status changes and owner links

### `Incident`
- an error, outage, or problem event
- should support temporal ordering and causal links

### `Source`
- evidence pointer used to justify stored memory

## Core Relation Families

- `happened_before`
- `caused_by`
- `mentions`
- `about`
- `owned_by`
- `derived_from`
- `supersedes`
- `contradicts`
- `supports`

## Rules

1. Retrieval payload contracts stay additive and lightweight.
2. Lifecycle meaning belongs in memory object types, not ad hoc metadata blobs.
3. Every stored object should preserve provenance.
4. Revocation/supersede must be first-class relations, not just text notes.

## Non-goals

- no attempt to re-implement LightRAG storage internals
- no attempt to replace OpenClaw session files as immediate source material
