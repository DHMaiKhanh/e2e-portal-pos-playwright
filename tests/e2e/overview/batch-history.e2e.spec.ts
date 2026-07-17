import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Batch History" area (lean core).
 *
 * The "Batch History (Last 7 days)" section (table or clean empty state), its
 * column structure, and its "View All" link. Row values match FORMAT, not live
 * data.
 */
test.describe('Batch History — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-111 — renders the Batch History section (7-day scope) with a table or empty state',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      // The section label itself carries the "(Last 7 days)" scope.
      await expect(dashboardPage.batchHistorySection).toBeVisible();
      await expect(
        dashboardPage.batchHistoryTable.or(dashboardPage.batchEmptyState).first(),
      ).toBeVisible();
    },
  );

  test(
    'TC-OVW-112 — the table shows the DATE, BATCH #, AMOUNT, STATUS columns',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.batchHistoryTable).toBeVisible();
      await expect(dashboardPage.batchColumnHeader('DATE')).toBeVisible();
      await expect(dashboardPage.batchColumnHeader('BATCH #')).toBeVisible();
      await expect(dashboardPage.batchColumnHeader('AMOUNT')).toBeVisible();
      await expect(dashboardPage.batchColumnHeader('STATUS')).toBeVisible();
    },
  );

  test(
    'TC-OVW-115 — "View All" navigates to the batch page /pos/<id>/batch',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await dashboardPage.batchViewAllLink.click();
      await expect(page).toHaveURL(/\/pos\/\d+\/batch/);
      await expect(page).not.toHaveURL(/\/login/);
    },
  );
});
