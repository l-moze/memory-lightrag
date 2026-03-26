import type { QueryIntent } from "./query-intent.ts";

export type IntentFeatures = {
  query: string;
  causalStrong: number;
  temporalExplicit: number;
  temporalContext: number;
  temporalEventAnchor: number;
  entityStrong: number;
  entityNoun: number;
  entityHint: number;
  ambiguousQuestion: number;
  generalWeak: number;
  summaryRequest: number;
};

export const WHY_PATTERNS: RegExp[] = [
  /\bwhy\b/i,
  /\breason\b/i,
  /\bcause\b/i,
  /\bbecause\b/i,
  /\broot\s+cause\b/i,
  /\bhow\s+come\b/i,
  /为什么/,
  /为何/,
  /为啥/,
  /原因/,
  /起因/,
  /根因/,
  /怎么会/,
  /导致/,
  /造成/,
  /因果/,
];

export const WHEN_EXPLICIT_PATTERNS: RegExp[] = [
  /\bwhen\b/i,
  /\bat\s+what\s+time\b/i,
  /\bbefore\b/i,
  /\bafter\b/i,
  /\bduring\b/i,
  /什么时候/,
  /何时/,
  /几点/,
  /哪天/,
  /多久/,
  /先后/,
  /之前/,
  /之后/,
  /期间/,
  /时间线/,
];

export const WHEN_CONTEXT_PATTERNS: RegExp[] = [
  /\btime\b/i,
  /\bdate\b/i,
  /\byesterday\b/i,
  /\btoday\b/i,
  /\btomorrow\b/i,
  /\brecent(?:ly)?\b/i,
  /\blast\s+(?:night|week|month|year|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i,
  /\bthis\s+(?:morning|afternoon|evening|week|month|year)\b/i,
  /时间/,
  /日期/,
  /昨天/,
  /今天/,
  /明天/,
  /最近/,
  /近期/,
  /上周/,
  /上个月/,
  /去年/,
  /今年/,
];

export const WHEN_EVENT_HINT_PATTERNS: RegExp[] = [
  /\bchange(?:d|s|ing)?\b/i,
  /\bhappen(?:ed|s|ing)?\b/i,
  /\bstart(?:ed|s|ing)?\b/i,
  /\bend(?:ed|s|ing)?\b/i,
  /\bfinish(?:ed|es|ing)?\b/i,
  /\brelease(?:d|s)?\b/i,
  /\bdeploy(?:ed|ment|s)?\b/i,
  /\bincident\b/i,
  /\bissue\b/i,
  /\boutage\b/i,
  /\btask\b/i,
  /\bupdate\b/i,
  /\bmeeting\b/i,
  /\bversion\b/i,
  /\bdeadline\b/i,
  /\bpeak(?:ed|s|ing)?\b/i,
  /发生/,
  /开始/,
  /结束/,
  /完成/,
  /发布/,
  /上线/,
  /故障/,
  /问题/,
  /任务/,
  /更新/,
  /会议/,
  /版本/,
  /截止/,
  /变更/,
  /改了?/,
  /出现/,
  /峰值/,
];

export const STRONG_ENTITY_PATTERNS: RegExp[] = [/\bwho\b/i, /\bwhere\b/i, /谁/, /哪位/, /哪里/, /哪儿/];

export const ENTITY_NOUN_PATTERNS: RegExp[] = [
  /\bperson\b/i,
  /\bpeople\b/i,
  /\bteam\b/i,
  /\bproject\b/i,
  /\bfile\b/i,
  /\bdoc(?:ument)?\b/i,
  /\bentity\b/i,
  /\bmember\b/i,
  /\bowner\b/i,
  /\bmaintainer\b/i,
  /\brepo(?:sitory)?\b/i,
  /\bservice\b/i,
  /\bmodule\b/i,
  /\bcomponent\b/i,
  /\bname\b/i,
  /\blocation\b/i,
  /人员/,
  /成员/,
  /组织/,
  /团队/,
  /项目/,
  /文件/,
  /文档/,
  /实体/,
  /负责人/,
  /仓库/,
  /服务/,
  /模块/,
  /组件/,
  /名称/,
  /名字/,
  /地点/,
  /位置/,
];

export const AMBIGUOUS_QUESTION_PATTERNS: RegExp[] = [/\bwhat\b/i, /\bwhich\b/i, /什么/, /哪个/, /哪些/];

export const ENTITY_HINT_PATTERNS: RegExp[] = [
  /\bcalled\b/i,
  /\bowner\b/i,
  /\bowns?\b/i,
  /\bmaintainer\b/i,
  /\bresponsible\b/i,
  /\bbelong(?:s)?\b/i,
  /\blocation\b/i,
  /\baddress\b/i,
  /\bid\b/i,
  /\blist\b/i,
  /\bshow\b/i,
  /叫.?什么/,
  /名称/,
  /名字/,
  /负责/,
  /负责人/,
  /归属/,
  /位于/,
  /地址/,
  /编号/,
  /列出/,
  /清单/,
  /有哪些/,
  /是谁/,
];

export const GENERAL_WEAK_QUERY_PATTERNS: RegExp[] = [
  /^\s*(?:what|which)\s+is\s+(?:this|that|it)\s*[?.!]?\s*$/i,
  /^\s*(?:what|which)\s+(?:one\s+)?is\s+better\s*[?.!]?\s*$/i,
  /^\s*这是什么\s*[？?]?\s*$/,
  /^\s*哪个更好\s*[？?]?\s*$/,
];

export const SUMMARY_REQUEST_PATTERNS: RegExp[] = [
  /\bsummar(?:y|ize)\b/i,
  /\brecap\b/i,
  /\boverview\b/i,
  /\bbrief\b/i,
  /\bstatus\b/i,
  /\baction\s+items?\b/i,
  /\bkey\s+decisions?\b/i,
  /\bhigh[-\s]?level\b/i,
  /总结/,
  /整理/,
  /摘要/,
  /概述/,
  /简报/,
  /进展/,
  /播报/,
  /要点/,
  /快速了解/,
  /高层/,
  /复盘/,
  /合成/,
  /提炼/,
];

export function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((n, pattern) => (pattern.test(text) ? n + 1 : n), 0);
}

