import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  buildMockOrderListItem,
  buildMockOrdersCollection,
} from '@data/dynamic/factories/mockOrder';

test.describe('Bộ lọc Date Picker (tuỳ chỉnh) — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-009 — mở Date Picker hiển thị lịch chọn ngày',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      await expect(ordersPage.dateRangeButton).toBeVisible();
      await ordersPage.openDatePicker();

      await expect(page.getByRole('dialog')).toHaveCount(1);
      await expect(ordersPage.datePickerDialog).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Chọn ngày bắt đầu và ngày kết thúc khác với mặc định.
   * 2. Xác nhận/áp dụng.
   * Expected:
   * `dateAfter`/`dateBefore` trên URL cập nhật đúng khoảng đã chọn, Quick filter combobox
   * không còn phản ánh "Today" (hoặc reset về trạng thái tương ứng), bảng chỉ hiển thị order
   * trong khoảng ngày đó.
   */
  test(
    'TC-ORD-010 — chọn khoảng ngày tuỳ chỉnh cập nhật bảng',
    { tag: [Tag.REGRESSION] },
    async ({ ordersPage, page }) => {
      const orders = [buildMockOrderListItem(), buildMockOrderListItem()];
      await page.route('**/volt-pos.**/orders?*', async (route) => {
        await route.fulfill({ json: buildMockOrdersCollection(orders) });
      });
      await ordersPage.goto();

      // Pick the 2nd → 6th of the currently shown month as a custom range.
      await ordersPage.pickCustomDateRange(2, 6);

      const url = new URL(page.url());
      expect(url.searchParams.get('dateAfter')).toMatch(/-02$/);
      expect(url.searchParams.get('dateBefore')).toMatch(/-06$/);
      // Quick filter no longer reflects the default "Today" once a custom range is set.
      await expect(ordersPage.quickFilterCombobox).not.toContainText(/today/i);

      for (const order of orders) {
        await expect(ordersPage.table.rowContaining(order.orderCode)).toBeVisible();
      }
    },
  );
});
