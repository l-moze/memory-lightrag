export type MemoryDomain = "personal" | "group" | "shared";

export interface DomainContext {
  channel: "telegram" | "feishu" | "webchat" | "discord" | "unknown";
  chatType: "direct" | "group";
  sessionKey: string;
  threadId?: string | null;
  groupId?: string | null;
  actorUserId?: string | null;
  mentionTarget?: "bot" | "none";
}

export interface DomainDecision {
  domain: MemoryDomain;
  reasonCode:
    | "DIRECT_CHAT"
    | "GROUP_CHAT"
    | "MENTION_IN_GROUP"
    | "UNKNOWN_CHANNEL_FALLBACK";
}

function inferChannelFromSessionKey(sessionKey: string): DomainContext["channel"] {
  if (sessionKey.includes(":telegram:")) return "telegram";
  if (sessionKey.includes(":feishu:")) return "feishu";
  if (sessionKey.includes(":webchat:")) return "webchat";
  if (sessionKey.includes(":discord:")) return "discord";
  return "unknown";
}

export function buildDomainContext(sessionKey: string): DomainContext {
  const isGroup = /:group:/.test(sessionKey);
  const groupMatch = sessionKey.match(/:group:([^:]+)/);
  return {
    channel: inferChannelFromSessionKey(sessionKey),
    chatType: isGroup ? "group" : "direct",
    sessionKey,
    groupId: groupMatch?.[1] ?? null,
    mentionTarget: /:group:/.test(sessionKey) ? "bot" : "none",
  };
}

export function deriveRequestDomain(ctx: DomainContext): DomainDecision {
  if (ctx.chatType === "direct") {
    return { domain: "personal", reasonCode: "DIRECT_CHAT" };
  }
  if (ctx.chatType === "group") {
    if (ctx.mentionTarget === "bot") {
      return { domain: "group", reasonCode: "MENTION_IN_GROUP" };
    }
    return { domain: "group", reasonCode: "GROUP_CHAT" };
  }
  return { domain: "group", reasonCode: "UNKNOWN_CHANNEL_FALLBACK" };
}

export function toWorkspace(domain: MemoryDomain, actorUserId?: string | null, groupId?: string | null, sharedWorkspace = "global_shared") {
  if (domain === "personal") return `u_${actorUserId || "anonymous"}`;
  if (domain === "group") return `g_${groupId || "unknown"}`;
  return sharedWorkspace;
}
