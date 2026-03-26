import {
  extractIntentFeatures,
  hasClearEntityQuestion,
  hasClearWhenQuestion,
  shouldPreferGeneral,
} from "./intent-features.ts";
import { scoreIntentFeatures, type IntentScoreResult } from "./intent-scorer.ts";

export type QueryIntent = "WHY" | "WHEN" | "ENTITY" | "GENERAL";

interface IntentThresholds {
  minTopScore: number;
  minMargin: number;
}

const DEFAULT_THRESHOLDS: IntentThresholds = {
  minTopScore: 0.9,
  minMargin: 0.35,
};

function decideByScore(result: IntentScoreResult, thresholds: IntentThresholds): QueryIntent {
  if (result.topScore < thresholds.minTopScore) return "GENERAL";
  if (result.margin < thresholds.minMargin) return "GENERAL";

  const { features } = result;

  // Weak temporal topic words without an anchored event are ambiguous.
  if (
    result.topIntent === "WHEN" &&
    features.temporalExplicit === 0 &&
    features.temporalContext > 0 &&
    features.temporalEventAnchor === 0
  ) {
    return "GENERAL";
  }

  // Bare entity nouns without role/ownership hints are often generic asks.
  if (
    result.topIntent === "ENTITY" &&
    features.entityStrong === 0 &&
    features.entityHint === 0 &&
    features.entityNoun > 0
  ) {
    return "GENERAL";
  }

  return result.topIntent;
}

export function detectQueryIntentDetailed(query: string): IntentScoreResult & { intent: QueryIntent } {
  if (typeof query !== "string") {
    const emptyScore = scoreIntentFeatures(extractIntentFeatures(""));
    return { ...emptyScore, intent: "GENERAL" };
  }

  const normalized = query.trim();
  if (!normalized) {
    const emptyScore = scoreIntentFeatures(extractIntentFeatures(""));
    return { ...emptyScore, intent: "GENERAL" };
  }

  const features = extractIntentFeatures(normalized);

  // Compatibility precedence: WHY -> WHEN -> ENTITY -> GENERAL.
  if (features.causalStrong > 0) {
    const scored = scoreIntentFeatures(features);
    return { ...scored, intent: "WHY" };
  }

  if (hasClearWhenQuestion(features)) {
    const scored = scoreIntentFeatures(features);
    return { ...scored, intent: "WHEN" };
  }

  if (hasClearEntityQuestion(features)) {
    const scored = scoreIntentFeatures(features);
    return { ...scored, intent: "ENTITY" };
  }

  if (shouldPreferGeneral(features)) {
    const scored = scoreIntentFeatures(features);
    return { ...scored, intent: "GENERAL" };
  }

  const scored = scoreIntentFeatures(features);
  return { ...scored, intent: decideByScore(scored, DEFAULT_THRESHOLDS) };
}

export function detectQueryIntent(query: string): QueryIntent {
  return detectQueryIntentDetailed(query).intent;
}
