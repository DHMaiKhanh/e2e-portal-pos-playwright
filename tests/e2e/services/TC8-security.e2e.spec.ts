import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bảo mật & Phân quyền (Security) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  // TODO(manual/setup): requires clearing cookies/storage state to simulate an unauthenticated
  // session; cannot be done safely within the shared authenticated fixture context.
  /**
   * Steps:
   * 1. Điều hướng trực tiếp tới `/pos/<STORE_ID>/services`.
   * Expected:
   * Bị chuyển hướng về trang đăng nhập, không hiển thị bất kỳ dữ liệu dịch vụ nào.
   */
  test.fixme(
    'TC-SVC-070 — unauthenticated user redirected to login on direct access',
    { tag: [Tag.REGRESSION] },
    async ({ page }) => {},
  );

  // TODO(manual/setup): requires a store ID outside the current account's permission scope,
  // which needs test-data/account setup not available in this suite.
  /**
   * Steps:
   * 1. Điều hướng trực tiếp tới `/pos/<STORE_ID_KHAC>/services` với store ID không thuộc quyền
   *    quản lý của tài khoản.
   * Expected:
   * Truy cập bị chặn (redirect/lỗi 403/không tải được dữ liệu), không rò rỉ dữ liệu dịch vụ của
   * store khác.
   */
  test.fixme(
    'TC-SVC-071 — cross-store Services route access is blocked',
    { tag: [Tag.REGRESSION] },
    async ({ page }) => {},
  );

  // TODO(manual/setup): requires a restricted-role account (e.g. Staff without service
  // management permission) to verify hidden/disabled controls; needs live permission verification.
  /**
   * Steps:
   * 1. Đăng nhập bằng tài khoản đó, vào trang Services.
   * Expected:
   * Các nút "Add Category", "Edit <category>", "Add Service", "Manage Order", các nút
   * reorder/move bị ẩn hoặc disable — cần xác minh trực tiếp với tài khoản phân quyền thực tế.
   */
  test.fixme(
    'TC-SVC-072 — restricted role cannot see/use service management controls',
    { tag: [Tag.REGRESSION] },
    async ({ productsPage }) => {},
  );
});
