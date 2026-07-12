import { devices, expect, test } from '@playwright/test';

const { defaultBrowserType, ...mobileDevice } = devices['Pixel 7'];
void defaultBrowserType;

test.describe('mobile primary navigation (#5201 P0)', () => {
  test.use({ ...mobileDevice });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('mobile-map-collapsed');
      localStorage.setItem('wm-layer-warning-dismissed', 'true');
    });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-wm-event-handlers-ready', 'true', { timeout: 45_000 });
  });

  test('uses Today as home and switches between Map, Search, Alerts, and More', async ({ page }) => {
    const tabs = page.locator('#mobileTabBar');
    await expect(tabs).toBeVisible();
    await expect(page.locator('#mapSection')).toHaveClass(/collapsed/);
    await expect(page.locator('.site-footer')).toBeHidden();
    await expect(page.locator('.hamburger-btn')).toBeHidden();
    await expect(page.locator('#searchMobileFab')).toHaveCount(0);

    const tabBox = await tabs.boundingBox();
    expect(tabBox).not.toBeNull();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(Math.abs((tabBox?.y ?? 0) + (tabBox?.height ?? 0) - viewportHeight)).toBeLessThanOrEqual(2);

    await page.locator('[data-mobile-tab="map"]').click();
    await expect(page.locator('#mapSection')).toHaveClass(/live-news-fullscreen/);
    const mapBox = await page.locator('#mapSection').boundingBox();
    expect(mapBox).not.toBeNull();
    expect((mapBox?.y ?? 0) + (mapBox?.height ?? 0)).toBeLessThanOrEqual((tabBox?.y ?? 844) + 2);

    await page.locator('[data-mobile-tab="search"]').click();
    await expect(page.locator('#mapSection')).not.toHaveClass(/live-news-fullscreen/);
    await expect(page.locator('.search-overlay.search-mobile')).toHaveClass(/open/);
    await page.evaluate(() => history.back());
    await expect(page.locator('.search-overlay.search-mobile')).toHaveCount(0, { timeout: 2_000 });

    await page.locator('[data-mobile-tab="more"]').click();
    await expect(page.locator('#mobileMenu')).toHaveClass(/open/);
    await expect(page.locator('#mobileAuthFallback, #mobileAuthWidgetMount .auth-signin-btn').first()).toBeVisible();
    await page.evaluate(() => history.back());
    await expect(page.locator('#mobileMenu')).not.toHaveClass(/open/);

    await page.locator('[data-mobile-tab="alerts"]').click();
    await expect(page.locator('[data-mobile-tab="alerts"]')).toHaveAttribute('aria-current', 'page');
  });

  test('uses one Back press for the More to Region sheet transition', async ({ page }) => {
    await page.locator('[data-mobile-tab="more"]').click();
    await page.locator('#mobileMenuRegion').click();
    await expect(page.locator('#mobileMenu')).not.toHaveClass(/open/);
    await expect(page.locator('#regionBottomSheet')).toHaveClass(/open/);

    const historyMarker = await page.evaluate(() => history.state?.__wmOverlay?.id ?? null);
    expect(historyMarker).toBe('region');
    await page.evaluate(() => history.back());
    await expect(page.locator('#regionBottomSheet')).not.toHaveClass(/open/);
    await expect(page.locator('#mobileMenu')).not.toHaveClass(/open/);
  });

  test('atomically replaces More with Search in one history entry', async ({ page }) => {
    const baselineHistoryLength = await page.evaluate(() => history.length);
    await page.locator('[data-mobile-tab="more"]').click();
    await page.locator('[data-mobile-tab="search"]').click();
    const search = page.locator('.search-overlay.search-mobile');
    await expect(search).toHaveClass(/open/);
    await expect.poll(async () => page.evaluate(() => history.state?.__wmOverlay?.id ?? null)).toBe('search');
    expect(await page.evaluate(() => history.length)).toBe(baselineHistoryLength + 1);

    await page.evaluate(() => history.back());
    await expect(search).toHaveCount(0);
    await expect(page.locator('#mobileMenu')).not.toHaveClass(/open/);
  });

  test('closes Settings with browser Back after opening it from More', async ({ page }) => {
    const baselineHistoryLength = await page.evaluate(() => history.length);
    await page.locator('[data-mobile-tab="more"]').click();
    await page.locator('#mobileMenuSettings').click();
    const settings = page.locator('#unifiedSettingsModal');
    await expect(settings).toHaveClass(/active/);
    await expect.poll(async () => page.evaluate(() => history.state?.__wmOverlay?.id ?? null)).toBe('settings');
    expect(await page.evaluate(() => history.length)).toBe(baselineHistoryLength + 1);

    await page.evaluate(() => history.back());
    await expect(settings).not.toHaveClass(/active/);
  });

  test('reveals an enabled alert panel and reports when none are enabled', async ({ page }) => {
    const strategicRisk = page.locator('#panelsGrid [data-panel="strategic-risk"]');
    await expect(strategicRisk).toHaveCount(1);
    await page.locator('#panelsGrid [data-panel="oref-sirens"], #panelsGrid [data-panel="intel"]').evaluateAll((panels) => {
      panels.forEach((panel) => panel.classList.add('hidden'));
    });
    await strategicRisk.evaluate((panel) => {
      panel.classList.remove('hidden');
    });

    await page.locator('[data-mobile-tab="alerts"]').click();
    await expect(strategicRisk).toBeInViewport();

    await page.locator('#panelsGrid [data-panel="strategic-risk"], #panelsGrid [data-panel="oref-sirens"], #panelsGrid [data-panel="intel"]').evaluateAll((panels) => {
      panels.forEach((panel) => panel.classList.add('hidden'));
    });
    await page.locator('[data-mobile-tab="alerts"]').click();
    await expect(page.locator('.toast-notification')).toContainText('No active alerts yet');
  });
});

test.describe('desktop navigation parity (#5201 P0)', () => {
  test('keeps the existing footer and does not expose the mobile tab bar', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-wm-event-handlers-ready', 'true', { timeout: 45_000 });
    await expect(page.locator('#mobileTabBar')).toBeHidden();
    await expect(page.locator('.site-footer')).toBeVisible();
    await expect(page.locator('#mapSection')).not.toHaveClass(/collapsed/);
  });
});
