import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Critical-path smoke checks — fast, run on every push.
 * Relies on the logged-in session from global.setup.ts.
 *
 * Smoke only proves each screen boots for a signed-in user, so it gates on the
 * page `h1` (present on every screen since the 2026-10-13 redesign) rather than
 * on screen-specific controls owned by the per-screen page objects.
 */
test.describe(`Smoke ${Tag.SMOKE}`, () => {
  test('dashboard loads', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.merchantInfoSection).toBeVisible();
  });

  test('orders page loads', async ({ ordersPage }) => {
    await ordersPage.goto();
    await expect(ordersPage.searchInput).toBeVisible();
  });

  test('products page loads', async ({ page }) => {
    await page.goto(Urls.PRODUCTS, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1, name: 'Services' })).toBeVisible({
      timeout: Timeouts.NAVIGATION,
    });
    await expect(page.getByRole('button', { name: /^add service$/i })).toBeVisible();
  });
});
