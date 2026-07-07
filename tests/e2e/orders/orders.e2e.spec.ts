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

  test('filters orders by status', async ({ ordersPage }) => {
    await ordersPage.filterByStatus('Paid');
    // Replace with a concrete assertion once the status column selector is known.
    await expect(ordersPage.table.rows.first()).toBeVisible();
  });

  test('searches for an order', async ({ ordersPage }) => {
    await ordersPage.search('OD');
    await expect(ordersPage.searchInput).toHaveValue('OD');
  });
});
