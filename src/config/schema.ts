export interface LightragConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  retryCount: number;
  recallTopK: number;
  minScore: number;
  recallBudgetChars: number;
  includeCitations: boolean;
  enableSafetyFilter: boolean;
}

const DEFAULTS: Omit<LightragConfig, "baseUrl"> = {
  timeoutMs: 6000,
  retryCount: 1,
  recallTopK: 6,
  minScore: 0.55,
  recallBudgetChars: 1800,
  includeCitations: true,
  enableSafetyFilter: true,
};

export function parseLightragConfig(input: unknown): LightragConfig {
  const cfg = (input ?? {}) as Record<string, unknown>;
  const baseUrl = String(cfg.baseUrl ?? "").trim();
  if (!baseUrl) {
    throw new Error("memory-lightrag: config.baseUrl is required");
  }
  const out: LightragConfig = {
    baseUrl,
    apiKey: typeof cfg.apiKey === "string" ? cfg.apiKey : undefined,
    timeoutMs: Number(cfg.timeoutMs ?? DEFAULTS.timeoutMs),
    retryCount: Number(cfg.retryCount ?? DEFAULTS.retryCount),
    recallTopK: Number(cfg.recallTopK ?? DEFAULTS.recallTopK),
    minScore: Number(cfg.minScore ?? DEFAULTS.minScore),
    recallBudgetChars: Number(cfg.recallBudgetChars ?? DEFAULTS.recallBudgetChars),
    includeCitations:
      typeof cfg.includeCitations === "boolean"
        ? cfg.includeCitations
        : DEFAULTS.includeCitations,
    enableSafetyFilter:
      typeof cfg.enableSafetyFilter === "boolean"
        ? cfg.enableSafetyFilter
        : DEFAULTS.enableSafetyFilter,
  };
  if (out.timeoutMs < 1000 || out.timeoutMs > 30000) throw new Error("timeoutMs out of range");
  if (out.retryCount < 0 || out.retryCount > 3) throw new Error("retryCount out of range");
  if (out.recallTopK < 1 || out.recallTopK > 20) throw new Error("recallTopK out of range");
  if (out.minScore < 0 || out.minScore > 1) throw new Error("minScore out of range");
  if (out.recallBudgetChars < 200 || out.recallBudgetChars > 8000)
    throw new Error("recallBudgetChars out of range");
  return out;
}
