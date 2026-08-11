import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bảo mật & phân quyền (Security) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
  });

  /**
   * TC-STF-080 — Truy cập trực tiếp URL Staffs khi chưa đăng nhập
   * Steps:
   *  1. Xoá session/cookie.
   *  2. Điều hướng trực tiếp tới `/pos/<STORE_ID>/staffs`.
   * Expected:
   *  Bị chuyển hướng về trang đăng nhập trước khi bất kỳ dữ liệu nhân viên nào render.
   */
  // TODO(manual/setup): requires clearing session/cookies and reloading without the reused
  // storageState (fixture-provided auth), which this project's fixture setup does not support.
  test.fixme(
    'TC-STF-080 — chưa đăng nhập redirect login',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-STF-081 — Tài khoản không có quyền quản lý Staffs
   * Steps:
   *  1. Đăng nhập tài khoản giới hạn, kiểm tra menu sidebar và truy cập URL trực tiếp.
   * Expected:
   *  Mục "Staffs" bị ẩn khỏi sidebar hoặc bị chặn khi truy cập URL trực tiếp
   *  (redirect/thông báo lỗi quyền truy cập).
   */
  // TODO(manual/setup): requires a separate limited-role test account/storageState not
  // available in the current fixture setup.
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
  // TODO(manual/setup): requires a second store id the current account does not have
  // permission on and backend response/API assertion tooling not set up here.
  test.fixme(
    'TC-STF-082 — không rò rỉ dữ liệu store khác',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
