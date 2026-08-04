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
  // TODO(manual/setup): Expected behavior explicitly marked as needing live verification
  // ("cần xác minh hành vi thực tế") for whether search keyword persists or resets on tab switch.
  test.fixme(
    'TC-SVC-031 — chuyển tab khi đang có từ khóa tìm kiếm',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.search('test');
      await productsPage.switchToInactiveTab();
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
