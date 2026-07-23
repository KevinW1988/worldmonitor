# Tertiary (3rd-Order) Task: Fire × Water × Infrastructure

**Status:** ACTIVE  
**Order:** Tertiary / 3rd-order effects  
**Geography:** Colorado statewide, **P0 = Denver–Aurora–Lakewood metro + Front Range WUI**  
**Context link (external):** [mappingtherabbithole.com](https://mappingtherabbithole.com/) — used as a research pointer only; this task is grounded in **public hazard and utility data**, not third-party narratives.

---

## What “3rd order” means here

| Order | Question | Example |
|-------|----------|---------|
| **1st** | What is burning / failing **now**? | Active wildfire perimeter, boil-water notice |
| **2nd** | What does that **directly cascade** into? | Hydrant pressure loss, road closures, outages |
| **3rd (this task)** | What **systemic** couplings emerge over hours–weeks? | Post-fire debris flows clogging channels; VOC contamination in distribution pipes; mutual-aid strain across utilities; policy/legislative response |

Silent Sentinel alignment: surface **convergence** of fire + water + critical infrastructure for a **human** operator. No private surveillance.

---

## Mission statement

Build and maintain a **common operating picture** that shows how wildfire (and prescribed-fire windows) interact with **drinking water, wastewater, stormwater, and dependent infrastructure** (power, transport, emergency response) across Colorado—with densest monitoring on the **Front Range urban–wildland interface**.

Colorado reference case: **Marshall Fire (2021)** — power loss, distribution depressurization, contamination risk, and multi-utility recovery ([literature](https://doi.org/10.1002/aws2.1318)).

---

## Map layers (World Monitor preset)

### Dashboard URL (local)

```
http://localhost:3000/dashboard?lat=39.7392&lon=-104.9903&zoom=8.0&view=colorado-fwi&timeRange=7d&layers=conflicts,hotspots,weather,outages,natural&silentSentinel=1
```

| Layer (WM) | Role in this task |
|------------|-------------------|
| `natural` / wildfire feeds | 1st-order fire footprint & smoke |
| `weather` | Wind, RH, red-flag, post-fire rain |
| `outages` | Power → pump stations / treatment |
| `hotspots` | Escalation / multi-hazard clustering |
| Silent Sentinel panel | Edge + CO legislative/infra alerts |

Machine preset: [`data/silent-sentinel/colorado-fwi-map.json`](../data/silent-sentinel/colorado-fwi-map.json)

---

## Monitoring matrix

### A. Fire (1st + feed into 3rd)

| Signal | Public sources (examples) |
|--------|---------------------------|
| Active incidents / perimeters | NIFC, InciWeb, state emergency management |
| Red-flag / fire weather | NWS Boulder / Grand Junction |
| Smoke / air quality | AirNow, CDPHE |
| WUI exposure | County open data, USFS |

### B. Water (2nd + 3rd)

| Signal | Public sources |
|--------|----------------|
| Boil-water / do-not-drink | Utility & CDPHE notices |
| Reservoir / storage stress | Utility dashboards, USBR where applicable |
| Treatment / pump dependency on power | Cross-link `outages` layer |
| Post-fire water quality (ash, turbidity, VOCs in distribution) | Utility incident reports, research literature |
| Stormwater / debris-basin risk after burn | County floodplain & public works notices |

### C. Infrastructure (2nd + 3rd)

| Signal | Public sources |
|--------|----------------|
| Electric outages affecting water | Utility outage maps |
| Road / evacuation corridors | CDOT, county OEM |
| Hospitals, EOCs, critical facilities | HIFLD / public facility lists (no sensitive targeting) |
| Telecom / 911 stress (public statements only) | Carrier / PSAP public notices |
| Legislative / regulatory response | [colorado-legislative-tracker](https://github.com/KevinW1988/colorado-legislative-tracker) `co.gov.action` |

---

## 3rd-order effect patterns to flag

1. **Fire → power → pumps → hydrant/system pressure** — firefighting and potable supply both degrade.
2. **Fire → distribution damage → contamination / boil notices** — recovery measured in days–months (Marshall-type).
3. **Burn scar → intense rain → debris flow → clogged channels / damaged canals** — delayed infrastructure failure.
4. **Multi-utility mutual aid saturation** — regional capacity limits become the story, not a single incident.
5. **Policy cascade** — emergency declarations, special sessions, funding bills (track via legislative API, professional only).

Each flag should carry `human_in_loop_required: true` when posted to the Silent Sentinel bridge.

---

## Geographic priority boxes (WGS84)

| ID | Level | Approx bbox | Why |
|----|-------|-------------|-----|
| `denver-metro-wui` | P0 | W -105.35, S 39.40, E -104.55, N 40.15 | Dense population + interface |
| `front-range` | P1 | W -106.0, S 38.7, E -104.4, N 40.5 | Boulder–COS corridor |
| `colorado` | P2 | State | Statewide mutual aid / smoke |

Center default: **39.7392, -104.9903** (Denver).

---

## Event types (bridge)

| `event.type` | Use |
|--------------|-----|
| `co.infra.alert` | Outage, road, facility impact (public) |
| `co.gov.action` | Legislative / emergency order related to fire-water |
| `co.fwi.cascade` | Explicit **3rd-order** coupling note (this task) |

Example payload:

```json
{
  "event": {
    "type": "co.fwi.cascade",
    "description": "Post-fire rain risk over burn scar may stress storm channels and treatment intake turbidity (public NWS + OEM context)",
    "features": {
      "jurisdiction": "colorado",
      "priority": "P0",
      "domains": ["fire", "water", "infrastructure"],
      "order": 3,
      "source_url": "https://...",
      "confidence": 0.7
    },
    "source": "silent_sentinel_fwi_task"
  },
  "alignment": {
    "human_in_loop_required": true,
    "escalation_flags": ["cascade_watch"],
    "recommended_action": "Correlate fire perimeter, forecast precip, and utility public notices; do not infer private locations."
  }
}
```

---

## Activation checklist

- [x] Task document committed
- [x] Map preset JSON committed
- [ ] Operator opens Colorado FWI dashboard URL with `silentSentinel=1`
- [ ] Optional: LegiScan/Open States keys in colorado-legislative-tracker for policy cascade
- [ ] Optional: edge bridge posts from Jetson when local sensors support infra context

---

## Ethics

Public hazard, utility, and government sources only. No personal tracking, no non-public facility security details beyond what agencies publish for public safety.

Related: [SILENT_SENTINEL_COLORADO.md](./SILENT_SENTINEL_COLORADO.md) · [colorado-legislative-tracker](https://github.com/KevinW1988/colorado-legislative-tracker)
