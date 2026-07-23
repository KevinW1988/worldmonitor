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

## Colorado focus (Denver metro P0)

Geographic preset for **Colorado**, with the **Denver–Aurora–Lakewood metropolitan area** as highest focus, plus **professional/public government activity only** (no personal tracking).

- Guide: **[docs/SILENT_SENTINEL_COLORADO.md](docs/SILENT_SENTINEL_COLORADO.md)**
- Config: **[data/silent-sentinel/colorado-focus.json](data/silent-sentinel/colorado-focus.json)**

**Local Colorado dashboard:**

```
http://localhost:3000/dashboard?lat=39.7392&lon=-104.9903&zoom=8.5&view=colorado&timeRange=7d&layers=conflicts,hotspots,sanctions,weather,outages,natural&silentSentinel=1
```

**Denver metro (higher zoom):**

```
http://localhost:3000/dashboard?lat=39.7392&lon=-104.9903&zoom=10.5&view=denver-metro&timeRange=7d&layers=conflicts,hotspots,weather,outages,natural&silentSentinel=1
```

Officials are tracked only via **public titles, calendars, open meetings, legislation, filings, and CORA-accessible records** — never private life.

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

### UI panel

Enable with `?silentSentinel=1` or `localStorage.setItem('wm:silentSentinel', '1')`.

---

## Remaining Silent Sentinel Integration Directions

1. ~~**Edge ↔ Cloud bridge**~~ — **done**
2. ~~**Colorado / Denver metro focus + professional gov tracking**~~ — **docs + config**
3. **Shared local AI** — align Ollama with edge model choices
4. **Human-aligned overlays** — deeper map/brief integration
5. **Passive RF / geo markers** — when edge events carry location
6. **CDTFW lens** — four-questions views on global + Colorado events

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
