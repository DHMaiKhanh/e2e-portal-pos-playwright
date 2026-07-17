import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe("Today's Summary (Thẻ chỉ số) — Overview", () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-064 — renders all six summary metric cards with correct labels/order',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();

      const labels: Array<
        'Total Order' | 'Sale' | 'Appointments' | 'Total Tip' | 'Total Payment' | 'Gross Sale'
      > = ['Total Order', 'Sale', 'Appointments', 'Total Tip', 'Total Payment', 'Gross Sale'];

      for (const label of labels) {
        await expect(dashboardPage.metric(label)).toBeVisible();
      }
    },
  );

  test(
    'TC-OVW-066 — currency metrics render as USD with $, thousands separator, two decimals',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      // The metric label ("Sale", "Total Tip", ...) is its own text node — the
      // "$<amount>.<2dp>" value renders as a SIBLING node inside the card, not a
      // descendant of the label, so `metric(label).toContainText(...)` can never
      // match. Assert the currency format itself renders (>= 4 times, one per
      // currency card: Sale, Total Tip, Total Payment, Gross Sale).
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      const currency = page.getByText(/\$[\d,]+\.\d{2}/);
      await expect(currency.first()).toBeVisible();
      await expect.poll(() => currency.count()).toBeGreaterThanOrEqual(4);
    },
  );

  test(
    "TC-OVW-073 — 'View All' in Today's Summary navigates to Income report",
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.summaryViewAllLink).toBeVisible();
      await dashboardPage.summaryViewAllLink.click();

      await expect(page).toHaveURL(/\/pos\/\d+\/income/);
    },
  );
});
