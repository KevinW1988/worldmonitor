import './styles/base-layer.css';
import './bootstrap/zod-csp';
import { SITE_VARIANT } from '@/config/variant';
import { installLcpAttributionDebug } from '@/bootstrap/lcp-attribution';
import { markLcpDebug } from '@/utils/lcp-debug';
import { enqueueSentryCall, installPreInitErrorQueue, scheduleSentryInit } from '@/bootstrap/sentry-defer';
import { registerClsReporting } from '@/bootstrap/cls-report';
import { registerInpReporting } from '@/bootstrap/inp-report';
import { registerLcpReporting } from '@/bootstrap/lcp-report';
import { initVercelAnalytics } from '@/bootstrap/secondary-startup';
import { App } from './App';
import { installUtmInterceptor } from './utils/utm';

if (SITE_VARIANT === 'happy') {
  void import('./styles/happy-theme.css');
}

function activateDeferredDashboardStyles(): void {
  document
    .querySelectorAll<HTMLLinkElement>('link[data-wm-deferred-style="dashboard"][media="print"]')
    .forEach((link) => {
      link.media = 'all';
    });
}

activateDeferredDashboardStyles();
installLcpAttributionDebug();

installPreInitErrorQueue();
scheduleSentryInit();

registerInpReporting();
registerClsReporting();
registerLcpReporting();

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.name === 'NotAllowedError') e.preventDefault();
});

function shouldSuppressCspViolation(
  disposition: string,
  directive: string,
  blockedURI: string,
  sourceFile: string,
  cspConnectSrcAllowsHttps: boolean,
  firstPartyConvexHost: string | null,
  cspMediaSrcAllowsHttps: boolean = false,
): boolean {
  if (disposition && disposition !== 'enforce') return true;
  if (directive === 'connect-src' && cspConnectSrcAllowsHttps) {
    try {
      if (new URL(blockedURI).protocol === 'https:') return true;
    } catch { /* */ }
  }
  if (directive === 'media-src' && cspMediaSrcAllowsHttps) {
    try {
      if (new URL(blockedURI).protocol === 'https:') return true;
    } catch { /* */ }
  }
  if (directive === 'media-src') {
    try {
      if (new URL(blockedURI).hostname === 'tts.baidu.com') return true;
    } catch { /* */ }
  }
  if (directive === 'default-src') {
    try {
      const u = new URL(blockedURI);
      if (u.protocol === 'http:'
          && u.hostname !== 'worldmonitor.app'
          && !u.hostname.endsWith('.worldmonitor.app')) return true;
    } catch { /* */ }
  }
  if (directive === 'connect-src' && firstPartyConvexHost) {
    try {
      if (new URL(blockedURI).hostname === firstPartyConvexHost) return true;
    } catch { /* */ }
  }
  if (directive === 'img-src') {
    try {
      const url = new URL(blockedURI);
      if (url.protocol === 'https:'
          && (url.hostname === 'worldmonitor.app' || url.hostname.endsWith('.worldmonitor.app'))) return true;
    } catch { /* */ }
  }
  if (
    (directive === 'script-src-elem' || directive === 'script-src')
    && /^https:\/\/www\.youtube\.com\/iframe_api(?:\?|$)/.test(blockedURI)
  ) return true;
  if (directive === 'frame-src') {
    try {
      const frameHost = new URL(blockedURI).hostname;
      if (frameHost === 'gateway.zscloud.net') return true;
      if (frameHost === 'netstar-inc.com' || frameHost.endsWith('.netstar-inc.com')) return true;
      if (frameHost === 'techloq.com' || frameHost.endsWith('.techloq.com')) return true;
      if (frameHost === 'trendmicro.com' || frameHost.endsWith('.trendmicro.com')) return true;
      if (frameHost.endsWith('.clients6.google.com')) return true;
      if (frameHost === 'h5player.anzz.site') return true;
    } catch { /* */ }
  }
  if (/^(?:chrome|moz|safari(?:-web)?|ms-browser)-extension/.test(sourceFile) || /^(?:chrome|moz|safari(?:-web)?|ms-browser)-extension/.test(blockedURI)) return true;
  if (blockedURI === 'blob' || /^blob:/.test(sourceFile) || /^blob:/.test(blockedURI)) return true;
  if (blockedURI === 'eval' || blockedURI === 'inline' || blockedURI === 'data' || /^data:/.test(blockedURI)) return true;
  if (blockedURI === 'about' || /^about:/.test(blockedURI)) return true;
  if (blockedURI === 'android-webview-video-poster') return true;
  if (/manifest\.webmanifest$/.test(blockedURI)) return true;
  if (/gstatic\.com\/_\/translate/.test(blockedURI) || /facebook\.net/.test(blockedURI)) return true;
  if (directive === 'font-src') {
    try {
      const url = new URL(blockedURI);
      if (url.protocol === 'https:' && url.hostname === 'fonts.gstatic.com' && /^\/s\/.+\.woff2$/.test(url.pathname)) return true;
      if (url.protocol === 'https:' && url.hostname === 'frontend-cdn.perplexity.ai' && /\.woff2?$/.test(url.pathname)) return true;
      if (url.protocol === 'https:' && url.hostname === 'lf-flow-web-cdn.doubao.com' && /\.(?:woff2?|ttf)$/.test(url.pathname)) return true;
    } catch { /* */ }
  }
  if (/googlevideo\.com|youtube\.com\/generate_204/.test(blockedURI)) return true;
  if (/securly\.com|goguardian\.com|contentkeeper\.com/.test(blockedURI)) return true;
  if (/_vercel\/insights\/script\.js/.test(blockedURI)) return true;
  if (/^style-src(-elem)?$/.test(directive) && /^https:\/\/cdn\.jsdelivr\.net\//.test(blockedURI)) return true;
  if (/^style-src(-elem)?$/.test(directive)) {
    try {
      const url = new URL(blockedURI);
      if (url.protocol === 'https:' && url.hostname === 'fonts.googleapis.com' && /^\/css2?$/.test(url.pathname)) return true;
      if (url.protocol === 'https:' && url.hostname === 'www.6ppn.com' && /\.css$/.test(url.pathname)) return true;
    } catch { /* */ }
    if (blockedURI === 'https://[email]') return true;
  }
  if (blockedURI === 'inline' && directive === 'script-src-elem') return true;
  if (blockedURI === 'null') return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(blockedURI)) return true;
  return false;
}
const _cspAllowsHttps = (() => {
  const metaEl = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!metaEl) return true;
  const metaCsp = metaEl.getAttribute('content') ?? '';
  const metaConnectSrc = metaCsp.match(/connect-src\s+([^;]*)/)?.[1] ?? '';
  return metaConnectSrc.split(/\s+/).includes('https:');
})();
const _cspMediaSrcAllowsHttps = (() => {
  const metaEl = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!metaEl) return true;
  const metaCsp = metaEl.getAttribute('content') ?? '';
  const metaMediaSrc = metaCsp.match(/media-src\s+([^;]*)/)?.[1] ?? '';
  return metaMediaSrc.split(/\s+/).includes('https:');
})();
const _firstPartyConvexHost = ((): string | null => {
  const url = import.meta.env.VITE_CONVEX_URL;
  if (typeof url !== 'string' || url.length === 0) return null;
  try { return new URL(url).hostname; } catch { return null; }
})();
// @ts-expect-error — expose for tests
window.__shouldSuppressCspViolation = shouldSuppressCspViolation;

