import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Page Load & Layout" area (lean core).
 *
 * Relies on the reused authenticated storageState (global.setup.ts) and the
 * default 1920x1080 desktop viewport from playwright.config. Store-scoped routes
 * are asserted by regex (/\/pos\/\d+\/overview/) — never a hardcoded store id.
 */
test.describe('Page Load & Layout — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-001 — lands on the store-scoped /pos/<id>/overview route',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      // URL is the store Overview with no bounce to /login.
      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
      await expect(page).not.toHaveURL(/\/login/);
      // Sidebar "Overview" entry proves the authenticated app shell rendered.
      await expect(dashboardPage.heading).toBeVisible();
    },
  );

  test(
    'TC-OVW-002 — redirects authenticated root / to the store Overview',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // Redirected to the store Overview — not left on / and not sent to /login.
      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(dashboardPage.heading).toBeVisible();
    },
  );

  test(
    'TC-OVW-003 — renders all four Overview sections on load',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.batchHistorySection).toBeVisible();
    },
  );

  test(
    "TC-OVW-004 — Today's Summary renders metric labels incl. Total Payment with values",
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      // Metric labels are present (exact-text; "Sale" won't match "Gross Sale").
      await expect(dashboardPage.metric('Total Payment')).toBeVisible();
      await expect(dashboardPage.metric('Total Order')).toBeVisible();
      await expect(dashboardPage.metric('Gross Sale')).toBeVisible();
      // At least one currency value is rendered (format, not a fixed amount).
      await expect(page.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible();
      // No metric shows a literal "undefined" placeholder value.
      await expect(page.getByText(/\bundefined\b/i)).toHaveCount(0);
    },
  );

  test(
    'TC-OVW-011 — no horizontal page scroll at the default viewport',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      // All four sections rendered before measuring layout.
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.batchHistorySection).toBeVisible();

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        innerWidth: window.innerWidth,
      }));
      // Body does not scroll horizontally (1px tolerance for sub-pixel rounding).
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
    },
  );
});
