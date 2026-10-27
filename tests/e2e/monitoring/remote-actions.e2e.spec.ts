import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';

/**
 * Monitoring › Remote Actions is an Internal/admin screen and is NOT store-scoped:
 * the route is `/pos/nail/admin/remote-actions`, so nothing here may hardcode or
 * expect `/pos/<id>/`.
 *
 * Expectations are taken from the manual QA sweep in docs 20-monitoring.md: a list
 * of ~58 server-issued actions with columns Merchant / Action / Result / Sent at,
 * filters Merchant / Action / Result and a Refresh button. A clicked row opens a
 * detail sheet (Author + Email, Merchant, Device, Sent, Last report, Result,
 * Payload). Result reads one of "Reported" / "No device picked it up" /
 * "Failed on device".
 *
 * SAFETY: sending a remote action executes a command on a live POS device, so
 * every spec here blocks writes first — an accidental mutation never reaches the
 * backend. The list itself is read-only.
 */
test.describe('Tải trang & bố cục (Page load / Layout) — Remote Actions', () => {
  test.beforeEach(async ({ remoteActionsPage }) => {
    await remoteActionsPage.blockWrites();
    await remoteActionsPage.goto();
  });

  /**
   * TC-RMA-001 — direct navigation renders the remote-actions list, no login
   * redirect.
   */
  test(
    'TC-RMA-001 — direct navigation renders the remote-actions list, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ remoteActionsPage, page }) => {
      await remoteActionsPage.waitForReady();

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/remote-actions/);
      await expect(remoteActionsPage.pageHeader.first()).toBeVisible();
      await expect(remoteActionsPage.table.rows.first()).toBeVisible();
    },
  );

  /**
   * TC-RMA-002 — the toolbar exposes the Merchant / Action / Result filters and a
   * Refresh button.
   */
  test(
    'TC-RMA-002 — toolbar exposes the Merchant / Action / Result filters and Refresh',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ remoteActionsPage }) => {
      await remoteActionsPage.waitForReady();

      await expect(remoteActionsPage.merchantFilter).toBeVisible();
      await expect(remoteActionsPage.actionFilter).toBeVisible();
      await expect(remoteActionsPage.resultFilter).toBeVisible();
      await expect(remoteActionsPage.refreshButton).toBeVisible();
    },
  );

  /**
   * TC-RMA-003 — clicking the first row opens the detail sheet and surfaces its
   * Result.
   *
   * Tolerant by design: the shared DEV feed can be empty, so this skips rather
   * than fails when there are no rows to open.
   */
  test(
    'TC-RMA-003 — clicking a row opens the detail sheet showing its Result',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ remoteActionsPage }) => {
      await remoteActionsPage.waitForReady();
      const rowCount = await remoteActionsPage.table.rows.count();
      test.skip(rowCount === 0, 'no remote actions to open');

      await remoteActionsPage.table.rows.first().click();

      await expect(remoteActionsPage.detailSheet).toBeVisible();
      await expect(remoteActionsPage.sheetValue('Result').first()).toBeVisible();
    },
  );

  /**
   * TC-RMA-004 — reload keeps the URL, the session and the rendered table.
   */
  test(
    'TC-RMA-004 — reload keeps the URL, the session and the table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ remoteActionsPage, page }) => {
      await remoteActionsPage.waitForReady();
      const urlBefore = page.url();
      const rowsBefore = await remoteActionsPage.table.rows.count();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await remoteActionsPage.waitForReady();

      await expect(page).toHaveURL(urlBefore);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(remoteActionsPage.table.rows).toHaveCount(rowsBefore);
    },
  );

  /**
   * TC-RMA-005 — page load produces no uncaught errors and no unexpected 4xx/5xx.
   * The cold session-refresh 401 is excluded, as on every other admin screen.
   */
  test(
    'TC-RMA-005 — page load produces no uncaught errors and no unexpected 4xx/5xx',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ remoteActionsPage, page }) => {
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

      await page.goto(Urls.REMOTE_ACTIONS, { waitUntil: 'domcontentloaded' });
      await remoteActionsPage.waitForReady();

      expect(pageErrors, 'uncaught exceptions').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
      expect(badResponses, 'failed requests').toEqual([]);
    },
  );
});
