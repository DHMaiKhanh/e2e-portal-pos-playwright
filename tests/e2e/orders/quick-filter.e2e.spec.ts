import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  buildMockOrderListItem,
  buildMockOrdersCollection,
} from '@data/dynamic/factories/mockOrder';

test.describe('Bộ lọc Quick Filter — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-007 — Danh sách option của Quick filter',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      await ordersPage.quickFilterCombobox.click();
      await expect(page.getByRole('option', { name: 'Today', exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Yesterday', exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Last 7 Days', exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Last 30 Days', exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Custom', exact: true })).toHaveCount(0);
    },
  );

  /**
   * Steps:
   * 1. Chọn "Last 7 Days" trong Quick filter.
   * Expected:
   * Query `dateAfter`/`dateBefore` trên URL cập nhật để phủ 7 ngày gần nhất;
   * nút hiển thị ngày cập nhật theo khoảng mới; bảng nạp lại dữ liệu trong
   * khoảng 7 ngày đó.
   */
  test(
    'TC-ORD-008 — Chọn "Last 7 Days" cập nhật cả bảng và nút ngày',
    { tag: [Tag.REGRESSION] },
    async ({ ordersPage, page }) => {
      const orders = [buildMockOrderListItem(), buildMockOrderListItem()];
      await page.route('**/volt-pos.**/orders?*', async (route) => {
        await route.fulfill({ json: buildMockOrdersCollection(orders) });
      });
      await ordersPage.goto();

      const dateRangeButtonTextBefore = await ordersPage.dateRangeButton.textContent();

      await ordersPage.selectQuickFilter('Last 7 Days');

      const url = new URL(page.url());
      const dateAfter = url.searchParams.get('dateAfter');
      const dateBefore = url.searchParams.get('dateBefore');
      expect(dateAfter).toBeTruthy();
      expect(dateBefore).toBeTruthy();
      const spanDays = Math.round(
        (new Date(dateBefore as string).getTime() - new Date(dateAfter as string).getTime()) /
          86_400_000,
      );
      expect(spanDays).toBeGreaterThanOrEqual(6);
      expect(spanDays).toBeLessThanOrEqual(7);

      await expect(ordersPage.dateRangeButton).not.toHaveText(dateRangeButtonTextBefore ?? '');

      for (const order of orders) {
        await expect(ordersPage.table.rowContaining(order.orderCode)).toBeVisible();
      }
    },
  );
});
