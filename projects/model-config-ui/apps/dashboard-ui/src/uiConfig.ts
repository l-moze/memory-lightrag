import type { UiConfig } from "./types";

// Minimal extraction from openclaw.json config blob.
// We store UI-specific state under config.__modelConfigAdmin to avoid touching core keys.
const UI_KEY = "__modelConfigAdmin";

export function extractUiConfig(cfg: Record<string, unknown>): UiConfig {
  const anyCfg: any = cfg || {};
  const ui: any = anyCfg[UI_KEY] || {};
  const stableSites = Array.isArray(ui.stableSites) ? ui.stableSites : [];
  const publicSites = Array.isArray(ui.publicSites) ? ui.publicSites : [];
  return { stableSites, publicSites };
}

export function applyUiConfig(cfg: Record<string, unknown>, ui: UiConfig): Record<string, unknown> {
  const anyCfg: any = { ...(cfg || {}) };
  anyCfg[UI_KEY] = {
    stableSites: ui.stableSites,
    publicSites: ui.publicSites,
  };
  return anyCfg;
}
