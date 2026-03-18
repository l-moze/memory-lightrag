import type { ServerResponse } from "node:http";

export type SseEvent = {
  id: string;
  event: string;
  data: unknown;
};

export function writeSse(res: ServerResponse, evt: SseEvent): void {
  // NOTE: data must be a single line per SSE spec; we JSON.stringify it.
  res.write(`id: ${evt.id}\n`);
  res.write(`event: ${evt.event}\n`);
  res.write(`data: ${JSON.stringify(evt.data)}\n\n`);
}

export function writeSseComment(res: ServerResponse, comment: string): void {
  res.write(`: ${comment}\n\n`);
}
