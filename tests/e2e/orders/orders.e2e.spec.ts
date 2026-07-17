import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

// Uses the shared logged-in session from global.setup.ts.
test.describe(`Orders — list & filter ${Tag.REGRESSION} ${Tag.UI}`, () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test('renders the orders table', async ({ ordersPage }) => {
    expect(await ordersPage.rowCount()).toBeGreaterThan(0);
  });

  test('filters orders by status', async ({ ordersPage, page }) => {
    await ordersPage.filterByStatus('Successful - Settled');
    await expect(page).toHaveURL(/[?&]status=/i);

    const rowCount = await ordersPage.rowCount();
    if (rowCount > 0) {
      await expect(ordersPage.table.rows.first()).toBeVisible();
    } else {
      await expect(ordersPage.emptyStateMessage).toBeVisible();
    }
  });

  test('searches for an order', async ({ ordersPage }) => {
    await ordersPage.search('OD');
    await expect(ordersPage.searchInput).toHaveValue('OD');
  });
});