window.addEventListener('securitypolicyviolation', (e) => {
  const blocked = e.blockedURI ?? '';
  if (shouldSuppressCspViolation(
    e.disposition ?? '',
    e.effectiveDirective ?? '',
    blocked,
    e.sourceFile ?? '',
    _cspAllowsHttps,
    _firstPartyConvexHost,
    _cspMediaSrcAllowsHttps,
  )) return;
  const message = `CSP: ${e.effectiveDirective} blocked ${blocked || '(inline)'}`;
  const extra = {
    violatedDirective: e.violatedDirective,
    effectiveDirective: e.effectiveDirective,
    blockedURI: blocked,
    sourceFile: e.sourceFile,
    lineNumber: e.lineNumber,
    disposition: e.disposition,
  };
  enqueueSentryCall((s) => {
    s.captureMessage(message, {
      level: 'warning',
      tags: { kind: 'csp_violation' },
      extra,
    });
  });
});

import { debugGetCells, getCellCount } from '@/services/geo-convergence';
import { initMetaTags } from '@/services/meta-tags';
import { installRuntimeFetchPatch, installWebApiRedirect } from '@/services/runtime';
import { loadDesktopSecrets } from '@/services/runtime-config';
import { applyStoredTheme } from '@/utils/theme-manager';
import { applyFont } from '@/services/font-settings';
import { initAnalytics } from '@/services/analytics';
import { clearChunkReloadGuard, installChunkReloadGuard } from '@/bootstrap/chunk-reload';
import { initDebugBearRum } from '@/bootstrap/debugbear-rum';
import { installStaleBundleCheck } from '@/bootstrap/stale-bundle-check';
import { installSwUpdateHandler } from '@/bootstrap/sw-update';

const chunkReloadStorageKey = installChunkReloadGuard(__APP_VERSION__);

void initAnalytics();
initVercelAnalytics();
initDebugBearRum();

initMetaTags();

installRuntimeFetchPatch();
installWebApiRedirect();
installStaleBundleCheck();
loadDesktopSecrets().catch(() => {});

applyStoredTheme();
applyFont();

if (SITE_VARIANT && SITE_VARIANT !== 'full') {
  document.documentElement.dataset.variant = SITE_VARIANT;

  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(link => {
    link.href = link.href
      .replace(/\/favico\/favicon/g, `/favico/${SITE_VARIANT}/favicon`)
      .replace(/\/favico\/apple-touch-icon/g, `/favico/${SITE_VARIANT}/apple-touch-icon`);
  });
}

