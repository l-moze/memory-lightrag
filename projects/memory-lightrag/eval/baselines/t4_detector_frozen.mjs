export const T4_BASELINE_VERSION = "t4-frozen-2026-03-26";

const WHY_PATTERNS = [
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

const WHEN_PATTERNS = [
  /\bwhen\b/i,
  /\btime\b/i,
  /\bdate\b/i,
  /\btimeline\b/i,
  /\bbefore\b/i,
  /\bafter\b/i,
  /\bduring\b/i,
  /\byesterday\b/i,
  /\btoday\b/i,
  /\btomorrow\b/i,
  /\brecent(?:ly)?\b/i,
  /\blast\s+(?:night|week|month|year)\b/i,
  /\bthis\s+(?:morning|afternoon|evening|week|month|year)\b/i,
  /什么时候/,
  /何时/,
  /几点/,
  /哪天/,
  /日期/,
  /时间/,
  /多久/,
  /先后/,
  /之前/,
  /之后/,
  /期间/,
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

const STRONG_ENTITY_PATTERNS = [/\bwho\b/i, /\bwhere\b/i, /谁/, /哪位/, /哪里/, /哪儿/];

const ENTITY_NOUN_PATTERNS = [
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

const AMBIGUOUS_ENTITY_QUESTION_PATTERNS = [/\bwhat\b/i, /\bwhich\b/i, /什么/, /哪个/, /哪些/];

const ENTITY_HINT_PATTERNS = [
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

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function isEntityIntentT4(text) {
  if (matchesAny(text, STRONG_ENTITY_PATTERNS)) return true;
  if (matchesAny(text, ENTITY_NOUN_PATTERNS)) return true;

  const hasAmbiguousQuestion = matchesAny(text, AMBIGUOUS_ENTITY_QUESTION_PATTERNS);
  if (!hasAmbiguousQuestion) return false;

  return matchesAny(text, ENTITY_HINT_PATTERNS);
}

export function detectQueryIntentT4Frozen(query) {
  if (typeof query !== "string") return "GENERAL";
  const normalized = query.trim();
  if (!normalized) return "GENERAL";

  if (matchesAny(normalized, WHY_PATTERNS)) return "WHY";
  if (matchesAny(normalized, WHEN_PATTERNS)) return "WHEN";
  if (isEntityIntentT4(normalized)) return "ENTITY";

  return "GENERAL";
}

export function baselineFingerprint() {
  return {
    version: T4_BASELINE_VERSION,
    rules: {
      whyPatterns: WHY_PATTERNS.length,
      whenPatterns: WHEN_PATTERNS.length,
      entityStrongPatterns: STRONG_ENTITY_PATTERNS.length,
      entityNounPatterns: ENTITY_NOUN_PATTERNS.length,
      entityHintPatterns: ENTITY_HINT_PATTERNS.length,
    },
  };
}
