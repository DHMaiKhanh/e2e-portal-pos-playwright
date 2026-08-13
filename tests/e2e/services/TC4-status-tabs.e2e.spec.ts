import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tab trạng thái Active / Inactive — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  test(
    'TC-SVC-030 — chuyển sang tab Inactive lọc đúng dữ liệu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.switchToInactiveTab();
      await expect(productsPage.inactiveTab).toHaveAttribute('aria-selected', 'true');
    },
  );

  /**
   * Steps:
   * 1. Nhập từ khóa tìm kiếm.
   * 2. Chuyển sang tab "Inactive".
   * Expected:
   * Từ khóa tìm kiếm vẫn được áp dụng (hoặc được reset — cần xác minh hành vi thực tế),
   * kết quả hiển thị đúng theo tab Inactive + từ khóa.
   */
  /**
   * Verified live: the keyword persists across a tab switch. The URL keeps
   * `name=<term>` and gains `categoryStatus=inactive`, and the box still holds
   * the term — so the two filters compose rather than one clearing the other.
   */
  test(
    'TC-SVC-031 — chuyển tab khi đang có từ khóa tìm kiếm',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      await productsPage.search('test');
      await expect(page).toHaveURL(/name=test/);

      await productsPage.switchToInactiveTab();
      await productsPage.waitForReady();

      await expect(page).toHaveURL(/name=test/);
      await expect(page).toHaveURL(/categoryStatus=inactive/);
      await expect(productsPage.searchInput).toHaveValue('test');
      await expect(productsPage.inactiveTab).toHaveAttribute('data-state', 'active');

      // Results reflect both filters at once: every row matches the term, and
      // the tab is the Inactive one.
      const rows = productsPage.table.rows;
      const count = await rows.count();
      if (count > 0) {
        for (const rowText of await rows.allInnerTexts()) {
          expect(rowText.toLowerCase()).toContain('test');
        }
      } else {
        await expect(productsPage.paginationFooter.first()).toContainText(/of 0 results/i);
      }
    },
  );

  test(
    'TC-SVC-032 — tab Active là tab mặc định khi tải trang',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ productsPage }) => {
      await expect(productsPage.activeTab).toHaveAttribute('aria-selected', 'true');
    },
  );
});
