import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bảo mật & phân quyền — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  /**
   * Steps:
   * 1. Xóa cookie/session đăng nhập.
   * 2. Điều hướng trực tiếp tới `/pos/<storeId>/batch`.
   * Expected:
   * Redirect về `/login`; không có dữ liệu batch nào bị lộ trước khi redirect.
   */
  // TODO(manual/setup): requires clearing auth/storageState and re-navigating unauthenticated — cannot run with reused logged-in storageState
  test.fixme(
    'TC-BH-052 — direct access when unauthenticated redirects to login',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      await expect(page).toHaveURL(/\/login/);
    },
  );

  /**
   * Steps:
   * 1. Đăng nhập với role đó.
   * 2. Kiểm tra sidebar có mục "Batch History" không.
   * 3. Thử truy cập trực tiếp URL `/pos/<storeId>/batch`.
   * Expected:
   * Mục menu bị ẩn với role không có quyền, và truy cập trực tiếp URL bị chặn (redirect hoặc 403), không âm thầm hiển thị dữ liệu.
   */
  // TODO(manual/setup): requires a test account/role without Batch History permission — no such role/storageState configured in this project
  test.fixme(
    'TC-BH-053 — menu/screen hidden or blocked for role without Batch History permission',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      const menuItem = dashboardPage.sidebar.item('Batch History');
      await expect(menuItem).toBeHidden();
    },
  );

  /**
   * Steps:
   * 1. Đang đăng nhập cho store 14, điều hướng tới `/pos/<otherStoreId>/batch` của store mà user không có quyền truy cập.
   * Expected:
   * Truy cập bị từ chối/redirect; không có dữ liệu batch của store khác bị lộ.
   */
  // TODO(manual/setup): requires navigating to a different store id the logged-in user has no access to, and verifying no data leaks — needs a known unauthorized storeId fixture
  test.fixme(
    'TC-BH-054 — cross-store access is blocked',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      await expect(page).not.toHaveURL(/\/pos\/\d+\/batch/);
    },
  );

  /**
   * Steps:
   * 1. Kiểm tra URL và lịch sử trình duyệt trong lúc dùng filter.
   * Expected:
   * Chỉ có trạng thái filter (ngày, status, page) xuất hiện trên URL — không có token, thông tin cá nhân (PII), hay tổng tiền thô nào ngoài những gì đã hiển thị công khai trên UI.
   */
  test(
    'TC-BH-055 — no sensitive data leaked via URL/query params',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Open');
      const params = batchHistoryPage.currentQueryParams();

      const allowedKeys = [
        'status',
        'page',
        'from',
        'to',
        'startDate',
        'endDate',
        'date',
        'dateRange',
      ];
      for (const key of params.keys()) {
        expect(
          allowedKeys.some((allowed) => key.toLowerCase().includes(allowed.toLowerCase())),
        ).toBeTruthy();
      }

      const rawQuery = params.toString().toLowerCase();
      expect(rawQuery).not.toMatch(/token|password|ssn|email|phone/);
    },
  );
});
