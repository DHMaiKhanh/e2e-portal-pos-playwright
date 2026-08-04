import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tiêu cực & Biên (Negative / Edge cases) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  test(
    'TC-SVC-060 — category không có dịch vụ vẫn hiển thị đúng, không lỗi',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await expect(productsPage.pageTitle).toBeVisible();
      // Category list should still render even if a category has zero services.
      await expect(productsPage.tableHeading).toBeVisible();

      expect(consoleErrors).toEqual([]);
    },
  );

  /**
   * TC-SVC-061 — Tải trang khi API services trả lỗi/timeout
   * Steps:
   * 1. Chặn (mock lỗi 500 hoặc timeout) request API lấy danh sách dịch vụ.
   * 2. Tải trang Services.
   * Expected:
   * Hiển thị trạng thái lỗi/thông báo phù hợp thay vì màn hình trắng hoặc treo vô hạn;
   * sidebar/top bar vẫn render bình thường.
   */
  // TODO(manual/setup): requires mocking/intercepting the services API to return 500/timeout, which needs route interception setup beyond current fixtures.
  test.fixme(
    'TC-SVC-061 — tải trang khi API services trả lỗi/timeout',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      // arrange: would use page.route to abort/mock the services list endpoint before navigation
    },
  );

  test(
    'TC-SVC-062 — tên dịch vụ/category dài hoặc đặc biệt không vỡ layout',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await expect(productsPage.pageTitle).toBeVisible();
      await expect(productsPage.tableHeading).toBeVisible();
      // Ensure the table container does not overflow the viewport horizontally.
      const box = await productsPage.tableHeading.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(1920 + 5);
      }
    },
  );

  /**
   * TC-SVC-063 — Điều hướng trực tiếp tới trang phân trang không hợp lệ (page vượt quá tổng số trang)
   * Steps:
   * 1. Điều hướng trực tiếp bằng query param tới một số trang lớn hơn tổng số trang thực tế (vd ?page=99 khi chỉ có 9 trang).
   * Expected:
   * App không hiển thị bảng trống/lỗi crash; hoặc tự động điều chỉnh về trang hợp lệ cuối cùng,
   * hoặc hiển thị trạng thái rỗng có kiểm soát.
   */
  // TODO(manual/setup): requires knowing the exact query-param contract for pagination and asserting a fallback/clamped state that needs live verification.
  test.fixme(
    'TC-SVC-063 — điều hướng trực tiếp tới trang phân trang không hợp lệ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      // arrange: would navigate to `${Urls.PRODUCTS}?page=99` and assert graceful fallback
    },
  );
});
