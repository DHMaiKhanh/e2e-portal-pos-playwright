import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Critical-path smoke checks — fast, run on every push.
 * Relies on the logged-in session from global.setup.ts.
 */
test.describe(`Smoke ${Tag.SMOKE}`, () => {
  test('dashboard loads', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('orders page loads', async ({ ordersPage }) => {
    await ordersPage.goto();
    await expect(ordersPage.searchInput).toBeVisible();
  });

  test('products page loads', async ({ productsPage }) => {
    await productsPage.goto();
    await expect(productsPage.searchInput).toBeVisible();
  });
});
