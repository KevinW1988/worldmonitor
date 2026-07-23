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

## Quick Start (local)

```bash
git clone https://github.com/KevinW1988/worldmonitor.git
cd worldmonitor
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

No environment variables required for basic operation. See `.env.example` for optional API keys.

---

## Deploy to Vercel (permanent public URL)

**Full walkthrough:** **[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)**

Short version:

1. [vercel.com/new](https://vercel.com/new) → Import **KevinW1988/worldmonitor**
2. Framework **Vite**, build `npm run build`, output `dist`, Node **20**
3. Deploy (no env vars required for FWI)
4. Use your `*.vercel.app` host in the links below

**After deploy — FWI dashboard:**

```
https://YOUR_DEPLOY.vercel.app/dashboard?lat=39.7392&lon=-104.9903&zoom=8.0&view=colorado-fwi&timeRange=7d&layers=conflicts,hotspots,weather,outages,natural&fwi=1&silentSentinel=1
```

**Live FWI API:**

```
https://YOUR_DEPLOY.vercel.app/api/silent-sentinel/fwi
```

---

## Colorado focus (Denver metro P0)

- Guide: **[docs/SILENT_SENTINEL_COLORADO.md](docs/SILENT_SENTINEL_COLORADO.md)**
- Config: **[data/silent-sentinel/colorado-focus.json](data/silent-sentinel/colorado-focus.json)**

**Local Colorado dashboard:**

```
http://localhost:3000/dashboard?lat=39.7392&lon=-104.9903&zoom=8.5&view=colorado&timeRange=7d&layers=conflicts,hotspots,sanctions,weather,outages,natural&silentSentinel=1
```

Officials: **professional/public activity only** (no personal tracking).

---

## ACTIVE — Tertiary (3rd-order) task: Fire × Water × Infrastructure

Monitors **cascading** effects: wildfire → water systems → critical infrastructure (and delayed post-fire flood/contamination/policy effects).

- Task: **[docs/TASK_TERTIARY_FIRE_WATER_INFRA.md](docs/TASK_TERTIARY_FIRE_WATER_INFRA.md)**
- Map preset: **[data/silent-sentinel/colorado-fwi-map.json](data/silent-sentinel/colorado-fwi-map.json)**
- Live pulls: NIFC WFIGS (CO fires) + NWS alerts (`/api/silent-sentinel/fwi`)

**FWI map (local):**

```
http://localhost:3000/dashboard?lat=39.7392&lon=-104.9903&zoom=8.0&view=colorado-fwi&timeRange=7d&layers=conflicts,hotspots,weather,outages,natural&fwi=1&silentSentinel=1
```

Layers: weather + outages + natural/hotspots for fire-water-power coupling. Bridge event type: `co.fwi.cascade`.

---

## Edge ↔ Cloud Bridge

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/silent-sentinel/events` | Ingest pipeline results |
| `GET`  | `/api/silent-sentinel/events?limit=20` | List recent events |
| `GET`  | `/api/silent-sentinel/fwi` | Live NIFC + NWS (Colorado FWI) |

Enable UI: `?silentSentinel=1` and/or `?fwi=1`

---

## Integration status

1. ~~Edge ↔ Cloud bridge~~
2. ~~Colorado / Denver metro + professional gov tracking~~
3. ~~Tertiary FWI map task (fire / water / infra)~~
4. ~~Live NIFC/NWS FWI panel + API~~
5. Shared local AI (Ollama alignment)
6. Deeper human-aligned map overlays
7. CDTFW four-questions views

---

## Related Repositories

- [Silent Sentinel Edge AI](https://github.com/KevinW1988/silent-sentinel-edge)
- [Colorado Legislative Tracker](https://github.com/KevinW1988/colorado-legislative-tracker)
- [Upstream World Monitor](https://github.com/koala73/worldmonitor)

---

## License

**AGPL-3.0-only** (same as upstream). See [LICENSE](LICENSE).

Research / prototype. Always keep a human in the decision loop.

*Fork maintained by [KevinW1988](https://github.com/KevinW1988).*
