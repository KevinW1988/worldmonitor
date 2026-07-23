/**
 * Silent Sentinel Edge Alerts panel
 *
 * Minimal, self-contained UI that shows the latest pipeline outputs
 * (escalation flags, recommended action, event description).
 * Mount with: SilentSentinelPanel.mount(document.body)
 */

import {
  silentSentinelBridge,
  type SilentSentinelEvent,
} from '../services/silent-sentinel-bridge';

const PANEL_ID = 'silent-sentinel-panel';

function severityClass(ev: SilentSentinelEvent): string {
  const flags = ev.alignment?.escalation_flags?.length ?? 0;
  if (flags >= 2) return 'ss-critical';
  if (flags === 1) return 'ss-warn';
  return 'ss-info';
}

function renderEvent(ev: SilentSentinelEvent): string {
  const flags = (ev.alignment?.escalation_flags ?? [])
    .map((f) => `<li>${escapeHtml(f)}</li>`)
    .join('');
  const action = escapeHtml(ev.alignment?.recommended_action ?? '');
  const desc = escapeHtml(ev.event?.description ?? '');
  const type = escapeHtml(ev.event?.type ?? 'event');
  const when = ev.receivedAt ? new Date(ev.receivedAt).toLocaleString() : '';

  return `
    <article class="ss-card ${severityClass(ev)}" data-id="${escapeHtml(ev.id)}">
      <header>
        <span class="ss-type">${type}</span>
        <time>${when}</time>
      </header>
      <p class="ss-desc">${desc}</p>
      ${flags ? `<ul class="ss-flags">${flags}</ul>` : ''}
      <p class="ss-action"><strong>Action:</strong> ${action}</p>
      ${ev.alignment?.human_in_loop_required ? '<span class="ss-hil">Human-in-the-loop required</span>' : ''}
    </article>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureStyles() {
  if (document.getElementById('ss-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'ss-panel-styles';
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: min(380px, calc(100vw - 32px));
      max-height: min(60vh, 520px);
      overflow: auto;
      z-index: 9999;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 13px;
      color: #e8eef7;
      background: rgba(12, 18, 28, 0.92);
      border: 1px solid rgba(90, 140, 200, 0.35);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
      backdrop-filter: blur(8px);
    }
    #${PANEL_ID} .ss-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(90, 140, 200, 0.25);
      position: sticky;
      top: 0;
      background: rgba(12, 18, 28, 0.95);
    }
    #${PANEL_ID} .ss-header h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    #${PANEL_ID} .ss-header button {
      background: transparent;
      border: none;
      color: #9ab;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }
    #${PANEL_ID} .ss-body {
      padding: 8px 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    #${PANEL_ID} .ss-empty {
      opacity: 0.65;
      padding: 12px 4px;
      text-align: center;
    }
    #${PANEL_ID} .ss-card {
      border-radius: 8px;
      padding: 10px;
      background: rgba(255,255,255,0.04);
      border-left: 3px solid #4a90d9;
    }
    #${PANEL_ID} .ss-card.ss-warn { border-left-color: #e0a020; }
    #${PANEL_ID} .ss-card.ss-critical { border-left-color: #e05050; }
    #${PANEL_ID} .ss-card header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;
      opacity: 0.85;
      font-size: 11px;
    }
    #${PANEL_ID} .ss-type {
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
    }
    #${PANEL_ID} .ss-desc { margin: 0 0 6px; line-height: 1.35; }
    #${PANEL_ID} .ss-flags {
      margin: 0 0 6px;
      padding-left: 16px;
      color: #f0c070;
    }
    #${PANEL_ID} .ss-action { margin: 0; opacity: 0.9; }
    #${PANEL_ID} .ss-hil {
      display: inline-block;
      margin-top: 6px;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(74, 144, 217, 0.25);
    }
    #${PANEL_ID}.ss-collapsed .ss-body { display: none; }
  `;
  document.head.appendChild(style);
}

export const SilentSentinelPanel = {
  mount(parent: HTMLElement = document.body) {
    ensureStyles();
    let root = document.getElementById(PANEL_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = PANEL_ID;
      root.innerHTML = `
        <div class="ss-header">
          <h2>Silent Sentinel Edge</h2>
          <button type="button" title="Collapse" aria-label="Collapse">−</button>
        </div>
        <div class="ss-body"><div class="ss-empty">Waiting for edge events…</div></div>
      `;
      parent.appendChild(root);

      const btn = root.querySelector('button');
      btn?.addEventListener('click', () => {
        root!.classList.toggle('ss-collapsed');
        btn.textContent = root!.classList.contains('ss-collapsed') ? '+' : '−';
      });
    }

    const body = root.querySelector('.ss-body') as HTMLElement;

    silentSentinelBridge.start();
    const unsub = silentSentinelBridge.subscribe((events) => {
      if (!events.length) {
        body.innerHTML = `<div class="ss-empty">No edge events yet. Run the Jetson pipeline or POST to /api/silent-sentinel/events</div>`;
        return;
      }
      body.innerHTML = events.slice(0, 12).map(renderEvent).join('');
    });

    return () => {
      unsub();
      silentSentinelBridge.stop();
      root?.remove();
    };
  },
};
