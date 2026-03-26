export type QueryIntent = "WHY" | "WHEN" | "ENTITY" | "GENERAL";

const WHY_PATTERNS: RegExp[] = [
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

const WHEN_PATTERNS: RegExp[] = [
  /\bwhen\b/i,
  /\btime\b/i,
  /\bdate\b/i,
  /\btimeline\b/i,
  /\bbefore\b/i,
  /\bafter\b/i,
  /\bduring\b/i,
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
];

const ENTITY_PATTERNS: RegExp[] = [
  /\bwho\b/i,
  /\bwhat\b/i,
  /\bwhich\b/i,
  /\bwhere\b/i,
  /\bperson\b/i,
  /\bpeople\b/i,
  /\bteam\b/i,
  /\bproject\b/i,
  /\bfile\b/i,
  /\bdoc(?:ument)?\b/i,
  /\bentity\b/i,
  /谁/,
  /什么/,
  /哪个/,
  /哪位/,
  /哪里/,
  /人员/,
  /成员/,
  /组织/,
  /团队/,
  /项目/,
  /文件/,
  /文档/,
  /实体/,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectQueryIntent(query: string): QueryIntent {
  if (typeof query !== "string") return "GENERAL";

  const normalized = query.trim();
  if (!normalized) return "GENERAL";

  if (matchesAny(normalized, WHY_PATTERNS)) return "WHY";
  if (matchesAny(normalized, WHEN_PATTERNS)) return "WHEN";
  if (matchesAny(normalized, ENTITY_PATTERNS)) return "ENTITY";

  return "GENERAL";
}
