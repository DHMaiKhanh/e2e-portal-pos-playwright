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
      await ordersPage.ensureRowsPresent();

      await ordersPage.table.rows.first().click();

      await expect(page).toHaveURL(/\/pos\/\d+\/orders\/[0-9a-fA-F-]{36}$/);
      await expect(ordersPage.orderDetailHeading).toBeVisible();
      // The heading is "#<order code>" with the status badge rendered inside the
      // same element, e.g. "#OD260812-11892794Successful - Unsettled". It used to
      // read "Order #<code>", hence the anchored "starts with #" match.
      await expect(ordersPage.orderDetailHeading).toHaveText(/^#\S+/);
    },
  );

  /**
   * Steps:
   * 1. Click link "Back to orders" trong sidebar/breadcrumb.
   * Expected:
   * Quay lại `/pos/<storeId>/orders`. (Cần xác minh trực tiếp: liệu bộ lọc/trang trước đó có được
   * khôi phục hay bị reset về mặc định — hành vi chưa được xác nhận trong lần khám phá này.)
   */
  // BEHAVIOUR CHANGE (re-verified 2026-08-12): "Back to orders" now returns to the
  // list with the previously applied filter STILL APPLIED — the URL comes back as
  // `status=canceled`, not `status=all`. The earlier exploration recorded the
  // opposite (a static href that reset the query to defaults), so this is a real
  // change in the app, not a flaky read. Worth confirming it was intended; the
  // preserved filter is the friendlier behaviour, so this test now locks it in.
  // NOTE: the case title still says "bộ lọc reset về mặc định" — docs/test-cases
  // needs the same correction.
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
      // The app writes the status verbatim ("status=Canceled"), so this match has
      // to be case-insensitive like the equivalent assertions in the sibling specs.
      await expect(page).toHaveURL(/status=canceled/i);

      await ordersPage.openOrder(order.orderCode);
      await expect(ordersPage.backToOrdersLink).toBeVisible();

      await ordersPage.backToOrdersLink.click();

      await expect(page).toHaveURL(/\/pos\/\d+\/orders\?/);
      await expect(page).toHaveURL(/status=canceled/i);
    },
  );
});
