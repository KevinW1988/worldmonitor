# Silent Sentinel × Colorado Integration

**Focus:** Colorado statewide awareness with **highest priority on the Denver–Aurora–Lakewood metropolitan area**, plus structured tracking of **government officials’ professional activity and official movements only**.

**Hard boundary:** Nothing personal. No private addresses, family, health, finances, social media personal life, or non-public location. Only **public, official, professional** sources.

---

## Quick start (this fork)

```bash
git clone https://github.com/KevinW1988/worldmonitor.git
cd worldmonitor
npm install
npm run dev
```

### Colorado dashboard preset (local)

After `npm run dev`, open:

```
http://localhost:3000/dashboard?lat=39.7392&lon=-104.9903&zoom=8.5&view=colorado&timeRange=7d&layers=conflicts,hotspots,sanctions,weather,outages,natural&silentSentinel=1
```

| Param | Value | Meaning |
|-------|--------|--------|
| `lat` / `lon` | `39.7392` / `-104.9903` | Denver metro center |
| `zoom` | `8.5` | State + Front Range; tighten to `10–11` for core metro |
| `view` | `colorado` | Named focus (see config) |
| `timeRange` | `7d` | Rolling week of signals |
| `layers` | conflicts, hotspots, sanctions, weather, outages, natural | Baseline situational layers |
| `silentSentinel` | `1` | Show Silent Sentinel edge panel |

**Denver metro only (higher focus):**

```
http://localhost:3000/dashboard?lat=39.7392&lon=-104.9903&zoom=10.5&view=denver-metro&timeRange=7d&layers=conflicts,hotspots,weather,outages,natural&silentSentinel=1
```

**Upstream-style public reference** (global product; use for layer vocabulary):

```
https://www.worldmonitor.app/dashboard?lat=39.7392&lon=-104.9903&zoom=8.5&timeRange=7d&layers=conflicts%2Chotspots%2Csanctions%2Cweather%2Coutages%2Cnatural
```

Machine-readable preset: [`data/silent-sentinel/colorado-focus.json`](../data/silent-sentinel/colorado-focus.json)

---

## Geographic priority (highest → supporting)

| Priority | Area | Notes |
|----------|------|--------|
| **P0** | **Denver–Aurora–Lakewood MSA** | State capital, densest institutions, DIA, major agencies |
| **P1** | Front Range corridor (Boulder–Colorado Springs) | Secondary metros, federal labs, bases, legislature spillover |
| **P2** | Statewide Colorado | State agencies, rural counties, statewide alerts |

Approximate metro bbox (WGS84):

- South-west: `-105.25, 39.45`
- North-east: `-104.55, 40.05`

---

## What we track: government officials (professional only)

### In scope (allowed)

- **Official title, office, agency, district** (public roster)
- **Public calendars / published schedules** of meetings, hearings, travel on official business
- **Open meetings** agendas, minutes, livestreams (Colorado Open Meetings Law)
- **Voting records, bill sponsorship, committee assignments**
- **Official press releases, floor statements, agency announcements**
- **Public travel / delegation itineraries** when released by the office
- **Lobbyist / disclosure filings**, campaign finance **as filed with the state** (professional regulatory data)
- **Contracts, budgets, Open Checkbook-style expenditures** tied to offices
- **CORA-accessible public records** requested and used lawfully

### Out of scope (forbidden in this integration)

- Home addresses, personal phone/email, family members
- Private social media, dating, health, religion, school of children
- Real-time personal location, plate tracking, or any non-official surveillance
- Speculation about private motives without a public professional source
- Doxxing, intimidation, or targeting outside public-record transparency

**Principle (Silent Sentinel aligned):** product is **decision advantage for a human** from **public institutional signals**, never private intrusion.

---

## Official source map (Colorado)

