import { nanoid } from "nanoid";

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type RunRecord = {
  id: string;
  status: RunStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  input: unknown;
  output?: unknown;
  error?: { code: string; message: string };

  // Browser-friendly per-run token (used for SSE + status/cancel without Authorization header)
  runToken?: string;

  // bounded event buffer for SSE replay
  events: { id: string; event: string; data: any }[];
  nextSeq: number;
  doneAt?: number;
};

export type RunSubscriber = {
  runId: string;
  lastSentId?: string;
  send: (evt: { id: string; event: string; data: any }) => void;
  close: () => void;
};

export class InMemoryRunStore {
  private readonly runs = new Map<string, RunRecord>();
  private readonly maxEvents: number;
  private readonly retainDoneMs: number;
  private readonly subscribers = new Map<string, Set<RunSubscriber>>();

  constructor(params: { maxEvents: number; retainDoneMs: number }) {
    this.maxEvents = params.maxEvents;
    this.retainDoneMs = params.retainDoneMs;

    // GC timer
    setInterval(() => this.gc(), 30_000).unref();
  }

  createRun(input: unknown): RunRecord {
    const id = `run_${nanoid(16)}`;
    const nowIso = new Date().toISOString();
    const run: RunRecord = {
      id,
      status: "queued",
      createdAt: nowIso,
      input,
      runToken: `run_${nanoid(32)}`,
      events: [],
      nextSeq: 1,
    };
    this.runs.set(id, run);
    return run;
  }

  getRun(id: string): RunRecord | undefined {
    return this.runs.get(id);
  }

  setStatus(id: string, status: RunStatus): void {
    const run = this.runs.get(id);
    if (!run) return;
    run.status = status;
    if (status === "running") {
      run.startedAt = new Date().toISOString();
    }
    if (status === "succeeded" || status === "failed" || status === "cancelled") {
      run.completedAt = new Date().toISOString();
      run.doneAt = Date.now();
    }
  }

  pushEvent(runId: string, event: string, data: unknown): { id: string; event: string; data: any } | null {
    const run = this.runs.get(runId);
    if (!run) return null;
    const evtId = `evt_${String(run.nextSeq++).padStart(8, "0")}`;
    const payload = { id: evtId, ts: new Date().toISOString(), runId, type: event, data };
    const stored = { id: evtId, event, data: payload };
    run.events.push(stored);
    if (run.events.length > this.maxEvents) {
      run.events.splice(0, run.events.length - this.maxEvents);
    }

    const subs = this.subscribers.get(runId);
    if (subs && subs.size) {
      for (const sub of subs) {
        try {
          sub.send(stored);
        } catch {
          // subscriber will be cleaned up by close handler
        }
      }
    }

    return stored;
  }

  listEventsSince(runId: string, lastEventId?: string): { id: string; event: string; data: any }[] {
    const run = this.runs.get(runId);
    if (!run) return [];
    if (!lastEventId) return run.events;
    const idx = run.events.findIndex((e) => e.id === lastEventId);
    if (idx === -1) {
      // caller too old or unknown
      return [];
    }
    return run.events.slice(idx + 1);
  }

  addSubscriber(sub: RunSubscriber): void {
    const set = this.subscribers.get(sub.runId) ?? new Set<RunSubscriber>();
    set.add(sub);
    this.subscribers.set(sub.runId, set);
  }

  removeSubscriber(sub: RunSubscriber): void {
    const set = this.subscribers.get(sub.runId);
    if (!set) return;
    set.delete(sub);
    if (set.size === 0) {
      this.subscribers.delete(sub.runId);
    }
  }

  gc(): void {
    const now = Date.now();
    for (const [id, run] of this.runs) {
      if (run.doneAt && now - run.doneAt > this.retainDoneMs) {
        this.runs.delete(id);
        this.subscribers.delete(id);
      }
    }
  }
}
