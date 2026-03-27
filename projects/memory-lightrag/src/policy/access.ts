import type { MemoryDomain } from "./domain-routing.js";
import fs from "node:fs";
import path from "node:path";

export interface AccessPolicyError {
  code: "DOMAIN_WORKSPACE_DENY" | "CONTEXT_INCOMPLETE" | "WORKSPACE_FORGED";
  message: string;
  domain: MemoryDomain;
  requestedWorkspace?: string;
  allowedWorkspaces: string[];
  downgradeToSharedAllowed: boolean;
}

export interface AccessPolicyConfig {
  sharedWorkspace?: string;
  allowSafeDowngrade?: boolean;
}

function writeAccessAudit(event: Record<string, unknown>) {
  try {
    const dir = path.resolve(process.cwd(), "audit");
    fs.mkdirSync(dir, { recursive: true });
    const line = `${new Date().toISOString()} ${JSON.stringify(event)}\n`;
    fs.appendFileSync(path.join(dir, "security-domain-access.log"), line, "utf8");
  } catch (err) {
    // non-blocking; surface to main stderr for ops visibility
    // eslint-disable-next-line no-console
    console.error("[memory-lightrag] access audit write failed", err);
  }
}

export function resolveAllowedWorkspaces(params: {
  domain: MemoryDomain;
  actorUserId?: string | null;
  groupId?: string | null;
  sharedWorkspace?: string;
}): string[] {
  const shared = params.sharedWorkspace || "global_shared";
  if (params.domain === "personal") {
    return [`u_${params.actorUserId || "anonymous"}`, shared];
  }
  if (params.domain === "group") {
    if (!params.groupId) return [];
    return [`g_${params.groupId}`, shared];
  }
  return [shared];
}

export function enforceWorkspace(params: {
  domain: MemoryDomain;
  requestedWorkspace: string;
  allowedWorkspaces: string[];
  allowSafeDowngrade?: boolean;
  sharedWorkspace?: string;
}): { ok: true; workspace: string } | { ok: false; error: AccessPolicyError; fallbackWorkspace?: string } {
  const shared = params.sharedWorkspace || "global_shared";
  if (params.allowedWorkspaces.length === 0) {
    const error: AccessPolicyError = {
      code: "CONTEXT_INCOMPLETE",
      message: "Missing required context for this domain",
      domain: params.domain,
      requestedWorkspace: params.requestedWorkspace,
      allowedWorkspaces: [],
      downgradeToSharedAllowed: false,
    };
    writeAccessAudit({ event: "deny", error });
    return { ok: false, error };
  }

  if (params.allowedWorkspaces.includes(params.requestedWorkspace)) {
    return { ok: true, workspace: params.requestedWorkspace };
  }

  const downgrade = Boolean(params.allowSafeDowngrade) && params.domain === "group" && params.allowedWorkspaces.includes(shared);

  const error: AccessPolicyError = {
    code: "DOMAIN_WORKSPACE_DENY",
    message: `Workspace ${params.requestedWorkspace} is not allowed for domain ${params.domain}`,
    domain: params.domain,
    requestedWorkspace: params.requestedWorkspace,
    allowedWorkspaces: params.allowedWorkspaces,
    downgradeToSharedAllowed: downgrade,
  };
  writeAccessAudit({ event: "deny", error });
  return {
    ok: false,
    fallbackWorkspace: downgrade ? shared : undefined,
    error,
  };
}
