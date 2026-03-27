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

function decideByScore(
  result: IntentScoreResult,
  thresholds: IntentThresholds,
): { intent: QueryIntent; routeMode: IntentTelemetry["routeMode"]; decisionReason: IntentTelemetry["decisionReason"] } {
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

  // Weak temporal topic words without an anchored event are ambiguous.
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

  // Bare entity nouns without role/ownership hints are often generic asks.
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

function resolveProfile(profile?: string): ScoredRoutingProfile {
  if (profile === "strict" || profile === "recall" || profile === "default") return profile;
  return "default";
}

function resolveThresholds(options?: IntentDetectionOptions): { profile: ScoredRoutingProfile; thresholds: IntentThresholds } {
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

export function detectQueryIntentDetailed(
  query: string,
  options?: IntentDetectionOptions,
): IntentScoreResult & { intent: QueryIntent; telemetry: IntentTelemetry } {
  const resolved = resolveThresholds(options);

  if (typeof query !== "string") {
    const emptyScore = scoreIntentFeatures(extractIntentFeatures(""));
    return {
      ...emptyScore,
      intent: "GENERAL",
      telemetry: {
        routeMode: "general_safe",
        decisionReason: "compat-general",
        profile: resolved.profile,
        thresholds: resolved.thresholds,
      },
    };
  }

  const normalized = query.trim();
  if (!normalized) {
    const emptyScore = scoreIntentFeatures(extractIntentFeatures(""));
    return {
      ...emptyScore,
      intent: "GENERAL",
      telemetry: {
        routeMode: "general_safe",
        decisionReason: "compat-general",
        profile: resolved.profile,
        thresholds: resolved.thresholds,
      },
    };
  }

  const features = extractIntentFeatures(normalized);

  // Compatibility precedence: WHY -> WHEN -> ENTITY -> GENERAL.
  if (features.causalStrong > 0) {
    const scored = scoreIntentFeatures(features);
    return {
      ...scored,
      intent: "WHY",
      telemetry: {
        routeMode: "direct",
        decisionReason: "compat-why",
        profile: resolved.profile,
        thresholds: resolved.thresholds,
      },
    };
  }

  if (hasClearWhenQuestion(features)) {
    const scored = scoreIntentFeatures(features);
    return {
      ...scored,
      intent: "WHEN",
      telemetry: {
        routeMode: "direct",
        decisionReason: "compat-when",
        profile: resolved.profile,
        thresholds: resolved.thresholds,
      },
    };
  }

  if (hasClearEntityQuestion(features)) {
    const scored = scoreIntentFeatures(features);
    return {
      ...scored,
      intent: "ENTITY",
      telemetry: {
        routeMode: "direct",
        decisionReason: "compat-entity",
        profile: resolved.profile,
        thresholds: resolved.thresholds,
      },
    };
  }

  if (shouldPreferGeneral(features)) {
    const scored = scoreIntentFeatures(features);
    return {
      ...scored,
      intent: "GENERAL",
      telemetry: {
        routeMode: "general_safe",
        decisionReason: "compat-general",
        profile: resolved.profile,
        thresholds: resolved.thresholds,
      },
    };
  }

  const scored = scoreIntentFeatures(features);
  if (options?.scoredRoutingEnabled === false) {
    return {
      ...scored,
      intent: scored.topIntent,
      telemetry: {
        routeMode: "direct",
        decisionReason: "scored",
        profile: resolved.profile,
        thresholds: resolved.thresholds,
      },
    };
  }

  const scoredDecision = decideByScore(scored, resolved.thresholds);
  return {
    ...scored,
    intent: scoredDecision.intent,
    telemetry: {
      routeMode: scoredDecision.routeMode,
      decisionReason: scoredDecision.decisionReason,
      profile: resolved.profile,
      thresholds: resolved.thresholds,
    },
  };
}

export function detectQueryIntent(query: string, options?: IntentDetectionOptions): QueryIntent {
  return detectQueryIntentDetailed(query, options).intent;
}