requestAnimationFrame(() => {
  document.documentElement.classList.remove('no-transition');
});

try {
  localStorage.removeItem('wm-settings-open');
} catch {
  // Storage may be unavailable
}

const urlParams = new URL(location.href).searchParams;
if (urlParams.get('settings') === '1') {
  void Promise.all([import('./services/i18n'), import('./settings-window')]).then(
    async ([i18n, m]) => {
      await i18n.initI18n();
      m.initSettingsWindow();
    }
  );
} else if (urlParams.get('live-channels') === '1') {
  void Promise.all([import('./services/i18n'), import('./live-channels-window')]).then(
    async ([i18n, m]) => {
      await i18n.initI18n();
      m.initLiveChannelsWindow();
    }
  );
} else {
  installUtmInterceptor();
  markLcpDebug('wm:boot:app-construct');
  const app = new App('app');
  app
    .init()
    .then(() => {
      clearChunkReloadGuard(chunkReloadStorageKey);
    })
    .catch(console.error);

  // Silent Sentinel Edge + Colorado FWI panels (optional)
  const ssEnabled =
    urlParams.get('silentSentinel') === '1' ||
    urlParams.get('ss') === '1' ||
    (() => {
      try {
        return localStorage.getItem('wm:silentSentinel') === '1';
      } catch {
        return false;
      }
    })();
  const fwiEnabled =
    urlParams.get('fwi') === '1' ||
    urlParams.get('view') === 'colorado-fwi' ||
    (() => {
      try {
        return localStorage.getItem('wm:fwi') === '1';
      } catch {
        return false;
      }
    })();

  if (ssEnabled || fwiEnabled) {
    void import('./bootstrap/silent-sentinel')
      .then((m) => {
        if (ssEnabled) m.bootSilentSentinel();
        if (fwiEnabled || ssEnabled) m.bootFwi();
      })
      .catch(console.warn);
  }
}

(window as unknown as Record<string, unknown>).geoDebug = {
  cells: debugGetCells,
  count: getCellCount,
};

Object.defineProperty(window, 'beta', {
  get() {
    const on = localStorage.getItem('worldmonitor-beta-mode') === 'true';
    console.log(`[Beta] ${on ? 'ON' : 'OFF'}`);
    return on;
  },
  set(v: boolean) {
    if (v) localStorage.setItem('worldmonitor-beta-mode', 'true');
    else localStorage.removeItem('worldmonitor-beta-mode');
    location.reload();
  },
});

if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) {
  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
    e.preventDefault();
  });
}

if (!('__TAURI_INTERNALS__' in window) && !('__TAURI__' in window) && 'serviceWorker' in navigator) {
  installSwUpdateHandler({ version: __APP_VERSION__ });

  const SW_UPDATE_SUCCESS_INTERVAL_MS = 60 * 60 * 1000;
  const SW_UPDATE_FAILURE_INTERVAL_MS = 5 * 60 * 1000;
  const SW_UPDATE_LAST_CHECK_KEY = 'wm-sw-last-update-check';
  const SW_UPDATE_LAST_RESULT_KEY = 'wm-sw-last-update-ok';

  const readStorageNum = (key: string): number => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? Number(raw) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  };

  const writeStorageNum = (key: string, value: number): void => {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  };

  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('[PWA] Service worker registered');

      let swUpdateInFlight = false;

      const maybeCheckForSwUpdate = async (
        reason: 'initial' | 'visible' | 'online' | 'interval'
      ): Promise<void> => {
        if (swUpdateInFlight) return;
        if (!navigator.onLine) return;
        if (reason === 'interval' && document.visibilityState !== 'visible') return;

        const now = Date.now();
        const lastCheck = readStorageNum(SW_UPDATE_LAST_CHECK_KEY);
        const lastOk = readStorageNum(SW_UPDATE_LAST_RESULT_KEY);
        const interval = lastOk >= lastCheck ? SW_UPDATE_SUCCESS_INTERVAL_MS : SW_UPDATE_FAILURE_INTERVAL_MS;
        if (now - lastCheck < interval) return;

        swUpdateInFlight = true;
        writeStorageNum(SW_UPDATE_LAST_CHECK_KEY, now);
        try {
          await registration.update();
          writeStorageNum(SW_UPDATE_LAST_RESULT_KEY, now);
        } catch (e) {
          console.warn('[PWA] SW update check failed:', e);
        } finally {
          swUpdateInFlight = false;
        }
      };

      void maybeCheckForSwUpdate('initial');

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void maybeCheckForSwUpdate('visible');
        }
      });

      window.addEventListener('online', () => {
        void maybeCheckForSwUpdate('online');
      });

      const swUpdateInterval = window.setInterval(() => {
        void maybeCheckForSwUpdate('interval');
      }, 15 * 60 * 1000);

      (window as unknown as Record<string, unknown>).__swUpdateInterval = swUpdateInterval;
    })
    .catch((err) => {
      console.warn('[PWA] Service worker registration failed:', err);
    });
}