export function isWeakGeneralQuery(text: string): boolean {
  return matchesAny(text, GENERAL_WEAK_QUERY_PATTERNS);
}

export function extractIntentFeatures(query: string): IntentFeatures {
  const normalized = typeof query === "string" ? query.trim() : "";
  return {
    query: normalized,
    causalStrong: countMatches(normalized, WHY_PATTERNS),
    temporalExplicit: countMatches(normalized, WHEN_EXPLICIT_PATTERNS),
    temporalContext: countMatches(normalized, WHEN_CONTEXT_PATTERNS),
    temporalEventAnchor: countMatches(normalized, WHEN_EVENT_HINT_PATTERNS),
    entityStrong: countMatches(normalized, STRONG_ENTITY_PATTERNS),
    entityNoun: countMatches(normalized, ENTITY_NOUN_PATTERNS),
    entityHint: countMatches(normalized, ENTITY_HINT_PATTERNS),
    ambiguousQuestion: countMatches(normalized, AMBIGUOUS_QUESTION_PATTERNS),
    generalWeak: isWeakGeneralQuery(normalized) ? 1 : 0,
    summaryRequest: countMatches(normalized, SUMMARY_REQUEST_PATTERNS),
  };
}

export function hasClearWhenQuestion(features: IntentFeatures): boolean {
  if (features.temporalExplicit > 0) return true;

  // Weak time/date mentions need event anchor to avoid over-routing to WHEN.
  if (features.temporalContext > 0 && features.temporalEventAnchor > 0) {
    return true;
  }

  // Mixed temporal + entity prompts (e.g., "近期谁负责这个服务") should remain WHEN for compatibility.
  if (features.temporalContext > 0 && (features.entityStrong > 0 || features.entityHint > 0)) {
    return true;
  }

  return false;
}

export function hasClearEntityQuestion(features: IntentFeatures): boolean {
  return features.entityStrong > 0 || ((features.entityNoun > 0 || features.entityHint > 0) && features.summaryRequest === 0);
}

export function shouldPreferGeneral(features: IntentFeatures): boolean {
  return features.summaryRequest > 0 && features.causalStrong === 0 && features.temporalExplicit === 0;
}

export function argMaxIntent(scores: Record<QueryIntent, number>): QueryIntent {
  let top: QueryIntent = "GENERAL";
  let topScore = Number.NEGATIVE_INFINITY;
  for (const intent of ["WHY", "WHEN", "ENTITY", "GENERAL"] as QueryIntent[]) {
    const score = scores[intent];
    if (score > topScore) {
      top = intent;
      topScore = score;
    }
  }
  return top;
}

export function topTwo(scores: Record<QueryIntent, number>): [number, number] {
  const vals = [scores.WHY, scores.WHEN, scores.ENTITY, scores.GENERAL].sort((a, b) => b - a);
  return [vals[0] ?? 0, vals[1] ?? 0];
}

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function softmaxNormalized(scores: Record<QueryIntent, number>): Record<QueryIntent, number> {
  const values = [scores.WHY, scores.WHEN, scores.ENTITY, scores.GENERAL];
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return {
    WHY: exps[0] / sum,
    WHEN: exps[1] / sum,
    ENTITY: exps[2] / sum,
    GENERAL: exps[3] / sum,
  };
}

export function sortIntentsByScore(scores: Record<QueryIntent, number>): Array<{ intent: QueryIntent; score: number }> {
  return (["WHY", "WHEN", "ENTITY", "GENERAL"] as QueryIntent[])
    .map((intent) => ({ intent, score: scores[intent] }))
    .sort((a, b) => b.score - a.score);
}
