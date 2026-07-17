import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Lịch sử Batch (Batch History) — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-111 — Batch History block renders with 7-day range label',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.batchHistorySection).toBeVisible();
      await expect(dashboardPage.batchHistorySection).toContainText(/Last 7 days/i);
      await expect(dashboardPage.batchHistoryTable.or(dashboardPage.batchEmptyState)).toBeVisible();
    },
  );

  test(
    'TC-OVW-112 — Batch History table shows DATE, BATCH #, AMOUNT, STATUS columns',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.batchColumnHeader('DATE')).toBeVisible();
      await expect(dashboardPage.batchColumnHeader('BATCH #')).toBeVisible();
      await expect(dashboardPage.batchColumnHeader('AMOUNT')).toBeVisible();
      await expect(dashboardPage.batchColumnHeader('STATUS')).toBeVisible();
    },
  );

  test(
    'TC-OVW-115 — View All link navigates to /pos/<id>/batch',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.batchViewAllLink).toBeVisible();
      await dashboardPage.batchViewAllLink.click();
      await expect(page).toHaveURL(/\/pos\/\d+\/batch/);
    },
  );
});
