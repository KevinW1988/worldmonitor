/**
 * Colorado FWI panel — live NIFC fires + NWS fire/flood/heat alerts.
 * Mount: FwiPanel.mount(document.body)
 */

import { fwiColorado, type FwiSnapshot } from '../services/fwi-colorado';

const PANEL_ID = 'fwi-colorado-panel';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtAcres(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k ac` : `${Math.round(n)} ac`;
}

function render(snap: FwiSnapshot | null): string {
  if (!snap) return `<div class="fwi-empty">Loading NIFC + NWS…</div>`;

  const fires = snap.fires
    .slice(0, 12)
    .map(
      (f) => `
      <div class="fwi-row">
        <div class="fwi-name">${esc(f.name)}</div>
        <div class="fwi-meta">${esc(f.county || 'CO')} · ${fmtAcres(f.acres)} · ${f.contained != null ? `${Math.round(f.contained)}%` : '—'}</div>
      </div>`,
    )
    .join('');

  const alerts = snap.alerts
    .slice(0, 8)
    .map(
      (a) => `
      <div class="fwi-row fwi-alert">
        <div class="fwi-name">${esc(a.event)}</div>
        <div class="fwi-meta">${esc(a.severity)} · ${esc(a.areas.slice(0, 80))}</div>
      </div>`,
    )
    .join('');

  const cascade = (snap.cascade || [])
    .map((c) => `<li>${esc(c)}</li>`)
    .join('');

  return `
    <div class="fwi-summary">
      <span><strong>${snap.summary.fireCount}</strong> fires</span>
      <span><strong>${Math.round(snap.summary.totalAcres).toLocaleString()}</strong> ac</span>
      <span><strong>${snap.summary.alertCount}</strong> alerts</span>
    </div>
    ${cascade ? `<ul class="fwi-cascade">${cascade}</ul>` : ''}
    <h3>NIFC — CO active</h3>
    <div class="fwi-list">${fires || '<div class="fwi-empty">No CO incidents in WFIGS feed</div>'}</div>
    <h3>NWS — fire / flood / heat</h3>
    <div class="fwi-list">${alerts || '<div class="fwi-empty">No matching active alerts</div>'}</div>
    <div class="fwi-foot">${esc(snap.mode)} · ${esc(new Date(snap.fetchedAt).toLocaleTimeString())}${snap.errors?.length ? ' · partial' : ''}</div>
  `;
}

function ensureStyles() {
  if (document.getElementById('fwi-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'fwi-panel-styles';
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      left: 16px;
      bottom: 16px;
      width: min(360px, calc(100vw - 32px));
      max-height: min(70vh, 560px);
      overflow: auto;
      z-index: 9998;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 12px;
      color: #eef3fa;
      background: rgba(18, 12, 10, 0.93);
      border: 1px solid rgba(230, 120, 60, 0.4);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
    }
    #${PANEL_ID} .fwi-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(230, 120, 60, 0.3);
      position: sticky; top: 0;
      background: rgba(18, 12, 10, 0.96);
    }
    #${PANEL_ID} .fwi-header h2 { margin: 0; font-size: 13px; font-weight: 650; }
    #${PANEL_ID} .fwi-header button {
      background: transparent; border: none; color: #f0c0a0; cursor: pointer; font-size: 16px;
    }
    #${PANEL_ID} .fwi-body { padding: 8px 12px 12px; }
    #${PANEL_ID} .fwi-summary {
      display: flex; gap: 12px; flex-wrap: wrap;
      margin-bottom: 8px; opacity: 0.95;
    }
    #${PANEL_ID} .fwi-cascade {
      margin: 0 0 10px; padding-left: 16px; color: #f0b070; line-height: 1.35;
    }
    #${PANEL_ID} h3 {
      margin: 10px 0 6px; font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.04em; opacity: 0.7;
    }
    #${PANEL_ID} .fwi-row {
      padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    #${PANEL_ID} .fwi-name { font-weight: 600; }
    #${PANEL_ID} .fwi-meta { opacity: 0.7; font-size: 11px; margin-top: 2px; }
    #${PANEL_ID} .fwi-empty { opacity: 0.55; padding: 8px 0; }
    #${PANEL_ID} .fwi-foot { margin-top: 10px; font-size: 10px; opacity: 0.5; }
    #${PANEL_ID}.fwi-collapsed .fwi-body { display: none; }
  `;
  document.head.appendChild(style);
}

export const FwiPanel = {
  mount(parent: HTMLElement = document.body) {
    ensureStyles();
    let root = document.getElementById(PANEL_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = PANEL_ID;
      root.innerHTML = `
        <div class="fwi-header">
          <h2>CO FWI · Fire / Water / Infra</h2>
          <button type="button" class="fwi-toggle" title="Collapse">−</button>
        </div>
        <div class="fwi-body"></div>
      `;
      parent.appendChild(root);
      root.querySelector('.fwi-toggle')?.addEventListener('click', () => {
        root!.classList.toggle('fwi-collapsed');
        const btn = root!.querySelector('.fwi-toggle');
        if (btn) btn.textContent = root!.classList.contains('fwi-collapsed') ? '+' : '−';
      });
    }

    const body = root.querySelector('.fwi-body') as HTMLElement;
    fwiColorado.start();
    const unsub = fwiColorado.subscribe((snap) => {
      body.innerHTML = render(snap);
    });

    return () => {
      unsub();
      fwiColorado.stop();
      root?.remove();
    };
  },
};
