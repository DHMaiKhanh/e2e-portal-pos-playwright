import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  buildMockOrderListItem,
  buildMockOrdersCollection,
  ORDERS_PAGE_SIZE,
} from '@data/dynamic/factories/mockOrder';

const PAGE_SIZE = ORDERS_PAGE_SIZE;

test.describe('Phân trang — Orders', () => {
  /**
   * TC-ORD-025 — Previous/Next bị disabled khi chỉ có 1 trang
   * Preconditions: Tổng số kết quả ≤ số dòng/trang (quan sát trực tiếp: 10 kết quả → 1 trang).
   * Steps:
   * 1. Quan sát trạng thái nút Previous và Next, cùng chỉ số trang (vd. "1 / 1").
   * Expected:
   * Cả hai nút đều ở trạng thái disabled; text "Showing 1 to N of N results" khớp tổng số dòng hiển thị.
   */
  test(
    'TC-ORD-025 — Previous/Next disabled khi chỉ có 1 trang',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const orders = Array.from({ length: 3 }, () => buildMockOrderListItem());
      await page.route('**/volt-pos.**/orders?*', async (route) => {
        await route.fulfill({ json: buildMockOrdersCollection(orders) });
      });

      await ordersPage.goto();

      await expect(ordersPage.previousPageButton).toBeDisabled();
      await expect(ordersPage.nextPageButton).toBeDisabled();
      await expect(ordersPage.paginationSummary).toHaveText(/showing 1 to 3 of 3 results/i);
    },
  );

  /**
   * TC-ORD-026 — Next chuyển sang trang kế tiếp khi có nhiều hơn 1 trang
   * Preconditions: Tổng số order trong khoảng ngày lọc vượt quá số dòng/trang (vd. chọn "Last 30 Days" để có nhiều dữ liệu hơn).
   * Steps:
   * 1. Ghi lại OD ID dòng đầu tiên của trang 1.
   * 2. Click "Next".
   * Expected:
   * Trang chuyển sang trang 2, danh sách OD ID khác hoàn toàn với trang 1, chỉ số trang cập nhật (vd. "2 / N"), query `page` trên URL tăng lên.
   */
  test(
    'TC-ORD-026 — Next chuyển sang trang kế tiếp khi có nhiều hơn 1 trang',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const page1Orders = Array.from({ length: PAGE_SIZE }, () => buildMockOrderListItem());
      const page2Orders = Array.from({ length: 5 }, () => buildMockOrderListItem());
      const totalItems = page1Orders.length + page2Orders.length;

      await page.route('**/volt-pos.**/orders?*', async (route) => {
        const url = new URL(route.request().url());
        const requestedPage = url.searchParams.get('page') ?? '1';
        const member = requestedPage === '2' ? page2Orders : page1Orders;
        await route.fulfill({ json: buildMockOrdersCollection(member, totalItems) });
      });

      await ordersPage.goto();
      await expect(ordersPage.table.rowContaining(page1Orders[0].orderCode)).toBeVisible();

      await ordersPage.goToNextPage();

      await expect(page).toHaveURL(/page=2/);
      await expect(ordersPage.table.rowContaining(page2Orders[0].orderCode)).toBeVisible();
      for (const order of page1Orders) {
        await expect(ordersPage.table.rowContaining(order.orderCode)).toHaveCount(0);
      }
    },
  );

  /**
   * TC-ORD-027 — Previous quay lại đúng trang trước với dữ liệu nhất quán
   * Preconditions: Đang ở trang 2 trở lên (tiếp nối TC-ORD-026).
   * Steps:
   * 1. Click "Previous".
   * Expected:
   * Trang quay lại trang trước đó với đúng danh sách order đã thấy trước khi bấm Next (không bị xáo trộn thứ tự do sort không ổn định).
   */
  test(
    'TC-ORD-027 — Previous quay lại đúng trang trước với dữ liệu nhất quán',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const page1Orders = Array.from({ length: PAGE_SIZE }, () => buildMockOrderListItem());
      const page2Orders = Array.from({ length: 5 }, () => buildMockOrderListItem());
      const totalItems = page1Orders.length + page2Orders.length;

      await page.route('**/volt-pos.**/orders?*', async (route) => {
        const url = new URL(route.request().url());
        const requestedPage = url.searchParams.get('page') ?? '1';
        const member = requestedPage === '2' ? page2Orders : page1Orders;
        await route.fulfill({ json: buildMockOrdersCollection(member, totalItems) });
      });

      await ordersPage.goto();
      await ordersPage.goToNextPage();
      await expect(page).toHaveURL(/page=2/);
      await expect(ordersPage.table.rowContaining(page2Orders[0].orderCode)).toBeVisible();

      await ordersPage.goToPreviousPage();

      await expect(page).toHaveURL(/page=1/);
      for (const order of page1Orders) {
        await expect(ordersPage.table.rowContaining(order.orderCode)).toBeVisible();
      }
    },
  );
});
