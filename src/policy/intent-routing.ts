import {
  extractIntentFeatures,
  hasClearEntityQuestion,
  hasClearWhenQuestion,
  shouldPreferGeneral,
} from "./intent-features.ts";
import { scoreIntentFeatures, type IntentScoreResult } from "./intent-scorer.ts";

export type QueryIntent = "WHY" | "WHEN" | "ENTITY" | "GENERAL";
export type ScoredRoutingProfile = "strict" | "default" | "recall";

export interface IntentThresholds {
  minTopScore: number;
  minMargin: number;
}

export interface IntentDetectionOptions {
  scoredRoutingEnabled?: boolean;
  profile?: ScoredRoutingProfile;
  thresholds?: Partial<IntentThresholds>;
}

export const PROFILE_THRESHOLDS: Record<ScoredRoutingProfile, IntentThresholds> = {
  strict: {
    minTopScore: 1.05,
    minMargin: 0.45,
  },
  default: {
    minTopScore: 0.9,
    minMargin: 0.35,
  },
  recall: {
    minTopScore: 0.78,
    minMargin: 0.25,
  },
};

export const DEFAULT_THRESHOLDS: IntentThresholds = PROFILE_THRESHOLDS.default;

export interface IntentTelemetry {
  routeMode: "direct" | "general_safe";
  decisionReason:
    | "compat-why"
    | "compat-when"
    | "compat-entity"
    | "compat-general"
    | "low-score"
    | "low-margin"
    | "weak-temporal-without-anchor"
    | "bare-entity-noun"
    | "scored";
  profile: ScoredRoutingProfile;
  thresholds: IntentThresholds;
}

export interface IntentRoutingDecision extends IntentScoreResult {
  intent: QueryIntent;
  telemetry: IntentTelemetry;
}

interface ThresholdResolution {
  profile: ScoredRoutingProfile;
  thresholds: IntentThresholds;
}

interface ScoreDecisionOutcome {
  intent: QueryIntent;
  routeMode: IntentTelemetry["routeMode"];
  decisionReason: IntentTelemetry["decisionReason"];
}

function resolveProfile(profile?: string): ScoredRoutingProfile {
  if (profile === "strict" || profile === "recall" || profile === "default") return profile;
  return "default";
}

function resolveThresholds(options?: IntentDetectionOptions): ThresholdResolution {
  const profile = resolveProfile(options?.profile);
  const base = PROFILE_THRESHOLDS[profile];

  return {
    profile,
    thresholds: {
      minTopScore: options?.thresholds?.minTopScore ?? base.minTopScore,
      minMargin: options?.thresholds?.minMargin ?? base.minMargin,
    },
  };
}

function decideByScore(result: IntentScoreResult, thresholds: IntentThresholds): ScoreDecisionOutcome {
  if (result.topScore < thresholds.minTopScore) {
    return {
      intent: "GENERAL",
      routeMode: "general_safe",
      decisionReason: "low-score",
    };
  }

  if (result.margin < thresholds.minMargin) {
    return {
      intent: "GENERAL",
      routeMode: "general_safe",
      decisionReason: "low-margin",
    };
  }

  const { features } = result;

  if (
    result.topIntent === "WHEN" &&
    features.temporalExplicit === 0 &&
    features.temporalContext > 0 &&
    features.temporalEventAnchor === 0
  ) {
    return {
      intent: "GENERAL",
      routeMode: "general_safe",
      decisionReason: "weak-temporal-without-anchor",
    };
  }

  if (
    result.topIntent === "ENTITY" &&
    features.entityStrong === 0 &&
    features.entityHint === 0 &&
    features.entityNoun > 0
  ) {
    return {
      intent: "GENERAL",
      routeMode: "general_safe",
      decisionReason: "bare-entity-noun",
    };
  }

  return {
    intent: result.topIntent,
    routeMode: "direct",
    decisionReason: "scored",
  };
}

function buildTelemetry(outcome: ScoreDecisionOutcome, resolution: ThresholdResolution): IntentTelemetry {
  return {
    routeMode: outcome.routeMode,
    decisionReason: outcome.decisionReason,
    profile: resolution.profile,
    thresholds: resolution.thresholds,
  };
}

function finalizeDecision(score: IntentScoreResult, intent: QueryIntent, telemetry: IntentTelemetry): IntentRoutingDecision {
  return {
    ...score,
    intent,
    telemetry,
  };
}

function emptyScoreResult(): IntentScoreResult {
  return scoreIntentFeatures(extractIntentFeatures(""));
}

export function runIntentRouting(query: string, options?: IntentDetectionOptions): IntentRoutingDecision {
  const resolution = resolveThresholds(options);
  const normalized = typeof query === "string" ? query.trim() : "";

  if (!normalized) {
    const score = emptyScoreResult();
    return finalizeDecision(
      score,
      "GENERAL",
      buildTelemetry(
        { intent: "GENERAL", routeMode: "general_safe", decisionReason: "compat-general" },
        resolution,
      ),
    );
  }

  const features = extractIntentFeatures(normalized);
  const scored = scoreIntentFeatures(features);

  if (features.causalStrong > 0) {
    return finalizeDecision(
      scored,
      "WHY",
      buildTelemetry({ intent: "WHY", routeMode: "direct", decisionReason: "compat-why" }, resolution),
    );
  }

  if (hasClearWhenQuestion(features)) {
    return finalizeDecision(
      scored,
      "WHEN",
      buildTelemetry({ intent: "WHEN", routeMode: "direct", decisionReason: "compat-when" }, resolution),
    );
  }

  if (hasClearEntityQuestion(features)) {
    return finalizeDecision(
      scored,
      "ENTITY",
      buildTelemetry({ intent: "ENTITY", routeMode: "direct", decisionReason: "compat-entity" }, resolution),
    );
  }

  if (shouldPreferGeneral(features)) {
    return finalizeDecision(
      scored,
      "GENERAL",
      buildTelemetry({ intent: "GENERAL", routeMode: "general_safe", decisionReason: "compat-general" }, resolution),
    );
  }

  if (options?.scoredRoutingEnabled === false) {
    return finalizeDecision(
      scored,
      scored.topIntent,
      buildTelemetry({ intent: scored.topIntent, routeMode: "direct", decisionReason: "scored" }, resolution),
    );
  }

  const outcome = decideByScore(scored, resolution.thresholds);
  return finalizeDecision(scored, outcome.intent, buildTelemetry(outcome, resolution));
}
