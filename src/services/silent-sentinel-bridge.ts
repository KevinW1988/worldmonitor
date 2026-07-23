/**
 * Silent Sentinel Edge ↔ Cloud Bridge – client service
 *
 * Polls /api/silent-sentinel/events and exposes a small pub/sub for UI panels.
 * When the API is unavailable (plain Vite dev without Vercel functions),
 * falls back to localStorage so demos still work.
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
const LS_KEY = 'ss:events';
const MAX_LOCAL = 50;

function makeId(): string {
  return `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function readLocal(): SilentSentinelEvent[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SilentSentinelEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(events: SilentSentinelEvent[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(events.slice(0, MAX_LOCAL)));
  } catch {
    /* quota / private mode */
  }
}

function normalizeLocal(payload: unknown): SilentSentinelEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  const event = (raw.event && typeof raw.event === 'object' ? raw.event : raw) as Record<
    string,
    unknown
  >;
  if (!event.description && !event.type) return null;
  const alignment =
    raw.alignment && typeof raw.alignment === 'object'
      ? (raw.alignment as Record<string, unknown>)
      : {};
  return {
    id: typeof raw.id === 'string' ? raw.id : makeId(),
    receivedAt: new Date().toISOString(),
    event: {
      type: String(event.type ?? 'unknown'),
      description: String(event.description ?? ''),
      features: event.features && typeof event.features === 'object' ? (event.features as Record<string, unknown>) : {},
      timestamp: typeof event.timestamp === 'number' ? event.timestamp : Date.now() / 1000,
      source: String(event.source ?? 'silent_sentinel_edge'),
    },
    four_questions: typeof raw.four_questions === 'string' ? raw.four_questions : undefined,
    levels: typeof raw.levels === 'string' ? raw.levels : undefined,
    convergence: typeof raw.convergence === 'string' ? raw.convergence : undefined,
    alignment: {
      human_in_loop_required: Boolean(alignment.human_in_loop_required ?? true),
      escalation_flags: Array.isArray(alignment.escalation_flags)
        ? alignment.escalation_flags.map(String)
        : [],
      authority_gaps: Array.isArray(alignment.authority_gaps)
        ? alignment.authority_gaps.map(String)
        : [],
      ethical_notes: Array.isArray(alignment.ethical_notes)
        ? alignment.ethical_notes.map(String)
        : [],
      recommended_action: String(
        alignment.recommended_action ?? 'Present to human operator for decision',
      ),
    },
  };
}

class SilentSentinelBridge {
  private events: SilentSentinelEvent[] = [];
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private pollMs = DEFAULT_POLL_MS;
  private baseUrl = '';
  private running = false;
  private mode: 'api' | 'local' = 'api';

  configure(opts: { baseUrl?: string; pollMs?: number } = {}) {
    if (opts.baseUrl !== undefined) this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    if (opts.pollMs !== undefined) this.pollMs = Math.max(2_000, opts.pollMs);
  }

  getMode() {
    return this.mode;
  }

  getEvents(): SilentSentinelEvent[] {
    return this.events.slice();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
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
        /* ignore */
      }
    }
  }

  async fetchOnce(): Promise<SilentSentinelEvent[]> {
    const url = `${this.baseUrl}/api/silent-sentinel/events?limit=30`;
    try {
      const resp = await fetch(url, { credentials: 'same-origin' });
      if (resp.ok) {
        const data = (await resp.json()) as { events?: SilentSentinelEvent[] };
        this.events = Array.isArray(data.events) ? data.events : [];
        this.mode = 'api';
        this.notify();
        return this.events;
      }
    } catch {
      /* fall through to local */
    }
    this.events = readLocal();
    this.mode = 'local';
    this.notify();
    return this.events;
  }

  start() {
    if (this.running) return;
    this.running = true;
    void this.fetchOnce();
    this.timer = setInterval(() => {
      void this.fetchOnce();
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
   * Ingest a pipeline result. Tries the API first; on failure stores locally.
   */
  async ingest(payload: unknown, key?: string): Promise<{ ok: boolean; ids?: string[]; mode?: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers['X-Silent-Sentinel-Key'] = key;
    try {
      const resp = await fetch(`${this.baseUrl}/api/silent-sentinel/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { ok: boolean; ids?: string[] };
        await this.fetchOnce();
        return { ...data, mode: 'api' };
      }
    } catch {
      /* local fallback */
    }

    const items = Array.isArray(payload) ? payload : [payload];
    const accepted: SilentSentinelEvent[] = [];
    for (const item of items) {
      const n = normalizeLocal(item);
      if (n) accepted.push(n);
    }
    if (!accepted.length) return { ok: false, mode: 'local' };
    const next = [...accepted, ...readLocal()].slice(0, MAX_LOCAL);
    writeLocal(next);
    this.events = next;
    this.mode = 'local';
    this.notify();
    return { ok: true, ids: accepted.map((e) => e.id), mode: 'local' };
  }

  /** Inject the two default demo events from Silent Sentinel config. */
  async injectDemoEvents(): Promise<void> {
    const demos = [
      {
        event: {
          type: 'passive_rf',
          description: 'Anomalous low-power L-band emission, intermittent, moving slowly',
          features: { frequency_mhz: 1250, bandwidth_mhz: 2.5, power_dbm: -85, confidence: 0.78 },
          timestamp: Date.now() / 1000,
          source: 'silent_sentinel_edge',
        },
        four_questions: '**Employment** — Cue passive collection and operator review.\n**Exploitation** — Adversary may spoof L-band signatures.\n**Defeat** — Frequency agility / EMCON.\n**Governance** — Human authorization required before any active response.\n\n**Net Strategic Value** — Cue-only; low confidence until corroborated.',
        alignment: {
          human_in_loop_required: true,
          escalation_flags: [],
          authority_gaps: [],
          ethical_notes: [],
          recommended_action: 'Display full analysis to human operator. Passive observation only.',
        },
      },
      {
        event: {
          type: 'local_ai_detection',
          description: 'Edge YOLO / classifier flagged possible small UAS silhouette at long range',
          features: { class: 'possible_uas', range_m: 3200, confidence: 0.65 },
          timestamp: Date.now() / 1000,
          source: 'silent_sentinel_edge',
        },
        four_questions: '**Employment** — Cue EO/IR or secondary sensor.\n**Exploitation** — Decoys / birds may generate false positives.\n**Defeat** — Signature reduction, timing.\n**Governance** — Confidence below threshold — treat as cue only.\n\n**Net Strategic Value** — Decision advantage only after human corroboration.',
        alignment: {
          human_in_loop_required: true,
          escalation_flags: ['Confidence below threshold – treat as cue only, not confirmed track'],
          authority_gaps: [],
          ethical_notes: [],
          recommended_action: 'Present to human operator. Do not autonomously task beyond passive cueing.',
        },
      },
    ];
    await this.ingest(demos);
  }
}

/** Singleton used by the dashboard panel. */
export const silentSentinelBridge = new SilentSentinelBridge();
