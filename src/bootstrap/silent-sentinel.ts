/**
 * Optional bootstrap for Silent Sentinel + Colorado FWI + Flock Watchdog panels.
 *
 *   ?silentSentinel=1  — edge bridge panel
 *   ?fwi=1             — live NIFC/NWS FWI panel
 *   ?flock=1           — 5 Key Flock Watchdog Sites table
 *   combined freely
 */

import { SilentSentinelPanel } from '../components/SilentSentinelPanel';
import { FwiPanel } from '../components/FwiPanel';
import { FlockWatchdogPanel } from '../components/FlockWatchdogPanel';
import { silentSentinelBridge } from '../services/silent-sentinel-bridge';

export function bootSilentSentinel(opts?: { baseUrl?: string; pollMs?: number }) {
  if (opts) silentSentinelBridge.configure(opts);
  return SilentSentinelPanel.mount(document.body);
}

export function bootFwi() {
  return FwiPanel.mount(document.body);
}

export function bootFlockWatchdog() {
  return FlockWatchdogPanel.mount(document.body);
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
  const flock =
    params.get('flock') === '1' ||
    params.get('flockWatchdog') === '1' ||
    window.localStorage.getItem('wm:flock') === '1';

  const start = () => {
    if (ss) bootSilentSentinel();
    if (fwi || ss) bootFwi();
    if (flock || ss) bootFlockWatchdog();
  };

  if (ss || fwi || flock) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
}
