import type { QueryIntent } from "./query-intent.ts";
import { argMaxIntent, extractIntentFeatures, topTwo, type IntentFeatures } from "./intent-features.ts";

type ScoreFeatureKey = Exclude<keyof IntentFeatures, "query">;
type IntentWeightTable = Record<QueryIntent, Record<ScoreFeatureKey, number>>;

const FEATURE_KEYS: ScoreFeatureKey[] = [
  "causalStrong",
  "temporalExplicit",
  "temporalContext",
  "temporalEventAnchor",
  "entityStrong",
  "entityNoun",
  "entityHint",
  "ambiguousQuestion",
  "generalWeak",
  "summaryRequest",
];

// Single source of truth for intent scoring calibration.
const INTENT_WEIGHTS: IntentWeightTable = {
  WHY: {
    causalStrong: 3.0,
    temporalExplicit: -0.4,
    temporalContext: -0.1,
    temporalEventAnchor: 0.1,
    entityStrong: -0.3,
    entityNoun: -0.1,
    entityHint: -0.1,
    ambiguousQuestion: 0,
    generalWeak: -0.8,
    summaryRequest: -0.6,
  },
  WHEN: {
    causalStrong: -1.5,
    temporalExplicit: 2.2,
    temporalContext: 1.2,
    temporalEventAnchor: 1.3,
    entityStrong: -0.2,
    entityNoun: -0.1,
    entityHint: -0.1,
    ambiguousQuestion: 0.2,
    generalWeak: -0.8,
    summaryRequest: -0.2,
  },
  ENTITY: {
    causalStrong: -1.0,
    temporalExplicit: -0.4,
    temporalContext: -0.1,
    temporalEventAnchor: -0.2,
    entityStrong: 2.1,
    entityNoun: 1.2,
    entityHint: 1.1,
    ambiguousQuestion: 0.1,
    generalWeak: -0.6,
    summaryRequest: -0.8,
  },
  GENERAL: {
    causalStrong: -0.7,
    temporalExplicit: -0.5,
    temporalContext: -0.2,
    temporalEventAnchor: -0.3,
    entityStrong: -0.4,
    entityNoun: -0.2,
    entityHint: -0.2,
    ambiguousQuestion: 0.2,
    generalWeak: 1.4,
    summaryRequest: 1.0,
  },
};

export type IntentScoreMap = Record<QueryIntent, number>;

export interface IntentScoreResult {
  features: IntentFeatures;
  scores: IntentScoreMap;
  topIntent: QueryIntent;
  topScore: number;
  secondScore: number;
  margin: number;
}

function scoreByWeights(features: IntentFeatures, weights: Record<ScoreFeatureKey, number>): number {
  let score = 0;
  for (const key of FEATURE_KEYS) {
    score += features[key] * weights[key];
  }
  return score;
}

export function scoreWHY(features: IntentFeatures): number {
  return scoreByWeights(features, INTENT_WEIGHTS.WHY);
}

export function scoreWHEN(features: IntentFeatures): number {
  return scoreByWeights(features, INTENT_WEIGHTS.WHEN);
}

export function scoreENTITY(features: IntentFeatures): number {
  return scoreByWeights(features, INTENT_WEIGHTS.ENTITY);
}

export function scoreGENERAL(features: IntentFeatures): number {
  return scoreByWeights(features, INTENT_WEIGHTS.GENERAL);
}

export function scoreIntentFeatures(features: IntentFeatures): IntentScoreResult {
  const scores: IntentScoreMap = {
    WHY: scoreWHY(features),
    WHEN: scoreWHEN(features),
    ENTITY: scoreENTITY(features),
    GENERAL: scoreGENERAL(features),
  };

  const topIntent = argMaxIntent(scores);
  const [topScore, secondScore] = topTwo(scores);

  return {
    features,
    scores,
    topIntent,
    topScore,
    secondScore,
    margin: topScore - secondScore,
  };
}

export function scoreIntentQuery(query: string): IntentScoreResult {
  return scoreIntentFeatures(extractIntentFeatures(query));
}
