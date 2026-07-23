/**
 * Silent Sentinel Edge ↔ Cloud Bridge – client service
 *
 * Polls /api/silent-sentinel/events and exposes a small pub/sub for UI panels.
 * Designed to be drop-in and side-effect free until start() is called.
 */

export interface SilentSentinelAlignment {
  human_in_loop_required: boolean;
  escalation_flags: string[];
  authority_gaps: string[];
  ethical_notes: string[];
  recommended_action: string;
}

export interface SilentSentinelEventPayload {
  type: string;
  description: string;
  features: Record<string, unknown>;
  timestamp: number;
  source: string;
}

export interface SilentSentinelEvent {
  id: string;
  receivedAt: string;
  event: SilentSentinelEventPayload;
  four_questions?: string;
  levels?: string;
  convergence?: string;
  alignment: SilentSentinelAlignment;
}

type Listener = (events: SilentSentinelEvent[]) => void;

const DEFAULT_POLL_MS = 8_000;

class SilentSentinelBridge {
  private events: SilentSentinelEvent[] = [];
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private pollMs = DEFAULT_POLL_MS;
  private baseUrl = '';
  private running = false;

  /** Optional base URL override (e.g. full origin when embedding). */
  configure(opts: { baseUrl?: string; pollMs?: number } = {}) {
    if (opts.baseUrl !== undefined) this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    if (opts.pollMs !== undefined) this.pollMs = Math.max(2_000, opts.pollMs);
  }

  getEvents(): SilentSentinelEvent[] {
    return this.events.slice();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    // immediate push of current state
    try {
      fn(this.getEvents());
    } catch {
      /* ignore */
    }
    return () => this.listeners.delete(fn);
  }

  private notify() {
    const snapshot = this.getEvents();
    for (const fn of this.listeners) {
      try {
        fn(snapshot);
      } catch {
        /* ignore listener errors */
      }
    }
  }

  async fetchOnce(): Promise<SilentSentinelEvent[]> {
    const url = `${this.baseUrl}/api/silent-sentinel/events?limit=30`;
    const resp = await fetch(url, { credentials: 'same-origin' });
    if (!resp.ok) throw new Error(`bridge fetch ${resp.status}`);
    const data = (await resp.json()) as { events?: SilentSentinelEvent[] };
    this.events = Array.isArray(data.events) ? data.events : [];
    this.notify();
    return this.events;
  }

  start() {
    if (this.running) return;
    this.running = true;
    void this.fetchOnce().catch(() => {
      /* first poll may fail before server is up */
    });
    this.timer = setInterval(() => {
      void this.fetchOnce().catch(() => {
        /* keep polling */
      });
    }, this.pollMs);
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Convenience: post a pipeline result from the browser (e.g. demos).
   * Prefer the Python edge client for real deployments.
   */
  async ingest(payload: unknown, key?: string): Promise<{ ok: boolean; ids?: string[] }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers['X-Silent-Sentinel-Key'] = key;
    const resp = await fetch(`${this.baseUrl}/api/silent-sentinel/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok) await this.fetchOnce();
    return data as { ok: boolean; ids?: string[] };
  }
}

/** Singleton used by the dashboard panel. */
export const silentSentinelBridge = new SilentSentinelBridge();
