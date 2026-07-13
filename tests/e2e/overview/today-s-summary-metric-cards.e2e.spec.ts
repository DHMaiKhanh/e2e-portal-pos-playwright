import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Today's Summary (Metric Cards)" area (lean core).
 *
 * The six metric tiles (Total Order, Sale, Appointments, Total Tip, Total
 * Payment, Gross Sale). Values are store- and time-scoped, so assertions match
 * FORMAT (currency /\$[\d,]+\.\d{2}/) — never the live amounts.
 */
test.describe("Today's Summary (Metric Cards) — Overview", () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-064 — renders all six metric cards with the expected labels',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      await expect(dashboardPage.metric('Total Order')).toBeVisible();
      await expect(dashboardPage.metric('Sale')).toBeVisible();
      await expect(dashboardPage.metric('Appointments')).toBeVisible();
      await expect(dashboardPage.metric('Total Tip')).toBeVisible();
      await expect(dashboardPage.metric('Total Payment')).toBeVisible();
      await expect(dashboardPage.metric('Gross Sale')).toBeVisible();
    },
  );

  test(
    'TC-OVW-066 — currency metrics render as USD with $ and two decimals',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      // The four currency cards (Sale, Total Tip, Total Payment, Gross Sale) each
      // render "$<amount>.<2dp>". Wait for the values to load (count() does not
      // auto-wait), then assert the format appears for >= 4 values.
      const currency = page.getByText(/\$[\d,]+\.\d{2}/);
      await expect(currency.first()).toBeVisible();
      await expect.poll(() => currency.count()).toBeGreaterThanOrEqual(4);
    },
  );

  test(
    "TC-OVW-073 — Today's Summary 'View All' navigates to the Income report",
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await dashboardPage.summaryViewAllLink.click();
      await expect(page).toHaveURL(/\/pos\/\d+\/income/);
      await expect(page).not.toHaveURL(/\/login/);
    },
  );
});
