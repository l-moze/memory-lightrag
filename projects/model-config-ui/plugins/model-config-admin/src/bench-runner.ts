import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { streamOpenAIChat } from "./openai-client.js";

export type BenchMetrics = {
  ttftMs?: number;
  totalMs?: number;
  tps?: number;
  tokensIn?: number;
  tokensOut?: number;
  statusCode?: number;
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export type BenchRunnerInput = {
  modelId: string;
  messages: { role: string; content: string }[];
  repeat: number;
  baseUrl: string;
  apiKey?: string;
  requestTimeoutMs?: number;
};

export type BenchRunnerEvent =
  | { type: "request"; attempt: number }
  | { type: "first_token"; attempt: number }
  | { type: "usage"; attempt: number; tokensIn?: number; tokensOut?: number }
  | { type: "done"; attempt: number; metrics: BenchMetrics };

export type BenchRunner = {
  run: (params: {
    api: OpenClawPluginApi;
    input: BenchRunnerInput;
    onEvent: (evt: BenchRunnerEvent) => void;
    signal: AbortSignal;
  }) => Promise<void>;
};

export const defaultBenchRunner: BenchRunner = {
  async run({ input, onEvent, signal }) {
    for (let attempt = 1; attempt <= input.repeat; attempt++) {
      if (signal.aborted) throw new Error("CANCELLED");
      onEvent({ type: "request", attempt });

      const metrics = await streamOpenAIChat({
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        model: input.modelId,
        messages: input.messages,
        signal,
        requestTimeoutMs: input.requestTimeoutMs ?? 120_000,
      });

      onEvent({
        type: "done",
        attempt,
        metrics: {
          ok: metrics.ok,
          ttftMs: metrics.ttftMs,
          totalMs: metrics.totalMs,
          tps: metrics.tps,
          tokensIn: metrics.tokensIn,
          tokensOut: metrics.tokensOut,
          statusCode: metrics.statusCode,
          errorCode: metrics.errorCode,
          errorMessage: metrics.errorMessage,
        },
      });
    }
  },
};
