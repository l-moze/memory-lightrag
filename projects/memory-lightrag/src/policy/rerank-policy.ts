import type { QueryIntent } from "./query-intent.js";

export interface RerankWeights {
  causal: number;
  temporal: number;
  entity: number;
  lexical: number;
  semantic: number;
}

const DEFAULT_WEIGHTS: RerankWeights = Object.freeze({
  causal: 0.2,
  temporal: 0.2,
  entity: 0.2,
  lexical: 0.2,
  semantic: 0.2,
});

const INTENT_WEIGHTS: Readonly<Record<QueryIntent, RerankWeights>> = Object.freeze({
  WHY: Object.freeze({
    causal: 0.42,
    temporal: 0.12,
    entity: 0.14,
    lexical: 0.14,
    semantic: 0.18,
  }),
  WHEN: Object.freeze({
    causal: 0.12,
    temporal: 0.42,
    entity: 0.14,
    lexical: 0.14,
    semantic: 0.18,
  }),
  ENTITY: Object.freeze({
    causal: 0.1,
    temporal: 0.12,
    entity: 0.46,
    lexical: 0.14,
    semantic: 0.18,
  }),
  GENERAL: DEFAULT_WEIGHTS,
});

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getRerankWeights(intent: QueryIntent): RerankWeights {
  const base = INTENT_WEIGHTS[intent] ?? DEFAULT_WEIGHTS;

  return {
    causal: safeNumber(base.causal, DEFAULT_WEIGHTS.causal),
    temporal: safeNumber(base.temporal, DEFAULT_WEIGHTS.temporal),
    entity: safeNumber(base.entity, DEFAULT_WEIGHTS.entity),
    lexical: safeNumber(base.lexical, DEFAULT_WEIGHTS.lexical),
    semantic: safeNumber(base.semantic, DEFAULT_WEIGHTS.semantic),
  };
}
