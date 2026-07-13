import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { faker } from '@data/dynamic/factories/faker';
import {
  buildMockOrderListItem,
  buildMockOrdersCollection,
  buildMockOrderDetail,
} from '@data/dynamic/factories/mockOrder';

test.describe('Điều hướng sang Order Detail — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-028 — click row navigates full-page to order detail (not modal)',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ ordersPage, page }) => {
      const rowCount = await ordersPage.rowCount();
      test.skip(rowCount === 0, 'No order rows available to click.');

      await ordersPage.table.rows.first().click();

      await expect(page).toHaveURL(/\/pos\/\d+\/orders\/[0-9a-fA-F-]{36}$/);
      await expect(ordersPage.orderDetailHeading).toBeVisible();
      await expect(ordersPage.orderDetailHeading).toHaveText(/Order #/);
    },
  );

  /**
   * Steps:
   * 1. Click link "Back to orders" trong sidebar/breadcrumb.
   * Expected:
   * Quay lại `/pos/<storeId>/orders`. (Cần xác minh trực tiếp: liệu bộ lọc/trang trước đó có được
   * khôi phục hay bị reset về mặc định — hành vi chưa được xác nhận trong lần khám phá này.)
   */
  // Confirmed by exploration: the "Back to orders" link is a static href to the list
  // route, so the app re-applies the default query — the previously applied filter is
  // reset (not preserved) on return.
  test(
    'TC-ORD-029 — "Back to orders" đưa về danh sách (bộ lọc reset về mặc định)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const id = faker.string.uuid();
      const order = buildMockOrderListItem({
        id,
        orderCode: 'OD-DETAIL-0001',
        status: 'canceled',
        settled: false,
      });

      await page.route('**/volt-pos.**/orders?*', async (route) => {
        await route.fulfill({ json: buildMockOrdersCollection([order]) });
      });
      await page.route(`**/volt-pos.**/orders/${id}`, async (route) => {
        await route.fulfill({
          json: buildMockOrderDetail({
            id,
            orderCode: order.orderCode,
            status: 'canceled',
            settled: false,
          }),
        });
      });

      await ordersPage.goto();
      await ordersPage.selectStatus('Canceled');
      await expect(page).toHaveURL(/status=canceled/);

      await ordersPage.openOrder(order.orderCode);
      await expect(ordersPage.backToOrdersLink).toBeVisible();

      await ordersPage.backToOrdersLink.click();

      await expect(page).toHaveURL(/\/pos\/\d+\/orders\?/);
      await expect(page).toHaveURL(/status=all/);
    },
  );
});
