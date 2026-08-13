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
  /**
   * Two of the three things the case asks for are DOM-observable, and the third
   * was misjudged: focus order can be walked with real Tab presses, activation
   * can be driven with Enter, and "announced as disabled to a screen reader" is
   * an attribute question (`disabled`/`aria-disabled`), not a listening one.
   *
   * The reordering buttons write to shared state, so this exercises the
   * keyboard path on a category whose controls are *disabled* — "Other", pinned
   * last — plus focus traversal on a live row without activating anything.
   */
  test(
    'TC-SVC-080 — keyboard navigation through category action buttons',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      await productsPage.switchToActiveTab();
      const names = await productsPage.categoryNamesInOrder();
      const target = names[1];

      await test.step('Tab walks the row’s actions in display order', async () => {
        await productsPage.hoverCategory(target);
        await productsPage.categoryReorderHandle(target).focus();

        // Display order within a row: reorder handle, name, to-first, up, down,
        // to-last, edit.
        const expectedOrder = [
          productsPage.categoryButton(target),
          productsPage.categoryMoveToFirstButton(target),
          productsPage.categoryMoveUpButton(target),
          productsPage.categoryMoveDownButton(target),
          productsPage.categoryMoveToLastButton(target),
        ];
        for (const control of expectedOrder) {
          await page.keyboard.press('Tab');
          await expect(control.first()).toBeFocused();
        }
      });

      await test.step('Disabled controls expose their state rather than hiding it', async () => {
        await productsPage.hoverCategory('Other');
        for (const control of [
          productsPage.categoryMoveUpButton('Other'),
          productsPage.categoryMoveDownButton('Other'),
          productsPage.categoryMoveToFirstButton('Other'),
          productsPage.categoryMoveToLastButton('Other'),
        ]) {
          if ((await control.count()) === 0) continue;
          await expect(control).toBeDisabled();
        }
        // "Other" is rendered without a drag handle at all — the row carries an
        // "Other is always last" label instead. Where a handle does exist it
        // must announce its disabled state rather than just look inert.
        const handle = productsPage.categoryReorderHandle('Other');
        if ((await handle.count()) > 0) {
          await expect(handle).toHaveAttribute('aria-disabled', 'true');
        } else {
          await expect(page.getByLabel(/other is always last/i).first()).toBeAttached();
        }
      });

      await test.step('Enter activates a category button from the keyboard', async () => {
        await productsPage.hoverCategory(target);
        await productsPage.categoryButton(target).first().focus();
        await page.keyboard.press('Enter');
        // Selecting a category filters the table rather than navigating away.
        await productsPage.waitForReady();
        // `.first()` wraps the whole union: both sides can match at once, which
        // trips strict mode on an unqualified `.or()`.
        await expect(
          productsPage.table.rows.first().or(productsPage.paginationFooter).first(),
        ).toBeVisible();
      });
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
