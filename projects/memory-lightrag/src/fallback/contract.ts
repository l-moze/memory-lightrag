import type { MemoryErrorType, MemoryTypedError } from "../types/contracts.js";

export function fallbackError(type: MemoryErrorType, message: string): MemoryTypedError {
  return {
    type,
    message,
    retryable: ["BACKEND_DOWN", "TIMEOUT", "RATE_LIMITED", "UPSTREAM_5XX"].includes(type),
    actionHint: "Switch plugins.slots.memory to memory-core if outage persists",
  };
}
