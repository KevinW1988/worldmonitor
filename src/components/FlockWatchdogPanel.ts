/**
 * Flock Watchdog resource table — 5 key public transparency sites.
 * Mount: FlockWatchdogPanel.mount(document.body)
 * Enable: ?flock=1 or with silentSentinel=1
 */

const PANEL_ID = 'flock-watchdog-panel';

export interface FlockWatchdogSite {
  id: string;
  rank: number;
  name: string;
  url: string;
  alt_url?: string;
  summary: string;
  focus: string[];
  note?: string;
}

const SITES: FlockWatchdogSite[] = [
  {
    id: 'alpr-wtf',
    rank: 1,
    name: 'Alpr.wtf',
    url: 'https://alpr.wtf/',
    summary:
      'Every U.S. jurisdiction tied to Flock/ALPR networks, plus how to file public-records / info requests.',
    focus: ['jurisdictions', 'FOIA', 'records requests'],
  },
  {
    id: 'eyes-on-flock',
    rank: 2,
    name: 'EyesOnFlock.com',
    url: 'https://eyesonflock.com/',
    summary: 'Crowdsourced map of Flock cameras and city contracts / transparency data.',
    focus: ['contracts', 'camera counts'],
  },
  {
    id: 'deflock',
    rank: 3,
    name: 'Deflock.me',
    url: 'https://deflock.me/',
    alt_url: 'https://www.deflock.org/',
    summary:
      'Nationwide ALPR map tracking Flock deployments, removals, and resistance (open-source).',
    focus: ['map', 'deployments', 'removals'],
  },
  {
    id: 'have-i-been-flocked',
    rank: 4,
    name: 'HaveIBeenFlocked.com',
    url: 'https://haveibeenflocked.com/',
    summary: 'Quick check against public Flock audit logs / disclosed agency lookups.',
    focus: ['audit logs', 'plate lookup'],
  },
  {
    id: 'dont-get-flocked',
    rank: 5,
    name: 'DontGetFlocked.com',
    url: 'https://dontgetflocked.com/',
    summary:
      'Plots your route, counts ALPR/Flock cameras, and suggests surveillance-light alternatives.',
    focus: ['routing', 'avoidance'],
  },
];

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTable(): string {
  const rows = SITES.map(
    (s) => `
    <tr>
      <td class="fw-rank">${s.rank}</td>
      <td class="fw-name">
        <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a>
        ${s.alt_url ? `<div class="fw-alt"><a href="${esc(s.alt_url)}" target="_blank" rel="noopener noreferrer">${esc(s.alt_url.replace(/^https?:\/\//, ''))}</a></div>` : ''}
      </td>
      <td class="fw-summary">${esc(s.summary)}</td>
    </tr>`,
  ).join('');

  return `
    <p class="fw-intro">Public civic-tech tools for ALPR / Flock transparency. Institutional awareness only — not personal tracking.</p>
    <table class="fw-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Site</th>
          <th>What it provides</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="fw-foot">Data: <code>data/silent-sentinel/flock-watchdog-sites.json</code> · Colorado: prefer CORA + official contracts</p>
  `;
}

function ensureStyles() {
  if (document.getElementById('flock-watchdog-styles')) return;
  const style = document.createElement('style');
  style.id = 'flock-watchdog-styles';
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: min(420px, calc(100vw - 32px));
      max-height: min(55vh, 480px);
      overflow: auto;
      z-index: 9997;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 12px;
      color: #e8eef8;
      background: rgba(10, 14, 22, 0.94);
      border: 1px solid rgba(100, 140, 220, 0.35);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
    }
    #${PANEL_ID} .fw-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(100, 140, 220, 0.25);
      position: sticky; top: 0;
      background: rgba(10, 14, 22, 0.97);
    }
    #${PANEL_ID} .fw-header h2 { margin: 0; font-size: 13px; font-weight: 650; }
    #${PANEL_ID} .fw-header button {
      background: transparent; border: none; color: #a8c0e8; cursor: pointer; font-size: 16px;
    }
    #${PANEL_ID} .fw-body { padding: 8px 12px 12px; }
    #${PANEL_ID} .fw-intro {
      margin: 0 0 8px; opacity: 0.75; line-height: 1.35; font-size: 11px;
    }
    #${PANEL_ID} .fw-table {
      width: 100%; border-collapse: collapse;
    }
    #${PANEL_ID} .fw-table th {
      text-align: left; font-size: 10px; text-transform: uppercase;
      letter-spacing: 0.04em; opacity: 0.65; padding: 4px 6px 6px;
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }
    #${PANEL_ID} .fw-table td {
      padding: 8px 6px; vertical-align: top;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    #${PANEL_ID} .fw-rank { width: 24px; opacity: 0.55; font-weight: 600; }
    #${PANEL_ID} .fw-name a {
      color: #9ec0ff; font-weight: 650; text-decoration: none;
    }
    #${PANEL_ID} .fw-name a:hover { text-decoration: underline; }
    #${PANEL_ID} .fw-alt { margin-top: 2px; font-size: 10px; opacity: 0.55; }
    #${PANEL_ID} .fw-alt a { color: #8aa0c8; }
    #${PANEL_ID} .fw-summary { line-height: 1.35; opacity: 0.9; }
    #${PANEL_ID} .fw-foot {
      margin: 10px 0 0; font-size: 10px; opacity: 0.45;
    }
    #${PANEL_ID} .fw-foot code { font-size: 9px; }
    #${PANEL_ID}.fw-collapsed .fw-body { display: none; }
  `;
  document.head.appendChild(style);
}

export const FlockWatchdogPanel = {
  sites: SITES,

  mount(parent: HTMLElement = document.body) {
    ensureStyles();
    let root = document.getElementById(PANEL_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = PANEL_ID;
      root.innerHTML = `
        <div class="fw-header">
          <h2>5 Key Flock Watchdog Sites</h2>
          <button type="button" class="fw-toggle" title="Collapse">−</button>
        </div>
        <div class="fw-body">${renderTable()}</div>
      `;
      parent.appendChild(root);
      root.querySelector('.fw-toggle')?.addEventListener('click', () => {
        root!.classList.toggle('fw-collapsed');
        const btn = root!.querySelector('.fw-toggle');
        if (btn) btn.textContent = root!.classList.contains('fw-collapsed') ? '+' : '−';
      });
    }
    return () => {
      root?.remove();
    };
  },
};
