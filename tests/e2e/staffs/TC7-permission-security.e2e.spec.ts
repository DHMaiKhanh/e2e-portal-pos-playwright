import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect, expectCrossStoreBlocked } from '@helpers/security';

test.describe('Bảo mật & phân quyền (Security) — Staffs (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-STF-080 — Truy cập trực tiếp URL Staffs khi chưa đăng nhập
   * Steps:
   *  1. Xoá session/cookie.
   *  2. Điều hướng trực tiếp tới `/pos/<STORE_ID>/staffs`.
   * Expected:
   *  Bị chuyển hướng về trang đăng nhập trước khi bất kỳ dữ liệu nhân viên nào render.
   */
  test(
    'TC-STF-080 — chưa đăng nhập redirect login',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.STAFFS, [
        page.getByRole('table'),
        page.locator('tbody tr'),
      ]);
    },
  );
});

test.describe('Bảo mật & phân quyền (Security) — Staffs', () => {
  // TODO(manual/setup): requires a separate limited-role test account. The suite holds a
  // single captured admin session (scripts/capture-auth.mjs, Google OAuth) and there is no
  // second role to sign in as. Unblocked by capturing a limited-role storageState.
  /**
   * TC-STF-081 — Tài khoản không có quyền quản lý Staffs
   * Steps:
   *  1. Đăng nhập tài khoản giới hạn, kiểm tra menu sidebar và truy cập URL trực tiếp.
   * Expected:
   *  Mục "Staffs" bị ẩn khỏi sidebar hoặc bị chặn khi truy cập URL trực tiếp
   *  (redirect/thông báo lỗi quyền truy cập).
   */
  test.fixme(
    'TC-STF-081 — tài khoản giới hạn không có quyền Staffs',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-STF-082 — Không rò rỉ dữ liệu nhân viên của store khác
   * Steps:
   *  1. Thử sửa store id trong URL/API request sang store không thuộc quyền.
   * Expected:
   *  Backend trả về lỗi 403/404, không hiển thị dữ liệu nhân viên của store khác.
   */
  test(
    'TC-STF-082 — không rò rỉ dữ liệu store khác',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      await expectCrossStoreBlocked(page, (storeId) => `/pos/${storeId}/staffs`);
      // Not one staff field of the foreign store leaks — no emails, no phone numbers.
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/@[\w.-]+\.\w{2,}/);
      expect(body).not.toMatch(/\(\d{3}\)\s*\d{3}-\d{4}/);
    },
  );
});
