/**
 * Colorado FWI client — live NIFC + NWS with API or direct fallback.
 */

export interface FwiFire {
  id: string;
  name: string;
  county: string;
  acres: number | null;
  contained: number | null;
  lat: number | null;
  lon: number | null;
  discovered: string | null;
  cause: string | null;
}

export interface FwiAlert {
  id: string;
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  areas: string;
  onset: string | null;
  ends: string | null;
  instruction: string | null;
}

export interface FwiSnapshot {
  ok: boolean;
  fetchedAt: string;
  summary: { fireCount: number; alertCount: number; totalAcres: number };
  fires: FwiFire[];
  alerts: FwiAlert[];
  cascade: string[];
  mode: 'api' | 'direct';
  errors?: string[];
}

type Listener = (snap: FwiSnapshot | null) => void;

const NIFC_QUERY =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query' +
  "?where=POOState%3D%27CO%27" +
  '&outFields=IncidentName,POOCounty,POOState,DailyAcres,PercentContained,FireDiscoveryDateTime,IncidentTypeCategory,FireCause' +
  '&returnGeometry=true&outSR=4326&f=geojson';

const NWS_ALERTS = 'https://api.weather.gov/alerts/active?area=CO';
const FIRE_KW = /fire|red flag|redflag|heat|wind|flood|burn|smoke|air quality/i;

function parseFires(geo: any): FwiFire[] {
  const features = Array.isArray(geo?.features) ? geo.features : [];
  return features.map((f: any, i: number) => {
    const p = f?.properties ?? {};
    const c = f?.geometry?.coordinates;
    return {
      id: String(p.IncidentName ?? `co-fire-${i}`),
      name: String(p.IncidentName ?? 'Unknown'),
      county: String(p.POOCounty ?? ''),
      acres: p.DailyAcres != null ? Number(p.DailyAcres) : null,
      contained: p.PercentContained != null ? Number(p.PercentContained) : null,
      lat: Array.isArray(c) && Number.isFinite(c[1]) ? Number(c[1]) : null,
      lon: Array.isArray(c) && Number.isFinite(c[0]) ? Number(c[0]) : null,
      discovered: p.FireDiscoveryDateTime ? String(p.FireDiscoveryDateTime) : null,
      cause: p.FireCause ? String(p.FireCause) : null,
    };
  });
}

function parseAlerts(data: any): FwiAlert[] {
  const features = Array.isArray(data?.features) ? data.features : [];
  return features
    .map((f: any) => {
      const p = f?.properties ?? {};
      return {
        id: String(p.id ?? f?.id ?? Math.random()),
        event: String(p.event ?? 'Alert'),
        headline: String(p.headline ?? p.event ?? ''),
        severity: String(p.severity ?? 'Unknown'),
        urgency: String(p.urgency ?? 'Unknown'),
        areas: String(p.areaDesc ?? ''),
        onset: p.onset ? String(p.onset) : null,
        ends: p.ends ? String(p.ends) : p.expires ? String(p.expires) : null,
        instruction: p.instruction ? String(p.instruction).slice(0, 280) : null,
      };
    })
    .filter((a) => FIRE_KW.test(a.event) || FIRE_KW.test(a.headline));
}

async function directPull(): Promise<FwiSnapshot> {
  const errors: string[] = [];
  let fires: FwiFire[] = [];
  let alerts: FwiAlert[] = [];

  try {
    const r = await fetch(NIFC_QUERY);
    if (!r.ok) throw new Error(`NIFC ${r.status}`);
    fires = parseFires(await r.json());
  } catch (e) {
    errors.push(`nifc: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const r = await fetch(NWS_ALERTS, {
      headers: { Accept: 'application/geo+json', 'User-Agent': 'worldmonitor-fwi' },
    });
    if (!r.ok) throw new Error(`NWS ${r.status}`);
    alerts = parseAlerts(await r.json());
  } catch (e) {
    errors.push(`nws: ${e instanceof Error ? e.message : String(e)}`);
  }

  const cascade: string[] = [];
  if (fires.some((f) => (f.acres ?? 0) >= 1000)) {
    cascade.push('Large CO fire(s) active — 3rd-order: power/pumps/mutual aid watch.');
  }
  if (alerts.some((a) => /Red Flag/i.test(a.event))) {
    cascade.push('Red Flag conditions — elevated spread risk.');
  }
  if (alerts.some((a) => /Flood/i.test(a.event)) && fires.length) {
    cascade.push('Flood + fire concurrent — debris/turbidity cascade watch.');
  }

  return {
    ok: true,
    fetchedAt: new Date().toISOString(),
    summary: {
      fireCount: fires.length,
      alertCount: alerts.length,
      totalAcres: fires.reduce((s, f) => s + (f.acres ?? 0), 0),
    },
    fires: fires.sort((a, b) => (b.acres ?? 0) - (a.acres ?? 0)).slice(0, 40),
    alerts: alerts.slice(0, 30),
    cascade,
    mode: 'direct',
    errors: errors.length ? errors : undefined,
  };
}

class FwiColoradoService {
  private snap: FwiSnapshot | null = null;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private pollMs = 120_000;
  private running = false;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    try {
      fn(this.snap);
    } catch {
      /* */
    }
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) {
      try {
        fn(this.snap);
      } catch {
        /* */
      }
    }
  }

  async fetchOnce(): Promise<FwiSnapshot> {
    try {
      const r = await fetch('/api/silent-sentinel/fwi');
      if (r.ok) {
        const data = (await r.json()) as FwiSnapshot;
        this.snap = { ...data, mode: 'api' };
        this.notify();
        return this.snap;
      }
    } catch {
      /* direct */
    }
    this.snap = await directPull();
    this.notify();
    return this.snap;
  }

  start() {
    if (this.running) return;
    this.running = true;
    void this.fetchOnce();
    this.timer = setInterval(() => void this.fetchOnce(), this.pollMs);
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getSnapshot() {
    return this.snap;
  }
}

export const fwiColorado = new FwiColoradoService();
