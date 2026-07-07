import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { buildOrders, buildProducts } from '@data/dynamic/factories';
import type { Paginated } from '@api/models/Common';
import type { Order } from '@api/models/Order';

/**
 * Drives the Orders UI against a mocked API response built from factories.
 * Useful for deterministic UI assertions without depending on seeded backend data.
 */
test.describe(`Orders — mocked list ${Tag.REGRESSION} ${Tag.UI}`, () => {
  test('renders exactly the mocked orders', async ({ page, ordersPage }) => {
    const products = buildProducts(5);
    const orders = buildOrders(3, { products });

    const body: Paginated<Order> = {
      data: orders,
      page: 1,
      pageSize: 20,
      total: orders.length,
    };

    await page.route('**/api/orders**', async (route) => {
      await route.fulfill({ json: body });
    });

    await ordersPage.goto();

    for (const order of orders) {
      await expect(ordersPage.table.rowContaining(order.orderNumber)).toBeVisible();
    }
  });
});
