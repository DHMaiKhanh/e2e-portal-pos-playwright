import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Responsive / Cross-Device" area (lean core).
 *
 * Verified by resizing the viewport within the test (page.setViewportSize) and
 * asserting no horizontal document overflow at the narrow 320px boundary.
 */

/** Horizontal overflow in px (document width beyond the viewport); <= 1 is clean. */
async function horizontalOverflow(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe('Responsive / Cross-Device — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-196 — no horizontal document scroll at the 320px narrow boundary',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ dashboardPage, page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    },
  );
});
