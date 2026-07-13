import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { faker } from '@data/dynamic/factories/faker';

/**
 * Drives the Orders UI against a mocked API response shaped like the real
 * (JSON-LD/Hydra) `/orders` endpoint. Useful for deterministic UI assertions
 * without depending on seeded backend data.
 */
test.describe(`Orders — mocked list ${Tag.REGRESSION} ${Tag.UI}`, () => {
  test('renders exactly the mocked orders', async ({ page, ordersPage }) => {
    const orders = Array.from({ length: 3 }, () => ({
      id: faker.string.uuid(),
      orderCode: `OD${faker.string.numeric({ length: 6 })}-${faker.string.numeric({ length: 6 })}`,
      remoteOrderId: faker.string.numeric({ length: 4 }),
      total: faker.number.int({ min: 1000, max: 50000 }),
      customerName: faker.person.firstName(),
      customerPhone: faker.string.numeric({ length: 10 }),
      status: 'successful',
      settled: true,
      customer: null,
      completedAt: faker.date.recent({ days: 1 }).toISOString(),
      createdAt: faker.date.recent({ days: 1 }).toISOString(),
      updatedAt: faker.date.recent({ days: 1 }).toISOString(),
      cardInfos: [],
      paymentTypes: ['cash'],
      staffs: [faker.person.firstName()],
    }));

    const body = {
      '@context': '/contexts/Order',
      '@id': '/orders',
      '@type': 'Collection',
      totalItems: orders.length,
      member: orders,
    };

    await page.route('**/volt-pos.**/orders?*', async (route) => {
      await route.fulfill({ json: body });
    });

    await ordersPage.goto();

    for (const order of orders) {
      await expect(ordersPage.table.rowContaining(order.orderCode)).toBeVisible();
    }
  });
});
