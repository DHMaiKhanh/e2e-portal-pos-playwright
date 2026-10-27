import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Page Load & Layout".
 *
 * Relies on the reused authenticated storageState and the default desktop
 * viewport. Store-scoped routes are asserted by regex — never a hardcoded id.
 * Since the 2026-10-13 redesign the Overview is: header (h1 merchant name +
 * status pill + "Today: n orders · $x") and three cards (Merchant information,
 * Device summary, Batch history).
 */
test.describe('Page Load & Layout — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-001 — lands on the store-scoped /pos/<id>/overview route',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/overview/);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(dashboardPage.heading).toBeVisible();
      await expect(dashboardPage.sidebar.item('Overview')).toHaveAttribute('aria-current', 'page');
    },
  );

  // BEHAVIOUR CHANGE (2026-08-12): authenticated `/` renders the Fastboy Portal
  // app chooser instead of redirecting into the store. The invariant still worth
  // guarding is that an authenticated user is not bounced to /login.
  test(
    'TC-OVW-002 — redirects authenticated root / to the store Overview',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByText(/choose where you'?d like to start/i)).toBeVisible();
      // The chooser leads back into POS.
      await expect(page.getByRole('link', { name: /^POS Nail Spa/ })).toHaveAttribute(
        'href',
        '/pos',
      );
    },
  );

  test(
    'TC-OVW-003 — renders all Overview sections on load',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todayMeta).toBeVisible();
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.batchHistorySection).toBeVisible();
    },
  );

  test(
    "TC-OVW-004 — Today's summary renders today's orders and sales with values",
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.todayMeta).toContainText(/^Today:/);
      await expect(dashboardPage.todayOrders).toHaveText(/^\d[\d,]* orders?$/);
      await expect(dashboardPage.todaySales).toHaveText(/^\$\d{1,3}(,\d{3})*\.\d{2}$/);
      // No metric shows a literal "undefined"/"NaN" placeholder value.
      await expect(page.locator('#pos-main').getByText(/\b(undefined|NaN)\b/)).toHaveCount(0);
    },
  );

  test(
    'TC-OVW-011 — no horizontal page scroll at the default viewport',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.batchHistorySection).toBeVisible();

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);

      // The three cards do not overlap each other.
      const boxes = await Promise.all(
        [
          dashboardPage.merchantInfoSection,
          dashboardPage.deviceSummarySection,
          dashboardPage.batchHistorySection,
        ].map((card) => card.boundingBox()),
      );
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!;
          const b = boxes[j]!;
          const overlap =
            a.x < b.x + b.width - 1 &&
            b.x < a.x + a.width - 1 &&
            a.y < b.y + b.height - 1 &&
            b.y < a.y + a.height - 1;
          expect(overlap, `cards ${i} and ${j} overlap`).toBe(false);
        }
      }
    },
  );
});
