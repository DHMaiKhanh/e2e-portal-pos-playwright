import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Khả năng tiếp cận (Accessibility) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  /**
   * TC-SVC-080 — Điều hướng bằng bàn phím qua các nút hành động của category
   * Steps:
   * 1. Dùng Tab/Shift+Tab để di chuyển focus qua các nút `Move ... up/down/to first/to last` và `Edit ...` của một category; dùng Enter/Space để kích hoạt.
   * Expected:
   * Thứ tự focus hợp lý (theo thứ tự hiển thị); mọi nút có thể kích hoạt bằng bàn phím; trạng thái disabled được bỏ qua focus hoặc thông báo rõ là disabled cho trình đọc màn hình.
   */
  // TODO(manual/setup): Requires manual keyboard focus-order verification (Tab/Shift+Tab traversal and screen-reader disabled-state announcement) — not reliably assertable via static DOM checks.
  test.fixme(
    'TC-SVC-080 — keyboard navigation through category action buttons',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.waitForReady();
    },
  );

  /**
   * TC-SVC-081 — Bảng dữ liệu có ngữ nghĩa HTML/ARIA đúng cho table
   * Steps:
   * 1. Kiểm tra cấu trúc DOM/ARIA của bảng "All Services" bằng công cụ accessibility inspector.
   * Expected:
   * Bảng dùng đúng role table/row/cell/columnheader; mỗi cột có tên (accessible name) khớp với header hiển thị.
   */
  test(
    'TC-SVC-081 — table has correct HTML/ARIA semantics',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await expect(productsPage.tableHeading).toBeVisible();
      const table = productsPage.tableHeading;
      await expect(table).toHaveRole('table');
      const columnHeaders = productsPage.columnHeaders;
      const count = await columnHeaders.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const header = columnHeaders.nth(i);
        await expect(header).toHaveRole('columnheader');
        const name = (await header.textContent())?.trim();
        expect(name).toBeTruthy();
      }
      const rows = table.getByRole('row');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    },
  );
});
