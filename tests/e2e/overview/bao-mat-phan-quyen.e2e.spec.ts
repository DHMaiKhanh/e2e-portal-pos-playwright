import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect } from '@helpers/security';

/**
 * NOTE: overview/security-permissions.e2e.spec.ts carries the same TC-OVW-235
 * case, implemented against a hand-built context. This is the generated
 * counterpart from docs/test-cases/overview.md; it asserts the fuller list of
 * Overview affordances the .md calls out. Worth collapsing the two into one.
 */
test.describe('Bảo mật & Phân quyền — Overview (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

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
  test(
    'TC-OVW-235 — chuyển hướng user chưa đăng nhập từ deep link Overview về /login',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.DASHBOARD, [
        page.getByRole('button', { name: /generate token/i }),
        page.getByText(/total payment/i),
        page.getByRole('link', { name: /^Overview$/i }),
        page.getByRole('button', { name: /open pos #\d+ details/i }),
      ]);

      // The signed-out landing page is the login screen, not a stripped Overview.
      await expect(page.getByText(/sign in/i).first()).toBeVisible();
    },
  );
});
