/**
 * Colorado FWI (Fire × Water × Infrastructure) live pulls
 *
 * GET /api/silent-sentinel/fwi
 *   - NIFC WFIGS current wildland fire locations (POOState = CO)
 *   - NWS active alerts for Colorado (api.weather.gov)
 *
 * Public sources only. Used by the FwiPanel and optional bridge ingest.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const NIFC_QUERY =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query' +
  "?where=POOState%3D%27CO%27" +
  '&outFields=IncidentName,POOCounty,POOState,DailyAcres,PercentContained,FireDiscoveryDateTime,IncidentTypeCategory,FireCause,TotalIncidentPersonnel' +
  '&returnGeometry=true&outSR=4326&f=geojson';

const NWS_ALERTS = 'https://api.weather.gov/alerts/active?area=CO';

const FIRE_EVENT_KEYWORDS = /
  fire|red flag|redflag|heat|wind advisory|flood|flash flood|burn|smoke|air quality
/i;

interface FwiFire {
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

interface FwiAlert {
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

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
}

async function fetchJson(url: string, headers?: Record<string, string>) {
  const resp = await fetch(url, {
    headers: {
      Accept: 'application/geo+json, application/json',
      'User-Agent': 'KevinW1988-worldmonitor-fwi (research; contact via GitHub)',
      ...headers,
    },
  });
  if (!resp.ok) throw new Error(`${url} -> ${resp.status}`);
  return resp.json();
}

function parseFires(geo: any): FwiFire[] {
  const features = Array.isArray(geo?.features) ? geo.features : [];
  return features.map((f: any, i: number) => {
    const p = f?.properties ?? {};
    const coords = f?.geometry?.coordinates;
    const lon = Array.isArray(coords) ? Number(coords[0]) : null;
    const lat = Array.isArray(coords) ? Number(coords[1]) : null;
    return {
      id: String(p.IncidentName ?? p.UniqueFireIdentifier ?? `co-fire-${i}`),
      name: String(p.IncidentName ?? 'Unknown fire'),
      county: String(p.POOCounty ?? ''),
      acres: p.DailyAcres != null ? Number(p.DailyAcres) : null,
      contained: p.PercentContained != null ? Number(p.PercentContained) : null,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
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
    .filter(
      (a: FwiAlert) =>
        FIRE_EVENT_KEYWORDS.test(a.event) ||
        FIRE_EVENT_KEYWORDS.test(a.headline) ||
        /Red Flag|Fire Weather|Flood|Heat/i.test(a.event),
    );
}

function cascadeHints(fires: FwiFire[], alerts: FwiAlert[]): string[] {
  const hints: string[] = [];
  const large = fires.filter((f) => (f.acres ?? 0) >= 1000);
  if (large.length) {
    hints.push(
      `${large.length} CO fire(s) ≥1,000 acres — watch power/pump dependency and mutual aid (3rd-order).`,
    );
  }
  const redFlag = alerts.some((a) => /Red Flag/i.test(a.event));
  if (redFlag) {
    hints.push('Red Flag / fire-weather alert active — elevated new-start and wind-driven spread risk.');
  }
  const flood = alerts.some((a) => /Flood/i.test(a.event));
  if (flood && fires.length) {
    hints.push(
      'Flood alert concurrent with active fire footprint — post-fire debris / intake turbidity cascade watch.',
    );
  }
  if (!hints.length && (fires.length || alerts.length)) {
    hints.push('Monitor weather + outages layers with fire list for infrastructure coupling.');
  }
  return hints;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const errors: string[] = [];
  let fires: FwiFire[] = [];
  let alerts: FwiAlert[] = [];

  try {
    const geo = await fetchJson(NIFC_QUERY);
    fires = parseFires(geo);
  } catch (e) {
    errors.push(`nifc: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const nws = await fetchJson(NWS_ALERTS);
    alerts = parseAlerts(nws);
  } catch (e) {
    errors.push(`nws: ${e instanceof Error ? e.message : String(e)}`);
  }

  const cascade = cascadeHints(fires, alerts);

  return res.status(200).json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    geography: { state: 'CO', center: { lat: 39.7392, lon: -104.9903 } },
    summary: {
      fireCount: fires.length,
      alertCount: alerts.length,
      totalAcres: fires.reduce((s, f) => s + (f.acres ?? 0), 0),
    },
    fires: fires.sort((a, b) => (b.acres ?? 0) - (a.acres ?? 0)).slice(0, 40),
    alerts: alerts.slice(0, 30),
    cascade,
    sources: {
      nifc: 'WFIGS Current Wildland Fire Incident Locations (NIFC Open Data)',
      nws: 'api.weather.gov/alerts/active?area=CO',
    },
    errors: errors.length ? errors : undefined,
  });
}
