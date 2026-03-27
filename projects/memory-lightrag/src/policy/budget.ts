export function clampTopK(topK: number, fallback = 6): number {
  const v = Number.isFinite(topK) ? Math.floor(topK) : fallback;
  return Math.max(1, Math.min(20, v));
}

export function clampToBudget(text: string, budgetChars: number): { text: string; truncated: boolean } {
  if (text.length <= budgetChars) return { text, truncated: false };
  return { text: text.slice(0, budgetChars), truncated: true };
}
