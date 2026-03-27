import { runIntentRouting } from "./intent-routing.ts";
import type { IntentDetectionOptions, IntentRoutingDecision } from "./intent-routing.ts";

export type { QueryIntent, ScoredRoutingProfile, IntentThresholds, IntentTelemetry } from "./intent-routing.ts";
export { PROFILE_THRESHOLDS, DEFAULT_THRESHOLDS } from "./intent-routing.ts";

export function detectQueryIntentDetailed(query: string, options?: IntentDetectionOptions): IntentRoutingDecision {
  return runIntentRouting(query, options);
}

export function detectQueryIntent(query: string, options?: IntentDetectionOptions) {
  return runIntentRouting(query, options).intent;
}
