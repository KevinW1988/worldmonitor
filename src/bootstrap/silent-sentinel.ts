/**
 * Optional bootstrap for Silent Sentinel + Colorado FWI panels.
 *
 *   ?silentSentinel=1  — edge bridge panel
 *   ?fwi=1             — live NIFC/NWS FWI panel
 *   both can be combined
 */

import { SilentSentinelPanel } from '../components/SilentSentinelPanel';
import { FwiPanel } from '../components/FwiPanel';
import { silentSentinelBridge } from '../services/silent-sentinel-bridge';

export function bootSilentSentinel(opts?: { baseUrl?: string; pollMs?: number }) {
  if (opts) silentSentinelBridge.configure(opts);
  return SilentSentinelPanel.mount(document.body);
}

export function bootFwi() {
  return FwiPanel.mount(document.body);
}

if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const ss =
    params.get('silentSentinel') === '1' ||
    params.get('ss') === '1' ||
    window.localStorage.getItem('wm:silentSentinel') === '1';
  const fwi =
    params.get('fwi') === '1' ||
    params.get('view') === 'colorado-fwi' ||
    window.localStorage.getItem('wm:fwi') === '1';

  const start = () => {
    if (ss) bootSilentSentinel();
    if (fwi || ss) bootFwi();
  };

  if (ss || fwi) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
}
