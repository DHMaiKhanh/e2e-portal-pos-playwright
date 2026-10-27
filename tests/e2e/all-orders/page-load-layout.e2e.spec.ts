import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { ALL_ORDERS_COLUMNS } from '@pages/orders/AllOrdersPage';

/**
 * All Orders (Internal) is a cross-merchant admin list and is NOT store-scoped:
 * the route is `/pos/<seg>/admin/orders`, so nothing here may hardcode or expect
 * `/pos/<id>/`. Columns (from docs 17-all-orders.md) are
 * Order ID / Merchant / Status / Amount / Date, with a Merchant / Staff /
 * Payment method / Status filter toolbar and a search box; the list filters out
 * Pending by default and carries no Export button.
 *
 * The list screen is read-only — opening a row navigates to the store-scoped
 * Order detail where the money actions live — so every spec blocks writes first,
 * and an accidental mutation never reaches the backend.
 */
test.describe('Tải trang & bố cục (Page load / Layout) — All Orders', () => {
  test.beforeEach(async ({ allOrdersPage }) => {
    await allOrdersPage.blockWrites();
    await allOrdersPage.goto();
  });

  /**
   * TC-AOR-001 — direct navigation renders the order list, no login redirect.
   */
  test(
    'TC-AOR-001 — direct navigation renders the All Orders list, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ allOrdersPage, page }) => {
      await allOrdersPage.waitForReady();

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/orders/);
      await expect(allOrdersPage.pageTitle).toBeVisible();
      await expect(allOrdersPage.table.rows.first().or(allOrdersPage.emptyState)).toBeVisible();
    },
  );

  /**
   * TC-AOR-002 — the table exposes the documented columns.
   */
  test(
    'TC-AOR-002 — order table renders Order ID / Merchant / Status / Amount / Date',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ allOrdersPage }) => {
      await allOrdersPage.waitForReady();
      // Columns can hide at narrow widths; assert the known labels are present in
      // the header set rather than freezing an exact count.
      for (const label of ALL_ORDERS_COLUMNS) {
        await expect(
          allOrdersPage.columnHeaders.filter({ hasText: new RegExp(label, 'i') }).first(),
        ).toBeVisible();
      }
    },
  );

  /**
   * TC-AOR-003 — the toolbar (search box + Merchant / Status filters) is present.
   * Opening any of them is a view-only action — nothing is confirmed here.
   */
  test(
    'TC-AOR-003 — toolbar exposes the search box and the Merchant / Status filters',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ allOrdersPage }) => {
      await allOrdersPage.waitForReady();
      await expect(allOrdersPage.searchInput).toBeVisible();
      await expect(allOrdersPage.merchantFilter).toBeVisible();
      await expect(allOrdersPage.statusFilter).toBeVisible();
    },
  );

  /**
   * TC-AOR-004 — reload keeps the URL, the session and the rendered table.
   */
  test(
    'TC-AOR-004 — reload keeps the URL, the session and the table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ allOrdersPage, page }) => {
      await allOrdersPage.waitForReady();
      const urlBefore = page.url();
      const rowsBefore = await allOrdersPage.table.rows.count();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await allOrdersPage.waitForReady();

      await expect(page).toHaveURL(urlBefore);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(allOrdersPage.pageTitle).toBeVisible();
      await expect(allOrdersPage.table.rows).toHaveCount(rowsBefore);
    },
  );

  /**
   * TC-AOR-005 — page load produces no uncaught errors and no unexpected 4xx/5xx.
   *
   * The Portal keeps a short-lived access token and refreshes it lazily: a cold
   * load reliably answers `GET /sessions/current` with 401, then
   * `POST /refresh_token`, then repeats the call successfully. That 401 is the
   * documented mechanism, not a fault, so it is excluded — everything else is not.
   */
  test(
    'TC-AOR-005 — page load produces no uncaught errors and no unexpected 4xx/5xx',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ allOrdersPage, page }) => {
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

      await page.goto(Urls.ALL_ORDERS, { waitUntil: 'domcontentloaded' });
      await allOrdersPage.waitForReady();

      expect(pageErrors, 'uncaught exceptions').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
      expect(badResponses, 'failed requests').toEqual([]);
    },
  );
});
