import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect, UNAUTHORISED_STORE_ID } from '@helpers/security';

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
      // Inline instead of expectCrossStoreBlocked(): the helper builds no
      // /nail/ segment for us and still expects the pre-refactor copy "This
      // merchant is not available." — since 2026-10-13 the blocked state reads
      // "We couldn't load this merchant" plus a "Your merchants" switcher.
      await page.goto(`/pos/nail/${UNAUTHORISED_STORE_ID}/services`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await expect(
        page.getByText(/this merchant is not available|couldn't load this merchant/i),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('region', { name: 'Your merchants' })).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(0);
      // Management affordances must not render for a merchant the account cannot see.
      await expect(page.getByRole('button', { name: /add service/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /add category/i })).toHaveCount(0);
    },
  );
});
