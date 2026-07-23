# World Monitor — Silent Sentinel Edition

**Fork of [koala73/worldmonitor](https://github.com/koala73/worldmonitor)** customized for **Silent Sentinel** edge AI strategic sensemaking.

Real-time global intelligence dashboard — AI-powered news aggregation, geopolitical monitoring, infrastructure tracking, and decision-advantage signals in a unified situational awareness interface.

This fork is intended to serve as the **strategic / operational awareness layer** that can sit above or alongside the [Silent Sentinel Edge AI](https://github.com/KevinW1988/silent-sentinel-edge) pipeline running on NVIDIA Jetson Orin Nano (passive RF / local sensing + CDTFW-inspired analysis).

---

## Why this fork?

Silent Sentinel answers the edge question:

> How can distributed, passive, locally intelligent sensor systems alter reconnaissance, force protection, signature management, command authority, adversarial countermeasures and escalation risk?

World Monitor provides the complementary **global context**:

- Live geopolitical, military, economic, disaster and escalation feeds
- Country Instability Index (CII) and cross-stream correlation
- Dual map engines (3D globe + WebGL layers) for spatial situational awareness
- Local-first AI (Ollama) that can share models / reasoning style with the edge LLM stack
- Human-aligned design principles that align with Silent Sentinel's governance and override requirements

Together they form a continuum: **edge sensor → local sensemaking → global intelligence dashboard → human decision**.

---

## Quick Start (this fork)

```bash
git clone https://github.com/KevinW1988/worldmonitor.git
cd worldmonitor
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

No environment variables required for basic operation. See `.env.example` for optional API keys that unlock additional feeds.

Variant-specific development:

```bash
npm run dev:tech
npm run dev:finance
npm run dev:commodity
npm run dev:happy
npm run dev:energy
```

---

## Edge ↔ Cloud Bridge (implemented)

Lightweight ingestion of Silent Sentinel pipeline outputs into World Monitor.

### API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/silent-sentinel/events` | Ingest one pipeline result (or an array) |
| `GET`  | `/api/silent-sentinel/events?limit=20` | List recent events (newest first) |

**Auth (optional):** set env `SILENT_SENTINEL_INGEST_KEY`. When set, POST requires header `X-Silent-Sentinel-Key`. When unset, the endpoint is open (convenient for local dev).

**Storage:** Upstash Redis list when `UPSTASH_REDIS_REST_URL` / `TOKEN` are configured; otherwise an in-memory ring buffer (max 50 events) for local `npm run dev`.

**Payload:** the full dict returned by `SilentSentinelPipeline.process_event()`:

```json
{
  "event": {
    "type": "passive_rf",
    "description": "Anomalous low-power L-band emission…",
    "features": { "confidence": 0.78 },
    "timestamp": 1710000000,
    "source": "silent_sentinel_edge"
  },
  "four_questions": "…markdown…",
  "levels": "…",
  "convergence": "…",
  "alignment": {
    "human_in_loop_required": true,
    "escalation_flags": ["…"],
    "authority_gaps": [],
    "ethical_notes": [],
    "recommended_action": "Present to human operator for decision"
  }
}
```

### UI panel

A floating **Silent Sentinel Edge** panel shows the latest alerts (escalation flags, recommended action, human-in-the-loop badge).

Enable it either way:

1. Query string: open `http://localhost:3000/?silentSentinel=1` (or `?ss=1`)
2. Persist: `localStorage.setItem('wm:silentSentinel', '1')` then reload

Or call from code / console:

```ts
import { bootSilentSentinel } from './bootstrap/silent-sentinel';
bootSilentSentinel();
```

Client service lives in `src/services/silent-sentinel-bridge.ts`.

### End-to-end local test

**Terminal 1 — World Monitor**

```bash
cd worldmonitor
npm run dev
# open http://localhost:3000/?silentSentinel=1
```

**Terminal 2 — Edge pipeline**

```bash
cd silent-sentinel-edge
# bridge.enabled: true and url: http://localhost:3000 already in config/settings.yaml
python -m src.main --demo
```

Each processed event is POSTed to the bridge; the panel updates within a few seconds.

Manual smoke test:

```bash
curl -s -X POST http://localhost:3000/api/silent-sentinel/events \
  -H 'Content-Type: application/json' \
  -d '{"event":{"type":"test","description":"Bridge smoke test","features":{"confidence":0.9}},"alignment":{"human_in_loop_required":true,"escalation_flags":[],"recommended_action":"Acknowledge"}}'

curl -s http://localhost:3000/api/silent-sentinel/events | jq .
```

---

## Original Project Features (inherited)

- **500+ curated news feeds** across 15 categories, AI-synthesized into briefs
- **Dual map engine** — 3D globe (globe.gl) and WebGL flat map (deck.gl) with 56 map layer types
- **Cross-stream correlation** — military, economic, disaster, and escalation signal convergence
- **Country Instability Index (CII)** — server-authoritative CII v8 stress scoring for 31 Tier-1 countries
- **Finance radar** — 29 stock exchanges, commodities, crypto, and 7-signal market composite
- **Local AI** — run everything with Ollama, no API keys required
- **6 site variants** from a single codebase (world, tech, finance, commodity, happy, energy)
- **Native desktop app** (Tauri 2) for macOS, Windows, and Linux
- **25 languages** with native-language feeds and RTL support

Full documentation, architecture and data sources remain those of the upstream project: [worldmonitor.app/docs](https://www.worldmonitor.app/docs/documentation).

---

## Remaining Silent Sentinel Integration Directions

1. ~~**Edge ↔ Cloud bridge**~~ — **done** (this commit)
2. **Shared local AI** — align Ollama model choices and prompting style with the edge_llm.py recommendations (qwen2.5:3b, llama3.2:3b, etc.).
3. **Human-aligned overlays** — surface governance / ROE / override indicators more deeply inside existing map layers and briefs.
4. **Passive RF / CAM-Pulse context** — optional map markers driven by edge events that carry geolocation.
5. **CDTFW lens** — optional analysis views that apply the four questions + levels + convergence framing to global events.

---

## License

**AGPL-3.0-only** (same as upstream). See [LICENSE](LICENSE).

This is a research / prototype fork. Always keep a human in the decision loop.

Upstream copyright (C) 2024-2026 Elie Habib / koala73. All rights reserved under the AGPL terms.

---

## Related Repositories

- [Silent Sentinel Edge AI](https://github.com/KevinW1988/silent-sentinel-edge) — Edge strategic sensemaking core for NVIDIA Jetson Orin Nano
- [Upstream World Monitor](https://github.com/koala73/worldmonitor) — Original project

---

*Fork maintained by [KevinW1988](https://github.com/KevinW1988) for Silent Sentinel exploration.*
