import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bảo mật & Phân quyền — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  /**
   * TC-OVW-235 — Chuyển hướng user chưa đăng nhập từ deep link Overview về /login
   * Steps:
   *   1. Mở một browser context mới hoàn toàn không có dữ liệu session.
   *   2. Điều hướng trực tiếp tới deep link Overview /pos/14/overview.
   *   3. Quan sát URL đã resolve và nội dung được render.
   * Expected:
   *   App ngay lập tức chuyển hướng tới /login và không render nội dung Overview nào —
   *   mục sidebar 'Overview', các thẻ POS ('Open POS #1 details'), số liệu 'Total Payment',
   *   encryption key, và control 'Generate Token' không bao giờ được hiển thị. Không có dữ
   *   liệu store nào được fetch hoặc lóe lên trước khi chuyển hướng.
   */
  // TODO(manual/setup): requires a fresh browser context with no storageState (unauthenticated),
  // which is outside the shared authenticated `dashboardPage`/`page` fixtures used by this suite.
  test.fixme(
    'TC-OVW-235 — chuyển hướng user chưa đăng nhập từ deep link Overview về /login',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      expect(true).toBe(true);
    },
  );
});
