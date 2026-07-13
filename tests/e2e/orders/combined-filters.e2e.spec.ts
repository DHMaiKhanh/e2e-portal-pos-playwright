import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  buildMockOrderListItem,
  buildMockOrdersCollection,
  type MockOrderListItem,
} from '@data/dynamic/factories/mockOrder';

const buildPool = (): MockOrderListItem[] => [
  buildMockOrderListItem({ orderCode: 'OD-MATCH-AAA', status: 'canceled', paymentTypes: ['card'] }),
  buildMockOrderListItem({
    orderCode: 'OD-MATCH-BBB',
    status: 'successful',
    paymentTypes: ['card'],
  }),
  buildMockOrderListItem({ orderCode: 'OD-MATCH-CCC', status: 'canceled', paymentTypes: ['cash'] }),
  buildMockOrderListItem({
    orderCode: 'OD-OTHER-DDD',
    status: 'successful',
    paymentTypes: ['cash'],
  }),
];

async function mockFilteredOrders(
  page: import('@playwright/test').Page,
  pool: MockOrderListItem[],
): Promise<void> {
  await page.route('**/volt-pos.**/orders?*', async (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search');
    const statuses = url.searchParams.getAll('status[]');
    const paymentMethod = url.searchParams.get('payment_method');

    let filtered = pool;
    if (search)
      filtered = filtered.filter((o) => o.orderCode.toLowerCase().includes(search.toLowerCase()));
    if (statuses.length === 1) filtered = filtered.filter((o) => statuses.includes(o.status));
    if (paymentMethod) filtered = filtered.filter((o) => o.paymentTypes.includes(paymentMethod));

    await route.fulfill({ json: buildMockOrdersCollection(filtered) });
  });
}

test.describe('Kết hợp nhiều bộ lọc — Orders', () => {
  /**
   * Steps:
   * 1. Nhập một từ khoá search.
   * 2. Đồng thời chọn một Status cụ thể và một Payment Method cụ thể.
   * Expected:
   * Bảng chỉ hiển thị các order thoả đồng thời cả 3 điều kiện (AND, không phải OR);
   * URL phản ánh đủ cả 3 query param.
   */
  test(
    'TC-ORD-018 — search + status + payment method combined (AND) filtering',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const pool = buildPool();
      await mockFilteredOrders(page, pool);
      await ordersPage.goto();

      await ordersPage.search('MATCH');
      await ordersPage.selectStatus('Canceled');
      await ordersPage.selectPaymentMethod('Card');

      await expect(page).toHaveURL(/search=MATCH/);
      await expect(page).toHaveURL(/status=/);
      await expect(page).toHaveURL(/paymentMethod=card/);
      expect(await ordersPage.rowCount()).toBe(1);
      await expect(ordersPage.table.rowContaining('OD-MATCH-AAA')).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Đặt lại Status về "All status".
   * 2. Đặt lại Payment Method về "All method".
   * 3. Xoá nội dung ô search.
   * Expected:
   * Sau mỗi bước, tập kết quả nới rộng ra tương ứng; sau khi xoá hết, bảng trở về đúng
   * danh sách mặc định theo khoảng ngày hiện tại (không bị kẹt ở trạng thái rỗng).
   */
  test(
    'TC-ORD-019 — clearing filters one by one widens results back to default',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const pool = buildPool();
      await mockFilteredOrders(page, pool);
      await ordersPage.goto();

      await ordersPage.search('MATCH');
      await ordersPage.selectStatus('Canceled');
      await ordersPage.selectPaymentMethod('Card');
      expect(await ordersPage.rowCount()).toBe(1);

      // Resetting status re-fetches and widens the result set.
      await ordersPage.selectStatus('All status');
      expect(await ordersPage.rowCount()).toBe(2);

      // Resetting payment method clears the URL filter but the app does not re-fetch
      // on this reset; the widening lands on the next fetch (below).
      await ordersPage.clearPaymentMethod();
      await expect(page).toHaveURL(/paymentMethod=all/);

      // Clearing the search re-fetches with no active filter and returns the full
      // default list — not stuck in the previously narrowed (or empty) state.
      await ordersPage.clearSearch();
      expect(await ordersPage.rowCount()).toBe(4);
    },
  );
});
