import type { IncomingMessage } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export type OpenAIChatMessage = { role: string; content: string };

export type OpenAIStreamMetrics = {
  ttftMs?: number;
  totalMs: number;
  tps?: number;
  tokensIn?: number;
  tokensOut?: number;
  statusCode?: number;
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
};

function pickRequest(url: URL) {
  return url.protocol === "https:" ? httpsRequest : httpRequest;
}

export async function streamOpenAIChat(params: {
  baseUrl: string;
  apiKey?: string;
  model: string;
  messages: OpenAIChatMessage[];
  signal?: AbortSignal;
  requestTimeoutMs?: number;
}): Promise<OpenAIStreamMetrics> {
  const { baseUrl, apiKey, model, messages, signal, requestTimeoutMs } = params;

  const url = new URL(baseUrl.endsWith("/") ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`);
  const body = JSON.stringify({
    model,
    messages,
    stream: true,
  });

  const start = Date.now();
  let firstTokenAt: number | undefined;
  let tokensOut = 0;
  let tokensIn: number | undefined;

  const reqInit = pickRequest(url);
  const req = reqInit(
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
    },
  );

  const res: IncomingMessage = await new Promise((resolve, reject) => {
    req.on("response", resolve);
    req.on("error", reject);
    if (signal) {
      if (signal.aborted) {
        req.destroy(new Error("ABORTED"));
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          req.destroy(new Error("ABORTED"));
        },
        { once: true },
      );
    }
    if (requestTimeoutMs) {
      req.setTimeout(requestTimeoutMs, () => {
        req.destroy(new Error("TIMEOUT"));
      });
    }
    req.write(body);
    req.end();
  });

  const statusCode = res.statusCode ?? 0;
  if (statusCode < 200 || statusCode >= 300) {
    const errBody = await readStreamToString(res);
    return {
      ok: false,
      totalMs: Date.now() - start,
      statusCode,
      errorCode: "HTTP_ERROR",
      errorMessage: errBody.slice(0, 4000),
    };
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  for await (const chunk of res) {
    const text = decoder.decode(chunk as Buffer, { stream: true });
    buffer += text;

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const lines = rawEvent.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === "[DONE]") continue;

        if (!firstTokenAt) firstTokenAt = Date.now();

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta;
          if (delta?.content) {
            tokensOut += countTokens(delta.content);
          }
          if (parsed?.usage) {
            tokensIn = parsed.usage.prompt_tokens ?? tokensIn;
            tokensOut = parsed.usage.completion_tokens ?? tokensOut;
          }
        } catch {
          // ignore parse errors from partial chunks
        }
      }
    }
  }

  const totalMs = Date.now() - start;
  const ttftMs = firstTokenAt ? firstTokenAt - start : undefined;
  const tps = tokensOut && totalMs > 0 ? (tokensOut / totalMs) * 1000 : undefined;

  return {
    ok: true,
    totalMs,
    ttftMs,
    tps,
    tokensIn,
    tokensOut,
    statusCode,
  };
}

function countTokens(text: string): number {
  if (!text) return 0;
  // rough estimate: 1 token ~= 4 chars for latin, 1 token ~= 1 char for CJK.
  const hasCjk = /[\u4E00-\u9FFF]/.test(text);
  if (hasCjk) return text.length;
  return Math.max(1, Math.ceil(text.length / 4));
}

async function readStreamToString(res: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of res) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
