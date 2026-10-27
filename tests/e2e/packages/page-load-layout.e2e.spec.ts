import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { PACKAGE_COLUMNS } from '@pages/packages/PackagesPage';

/**
 * Packages (POS package catalogue) is an Internal/admin screen and is NOT
 * store-scoped: the route is `/pos/nail/admin/packages`, so nothing here may
 * hardcode or expect `/pos/<id>/`.
 *
 * Expectations are taken from the manual QA sweep in docs 16-packages.md: a list
 * of ~19 packages with columns Package / Description / Enabled features (x/62) /
 * Last updated, paginated, with an "Add package" action and per-row Edit / Clone.
 * The list screen is read-only here — every spec in this folder blocks writes
 * first, so an accidental clone/create never reaches the backend.
 */
test.describe('Tải trang & bố cục (Page load / Layout) — Packages', () => {
  test.beforeEach(async ({ packagesPage }) => {
    await packagesPage.blockWrites();
    await packagesPage.goto();
  });

  /**
   * TC-PKG-001 — direct navigation renders the package list, no login redirect.
   */
  test(
    'TC-PKG-001 — direct navigation renders the package catalogue',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ packagesPage, page }) => {
      await packagesPage.waitForReady();

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/packages/);
      await expect(packagesPage.pageTitle).toBeVisible();
      await expect(packagesPage.table.rows.first()).toBeVisible();
    },
  );

  /**
   * TC-PKG-002 — the table exposes the documented columns.
   */
  test(
    'TC-PKG-002 — package table renders Package / Description / Enabled features / Last updated',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ packagesPage }) => {
      await packagesPage.waitForReady();
      // Columns can hide at narrow widths; assert the known labels are present in
      // the header set rather than freezing an exact count.
      for (const label of PACKAGE_COLUMNS) {
        await expect(
          packagesPage.columnHeaders.filter({ hasText: new RegExp(label, 'i') }).first(),
        ).toBeVisible();
      }
    },
  );

  /**
   * TC-PKG-003 — the "Add package" action is present and enabled (opening it is a
   * create flow, so this only asserts presence — it is never clicked through).
   */
  test(
    'TC-PKG-003 — toolbar exposes an enabled Add package action',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ packagesPage }) => {
      await packagesPage.waitForReady();
      await expect(packagesPage.addPackageButton).toBeVisible();
      await expect(packagesPage.addPackageButton).toBeEnabled();
    },
  );

  /**
   * TC-PKG-004 — reload keeps the URL, the session and the rendered table.
   */
  test(
    'TC-PKG-004 — reload keeps the URL, the session and the table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ packagesPage, page }) => {
      await packagesPage.waitForReady();
      const urlBefore = page.url();
      const rowsBefore = await packagesPage.table.rows.count();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await packagesPage.waitForReady();

      await expect(page).toHaveURL(urlBefore);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(packagesPage.table.rows).toHaveCount(rowsBefore);
    },
  );

  /**
   * TC-PKG-005 — page load produces no uncaught errors and no unexpected 4xx/5xx.
   * The cold session-refresh 401 is excluded, as on every other admin screen.
   */
  test(
    'TC-PKG-005 — page load produces no uncaught errors and no unexpected 4xx/5xx',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ packagesPage, page }) => {
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

      await page.goto(Urls.PACKAGES, { waitUntil: 'domcontentloaded' });
      await packagesPage.waitForReady();

      expect(pageErrors, 'uncaught exceptions').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
      expect(badResponses, 'failed requests').toEqual([]);
    },
  );
});
