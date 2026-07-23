/**
 * Silent Sentinel Edge ↔ Cloud Bridge
 *
 * Lightweight ingest + query endpoint for pipeline outputs from
 * silent-sentinel-edge (Jetson Orin Nano / CDTFW pipeline).
 *
 * POST /api/silent-sentinel/events  – ingest one or more pipeline results
 * GET  /api/silent-sentinel/events  – list recent events (newest first)
 *
 * Auth (optional): header X-Silent-Sentinel-Key must match env SILENT_SENTINEL_INGEST_KEY
 * when that env var is set. Open in local/dev when the key is unset.
 *
 * Storage: Upstash Redis list when configured; otherwise an in-memory ring buffer
 * (works for `npm run dev` / local Node). Max 50 events kept.
 */

import { jsonResponse } from '../_json-response.js';
import { getCorsHeaders, getPublicCorsHeaders, isDisallowedOrigin } from '../_cors.js';
import { getRedisCredentials, redisPipeline } from '../_upstash-json.js';

export const config = { runtime: 'edge' };

const REDIS_KEY = 'ss:events';
const MAX_EVENTS = 50;
const MEMORY_TTL_MS = 24 * 60 * 60 * 1000; // 24h for local buffer

// Module-level fallback for local/dev (stateless edge will not share this across isolates)
const memoryStore: Array<Record<string, unknown>> = [];

function makeId(): string {
  return `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizePayload(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;

  // Accept either the full pipeline result or a pre-shaped event
  const event = (raw.event && typeof raw.event === 'object' ? raw.event : raw) as Record<string, unknown>;
  if (!event.description && !event.type) return null;

  const alignment =
    raw.alignment && typeof raw.alignment === 'object'
      ? (raw.alignment as Record<string, unknown>)
      : {
          human_in_loop_required: true,
          escalation_flags: [],
          authority_gaps: [],
          ethical_notes: [],
          recommended_action: 'Present to human operator for decision',
        };

  return {
    id: typeof raw.id === 'string' ? raw.id : makeId(),
    receivedAt: new Date().toISOString(),
    event: {
      type: String(event.type ?? 'unknown'),
      description: String(event.description ?? ''),
      features: event.features && typeof event.features === 'object' ? event.features : {},
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

async function pushEvent(ev: Record<string, unknown>): Promise<void> {
  const creds = getRedisCredentials();
  if (creds) {
    const payload = JSON.stringify(ev);
    await redisPipeline([
      ['LPUSH', REDIS_KEY, payload],
      ['LTRIM', REDIS_KEY, '0', String(MAX_EVENTS - 1)],
      ['EXPIRE', REDIS_KEY, String(60 * 60 * 24 * 7)], // 7 days
    ]);
    return;
  }

  // Local / no-Redis fallback
  memoryStore.unshift(ev);
  if (memoryStore.length > MAX_EVENTS) memoryStore.length = MAX_EVENTS;
}

async function listEvents(limit = 20): Promise<Record<string, unknown>[]> {
  const creds = getRedisCredentials();
  if (creds) {
    const results = await redisPipeline([['LRANGE', REDIS_KEY, '0', String(Math.min(limit, MAX_EVENTS) - 1)]]);
    if (results && results[0]?.result && Array.isArray(results[0].result)) {
      return (results[0].result as string[])
        .map((s) => {
          try {
            return JSON.parse(s) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Record<string, unknown>[];
    }
    return [];
  }

  // Prune stale local entries
  const now = Date.now();
  while (
    memoryStore.length &&
    typeof memoryStore[memoryStore.length - 1].receivedAt === 'string' &&
    now - Date.parse(memoryStore[memoryStore.length - 1].receivedAt as string) > MEMORY_TTL_MS
  ) {
    memoryStore.pop();
  }
  return memoryStore.slice(0, limit);
}

function checkAuth(req: Request): boolean {
  const required = process.env.SILENT_SENTINEL_INGEST_KEY;
  if (!required) return true; // open when unset (local/dev)
  const provided =
    req.headers.get('X-Silent-Sentinel-Key') ||
    req.headers.get('x-silent-sentinel-key') ||
    '';
  return provided === required;
}

export default async function handler(req: Request): Promise<Response> {
  if (isDisallowedOrigin(req)) {
    return jsonResponse({ error: 'origin_not_allowed' }, 403);
  }

  const cors = getCorsHeaders(req, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, MAX_EVENTS);
    const events = await listEvents(limit);
    return jsonResponse(
      {
        source: 'silent-sentinel-bridge',
        count: events.length,
        events,
        storage: getRedisCredentials() ? 'redis' : 'memory',
      },
      200,
      { ...cors, 'Cache-Control': 'no-store' },
    );
  }

  if (req.method === 'POST') {
    if (!checkAuth(req)) {
      return jsonResponse({ error: 'unauthorized' }, 401, cors);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400, cors);
    }

    // Accept single object or array
    const items = Array.isArray(body) ? body : [body];
    const accepted: Record<string, unknown>[] = [];

    for (const item of items) {
      const normalized = normalizePayload(item);
      if (normalized) {
        await pushEvent(normalized);
        accepted.push(normalized);
      }
    }

    if (accepted.length === 0) {
      return jsonResponse(
        { error: 'no_valid_events', hint: 'Provide pipeline result with event.description / event.type' },
        400,
        cors,
      );
    }

    return jsonResponse(
      { ok: true, accepted: accepted.length, ids: accepted.map((e) => e.id) },
      201,
      cors,
    );
  }

  return jsonResponse({ error: 'method_not_allowed' }, 405, {
    ...cors,
    Allow: 'GET, POST, OPTIONS',
  });
}
