import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Today's Summary (Metric Cards)" area (lean core).
 *
 * The five metric tiles (Total Order, Sale, Appointments, Total Tip, Total
 * Payment). Values are store- and time-scoped, so assertions match FORMAT
 * (currency /\$[\d,]+\.\d{2}/) — never the live amounts.
 */
test.describe("Today's Summary (Metric Cards) — Overview", () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-064 — renders all five metric cards with the expected labels',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      await expect(dashboardPage.metric('Total Order')).toBeVisible();
      await expect(dashboardPage.metric('Sale')).toBeVisible();
      await expect(dashboardPage.metric('Appointments')).toBeVisible();
      await expect(dashboardPage.metric('Total Tip')).toBeVisible();
      await expect(dashboardPage.metric('Total Payment')).toBeVisible();
    },
  );

  test(
    'TC-OVW-066 — currency metrics render as USD with $ and two decimals',
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
    "TC-OVW-073 — Today's Summary 'View All' navigates to the Income report",
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await dashboardPage.summaryViewAllLink.click();
      // "View All" now opens the new income-summary report page, not /income.
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/report-pages\/income-summary/);
      await expect(page).not.toHaveURL(/\/login/);
    },
  );
});
