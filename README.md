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

## Planned Silent Sentinel Integration Directions

(These are the customization goals for this fork — work in progress)

1. **Edge ↔ Cloud bridge** — lightweight ingestion of Silent Sentinel pipeline outputs (alerts, convergence scores, four-questions results, escalation flags) into World Monitor layers / briefing cards.
2. **Shared local AI** — align Ollama model choices and prompting style with the edge_llm.py recommendations (qwen2.5:3b, llama3.2:3b, etc.).
3. **Human-aligned overlays** — surface governance / ROE / override indicators that match Silent Sentinel's human_aligned.py checks.
4. **Passive RF / CAM-Pulse context** — optional map layers or event cards that can accept local sensor events when the Jetson node is connected.
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
