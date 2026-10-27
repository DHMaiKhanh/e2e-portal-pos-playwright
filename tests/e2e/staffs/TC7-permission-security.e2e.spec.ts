import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect, UNAUTHORISED_STORE_ID } from '@helpers/security';

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
      // Inline instead of expectCrossStoreBlocked(): the helper builds no
      // /nail/ segment for us and still expects the pre-refactor copy "This
      // merchant is not available." — since 2026-10-13 the blocked state reads
      // "We couldn't load this merchant" plus a "Your merchants" switcher.
      await page.goto(`/pos/nail/${UNAUTHORISED_STORE_ID}/staffs`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await expect(
        page.getByText(/this merchant is not available|couldn't load this merchant/i),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('region', { name: 'Your merchants' })).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(0);
      // Not one staff field of the foreign store leaks — no emails, no phone numbers.
      // The nav column (`aside "Sidebar"`) shows the signed-in user's own email
      // since the 2026-10-13 refactor, so read everything except it.
      let body = await page.locator('body').innerText();
      for (const aside of await page.locator('aside').allInnerTexts()) {
        body = body.replace(aside, '');
      }
      for (const own of await page
        .getByRole('button', { name: /open user menu/i })
        .allInnerTexts()) {
        for (const line of own.split('\n')) body = body.split(line.trim()).join('');
      }
      expect(body).not.toMatch(/@[\w.-]+\.\w{2,}/);
      expect(body).not.toMatch(/\(\d{3}\)\s*\d{3}-\d{4}/);
    },
  );
});
