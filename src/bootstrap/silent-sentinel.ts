/**
 * Optional bootstrap entry for the Silent Sentinel panel.
 * Import this from main or call from the console / a variant entrypoint:
 *
 *   import { bootSilentSentinel } from './bootstrap/silent-sentinel';
 *   bootSilentSentinel();
 */

import { SilentSentinelPanel } from '../components/SilentSentinelPanel';
import { silentSentinelBridge } from '../services/silent-sentinel-bridge';

export function bootSilentSentinel(opts?: { baseUrl?: string; pollMs?: number }) {
  if (opts) silentSentinelBridge.configure(opts);
  return SilentSentinelPanel.mount(document.body);
}

// Auto-mount when ?silentSentinel=1 or localStorage flag is set
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const enabled =
    params.get('silentSentinel') === '1' ||
    params.get('ss') === '1' ||
    window.localStorage.getItem('wm:silentSentinel') === '1';
  if (enabled) {
    // Defer until DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => bootSilentSentinel());
    } else {
      bootSilentSentinel();
    }
  }
}
