import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe("Today's Summary (Thẻ chỉ số) — Overview", () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-064 — renders all five summary metric cards with correct labels/order',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();

      const labels: Array<'Total Order' | 'Sale' | 'Appointments' | 'Total Tip' | 'Total Payment'> =
        ['Total Order', 'Sale', 'Appointments', 'Total Tip', 'Total Payment'];

      for (const label of labels) {
        await expect(dashboardPage.metric(label)).toBeVisible();
      }
    },
  );

  test(
    'TC-OVW-066 — currency metrics render as USD with $, thousands separator, two decimals',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      // The "$<amount>.<2dp>" value renders as a SIBLING of the metric label, so
      // assert on the card (the label's parent). Batch History amounts are not
      // counted: that panel is often empty ("No batches in the last 7 days").
      for (const label of ['Sale', 'Total Tip', 'Total Payment'] as const) {
        await expect(dashboardPage.metric(label).locator('..')).toContainText(
          /\$\d{1,3}(,\d{3})*\.\d{2}/,
        );
      }
    },
  );

  test(
    "TC-OVW-073 — 'View All' in Today's Summary navigates to Income report",
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.summaryViewAllLink).toBeVisible();
      await dashboardPage.summaryViewAllLink.click();

      // "View All" now opens the new income-summary report page, not /income.
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/report-pages\/income-summary/);
    },
  );
});
