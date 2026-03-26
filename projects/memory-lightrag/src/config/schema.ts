/**
 * Runtime-only schema/constants to avoid external deps in local plugin loading.
 */

export interface LightragConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

export interface DomainConfig {
  personalPrefix?: string;
  groupPrefix?: string;
  sharedWorkspace?: string;
}

export interface AccessConfig {
  allowSafeDowngrade?: boolean;
}

export interface IntentScoredRoutingConfig {
  enabled?: boolean;
  minTopScore?: number;
  minMargin?: number;
}

export interface IntentConfig {
  scoredRouting?: IntentScoredRoutingConfig;
}

export interface MemoryLightragConfig {
  lightrag?: LightragConfig;
  fallbackEnabled?: boolean;
  verbose?: boolean;
  domains?: DomainConfig;
  access?: AccessConfig;
  intent?: IntentConfig;
}

export const MemoryLightragConfigSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    lightrag: {
      type: "object",
      additionalProperties: true,
      properties: {
        baseUrl: { type: "string", default: "http://lightrag:9621" },
        apiKey: { type: "string" },
        timeout: { type: "number", default: 30000 },
      },
    },
    fallbackEnabled: { type: "boolean", default: true },
    verbose: { type: "boolean", default: false },
    domains: {
      type: "object",
      additionalProperties: true,
      properties: {
        personalPrefix: { type: "string", default: "u_" },
        groupPrefix: { type: "string", default: "g_" },
        sharedWorkspace: { type: "string", default: "global_shared" },
      },
    },
    access: {
      type: "object",
      additionalProperties: true,
      properties: {
        allowSafeDowngrade: { type: "boolean", default: false },
      },
    },
    intent: {
      type: "object",
      additionalProperties: true,
      properties: {
        scoredRouting: {
          type: "object",
          additionalProperties: true,
          properties: {
            enabled: { type: "boolean", default: true },
            minTopScore: { type: "number", default: 0.9 },
            minMargin: { type: "number", default: 0.35 },
          },
        },
      },
    },
  },
} as const;