| Domain | Sources (public) |
|--------|------------------|
| **State legislature** | [leg.colorado.gov](https://leg.colorado.gov) — bills, calendars, members |
| **Governor / executive** | Official governor site, executive orders, published schedules when posted |
| **Denver city** | [denvergov.org](https://www.denvergov.org) — council, mayor, agencies |
| **Transparency / money** | Transparent Denver, Open Checkbook, contracts, budget reports |
| **Open data** | [Denver Open Data Catalog](https://www.denvergov.org/opendata) |
| **Open records** | Colorado Open Records Act (CORA); agency-specific request portals |
| **Open meetings** | Colorado Freedom of Information Coalition guides; published notices |
| **Transit / infrastructure (official ops)** | RTD open records & performance dashboards (institutional, not personal) |
| **Elections / finance** | Colorado Secretary of State public filings |
| **Federal in-state** | Official .gov pages for Colorado federal offices, GAO/CRS when relevant |

Always prefer **primary official sites** over secondary aggregators when building feeds.

---

## Suggested official roster categories (P0 Denver metro)

Track **roles**, not private lives. Maintain a living list in config; update after elections.

1. **Colorado statewide executive** — Governor, Lt. Governor, key department heads (public bios only)
2. **General Assembly** — Senators / Representatives for Denver metro districts
3. **Denver City Council + Mayor** — public offices and published calendars
4. **Major regional bodies** — e.g. RTD board (public meetings), relevant special districts
5. **Federal congressional** — Colorado House / Senate offices (official schedules & press only)

Do **not** store personal identifiers beyond what the official office itself publishes for professional contact.

---

## Layers & signals (World Monitor + Colorado)

Baseline layers from the global product, interpreted for Colorado:

| Layer | Colorado use |
|-------|----------------|
| `conflicts` / `hotspots` | Regional / national escalation context that may affect CO policy |
| `sanctions` | Economic/policy pressure relevant to state trade & energy |
| `weather` | Front Range hazards, emergency declarations |
| `outages` | Infrastructure / connectivity affecting government ops |
| `natural` | Wildfire, flood, seismic context for emergency management |

**Colorado-specific signal classes** (to implement as feeds / cards):

- `co.gov.meeting` — noticed open meeting (agency, time, agenda URL)
- `co.gov.calendar` — published official calendar item
- `co.gov.travel` — **official** travel release only
- `co.gov.filing` — disclosure / finance / lobbying filing
- `co.gov.action` — bill action, executive order, ordinance
- `co.infra.alert` — public emergency / infrastructure notice

Edge pipeline (Silent Sentinel) can tag these with CDTFW four-questions analysis while keeping **human-in-the-loop** mandatory.

---

## Edge ↔ cloud bridge

See root [README](../README.md) and `api/silent-sentinel/events`.

For Colorado events, prefer payload shape:

```json
{
  "event": {
    "type": "co.gov.meeting",
    "description": "Denver City Council — regular meeting (public notice)",
    "features": {
      "jurisdiction": "denver",
      "body": "City Council",
      "priority": "P0",
      "source_url": "https://example.official.gov/agenda",
      "confidence": 1.0
    },
    "source": "silent_sentinel_colorado"
  },
  "alignment": {
    "human_in_loop_required": true,
    "escalation_flags": [],
    "recommended_action": "Review public agenda; no personal collection."
  }
}
```

---

## Ethics & compliance checklist

Before adding any source or field:

- [ ] Is the data **published by a government office** or available under CORA / open meetings?
- [ ] Does it describe **official duty**, not private life?
- [ ] Would publishing this field in a transparency dashboard be defensible in public?
- [ ] Is storage limited to what is needed for professional situational awareness?
- [ ] Is a human still required before any operational use of the signal?

If any answer is no — **do not collect**.

---

## Related files

| File | Purpose |
|------|--------|
| [`data/silent-sentinel/colorado-focus.json`](../data/silent-sentinel/colorado-focus.json) | Bbox, zoom presets, layer defaults, roster categories |
| [`README.md`](../README.md) | Fork overview + edge bridge |
| [silent-sentinel-edge](https://github.com/KevinW1988/silent-sentinel-edge) | Edge CDTFW pipeline |

---

*Maintained for Silent Sentinel research use. Always keep a human in the decision loop. Professional / public sources only.*
