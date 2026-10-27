import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { DevicesTab } from '@pages/devices/DevicesPage';

/**
 * Devices (Internal › Device Management) is an admin screen and is NOT
 * store-scoped: the route is `/pos/nail/admin/devices`, so nothing here may
 * hardcode or expect `/pos/<id>/`.
 *
 * The screen carries three tabs — Devices (the fleet, default Status=Active /
 * Connection=Online), Pending registrations and Device history — and three
 * live-fleet writes (approve / deactivate / send remote action). Every spec in
 * this folder blocks writes first, so an accidental mutation never reaches the
 * backend. Navigation is always `open(tab)` — there is no plain goto with tabs.
 */
test.describe('Tải trang, bố cục & tabs (Page load / Layout / Tabs) — Devices', () => {
  test.beforeEach(async ({ devicesPage }) => {
    await devicesPage.blockWrites();
    await devicesPage.open(DevicesTab.DEVICES);
  });

  /**
   * TC-DEV-001 — direct navigation renders the device list, no login redirect.
   */
  test(
    'TC-DEV-001 — open(DEVICES) renders the device list, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ devicesPage, page }) => {
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/devices/);
      await expect(devicesPage.pageTitle).toBeVisible();
      await expect(devicesPage.rowOrEmpty).toBeVisible();
    },
  );

  /**
   * TC-DEV-002 — the page header renders the "Devices" title.
   */
  test(
    'TC-DEV-002 — the page header renders the "Devices" title',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ devicesPage }) => {
      await expect(devicesPage.pageTitle).toBeVisible();
      await expect(devicesPage.pageTitle).toContainText(/devices/i);
      await expect(devicesPage.pageHeader.first()).toBeVisible();
    },
  );

  /**
   * TC-DEV-003 — the three sub-tabs render and are reachable by name.
   *
   * Tolerant by design: the three documented tabs must be visible, but the exact
   * tab count is asserted as "at least three" rather than frozen.
   */
  test(
    'TC-DEV-003 — the Devices / Pending registrations / Device history tabs are visible',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ devicesPage }) => {
      expect(await devicesPage.tabs.count()).toBeGreaterThanOrEqual(3);
      await expect(devicesPage.tab(/^devices$/i)).toBeVisible();
      await expect(devicesPage.tab(/pending/i)).toBeVisible();
      await expect(devicesPage.tab(/history/i)).toBeVisible();
    },
  );

  /**
   * TC-DEV-004 — reload keeps the URL, the session and the rendered table.
   */
  test(
    'TC-DEV-004 — reload keeps the URL, the session and the table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ devicesPage, page }) => {
      const urlBefore = page.url();
      const rowsBefore = await devicesPage.table.rows.count();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await devicesPage.waitForReady();

      await expect(page).toHaveURL(urlBefore);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(devicesPage.pageTitle).toBeVisible();
      await expect(devicesPage.table.rows).toHaveCount(rowsBefore);
    },
  );

  /**
   * TC-DEV-005 — page load produces no uncaught errors and no unexpected 4xx/5xx.
   * The cold session-refresh 401 is excluded, as on every other admin screen.
   */
  test(
    'TC-DEV-005 — page load produces no uncaught errors and no unexpected 4xx/5xx',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ devicesPage, page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const badResponses: string[] = [];
      const isSessionRefresh = (url: string): boolean =>
        /\/sessions\/current|\/refresh_token/.test(url);

      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        if (/status of 401/.test(message.text())) return;
        consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('response', (response) => {
        if (response.status() < 400) return;
        if (response.status() === 401 && isSessionRefresh(response.url())) return;
        badResponses.push(`${response.status()} ${response.url()}`);
      });

      await devicesPage.open(DevicesTab.DEVICES);

      expect(pageErrors, 'uncaught exceptions').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
      expect(badResponses, 'failed requests').toEqual([]);
    },
  );
});
