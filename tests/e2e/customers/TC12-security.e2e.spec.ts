import { test } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bảo mật & phân quyền (Security/permissions) — Customers', () => {
  /**
   * TC-CUS-074 — Chuyển hướng người dùng chưa đăng nhập từ /pos/<id>/customers về /login.
   */
  // TODO(manual/setup): requires clearing session/cookies and reloading without the
  // reused storageState (fixture-provided auth), which this project's fixture setup
  // does not support.
  test.fixme(
    'TC-CUS-074 — unauthenticated access redirects to /login',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-CUS-075 — Phiên hết hạn giữa chừng chuyển hướng về /login khi thao tác tiếp theo.
   */
  // TODO(manual/setup): requires server-side session invalidation not available via
  // this project's fixture/tooling.
  test.fixme(
    'TC-CUS-075 — mid-session expiry redirects to /login on next action',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-CUS-076 — Chặn truy cập dữ liệu khách hàng khi đổi store id sang store không có quyền.
   */
  // TODO(manual/setup): requires a second store id the current account does not have
  // permission on, not available in the current fixture setup.
  test.fixme(
    'TC-CUS-076 — switching to an unauthorized store id blocks customer data access',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-CUS-077 — Chuyển store qua store switcher chỉ giới hạn dữ liệu Customers của store đang chọn.
   */
  // TODO(manual/setup): requires a second store the current account has legitimate
  // access to via the store switcher, not available in the current fixture setup.
  test.fixme(
    'TC-CUS-077 — switching stores via the store switcher scopes customer data to the new store',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
