import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Today's Summary".
 *
 * Since the 2026-10-13 redesign the five metric tiles (Total Order / Sale /
 * Appointments / Total Tip / Total Payment) were replaced by one header meta
 * line: "Today: <n> orders · $<amount>" plus a "View report" link. The cases
 * keep their ids and assert that line. Values are store- and time-scoped, so
 * only FORMAT is asserted.
 */
test.describe("Today's Summary — Overview", () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    "TC-OVW-064 — renders today's order count and sales in the header",
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todayMeta).toBeVisible();
      await expect(dashboardPage.todayMeta).toContainText(/^Today:\s*\d[\d,]* orders? · \$/);
      await expect(dashboardPage.todayOrders).toBeVisible();
      await expect(dashboardPage.todaySales).toBeVisible();
    },
  );

  test(
    'TC-OVW-066 — currency metric renders as USD with $, thousands separator, two decimals',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todaySales).toHaveText(/^\$\d{1,3}(,\d{3})*\.\d{2}$/);
    },
  );

  test(
    "TC-OVW-073 — Today's Summary 'View report' navigates to the Income report",
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.summaryViewAllLink).toBeVisible();
      await dashboardPage.summaryViewAllLink.click();
      // Reports migrated to V4: the link now targets /v4/reports/income-summary
      // (legacy /report-pages/income-summary kept for back-compat).
      await expect(page).toHaveURL(
        /\/pos\/nail\/\d+\/(?:v4\/reports|report-pages)\/income-summary/,
      );
      await expect(page).not.toHaveURL(/\/login/);
    },
  );
});
