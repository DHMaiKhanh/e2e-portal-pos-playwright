import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect, expectCrossStoreBlocked } from '@helpers/security';

test.describe('Bảo mật & Phân quyền (Security) — Services (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Steps:
   * 1. Điều hướng trực tiếp tới `/pos/<STORE_ID>/services`.
   * Expected:
   * Bị chuyển hướng về trang đăng nhập, không hiển thị bất kỳ dữ liệu dịch vụ nào.
   */
  test(
    'TC-SVC-070 — unauthenticated user redirected to login on direct access',
    { tag: [Tag.REGRESSION] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.PRODUCTS, [
        page.getByRole('table'),
        page.getByRole('button', { name: /add service/i }),
        page.getByRole('button', { name: /add category/i }),
      ]);
    },
  );
});

test.describe('Bảo mật & Phân quyền (Security) — Services', () => {
  /**
   * Steps:
   * 1. Điều hướng trực tiếp tới `/pos/<STORE_ID_KHAC>/services` với store ID không thuộc quyền
   *    quản lý của tài khoản.
   * Expected:
   * Truy cập bị chặn (redirect/lỗi 403/không tải được dữ liệu), không rò rỉ dữ liệu dịch vụ của
   * store khác.
   */
  test(
    'TC-SVC-071 — cross-store Services route access is blocked',
    { tag: [Tag.REGRESSION] },
    async ({ page }) => {
      await expectCrossStoreBlocked(page, (storeId) => `/pos/${storeId}/services`);
      // Management affordances must not render for a merchant the account cannot see.
      await expect(page.getByRole('button', { name: /add service/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /add category/i })).toHaveCount(0);
    },
  );

  // TODO(manual/setup): requires a restricted-role account (e.g. Staff without service
  // management permission). The suite has exactly one captured session, an admin one
  // (scripts/capture-auth.mjs, Google OAuth), so there is no second role to sign in as.
  // Unblocked by capturing a second storageState for a limited-role account.
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
    async ({ productsPage }) => {
      void productsPage;
    },
  );
});
