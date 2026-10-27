import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect, UNAUTHORISED_STORE_ID } from '@helpers/security';

/**
 * Signed-out half of the suite. `test.use` here opts this describe out of the
 * shared authenticated context (the fixture builds a throwaway one instead), so
 * it must live outside the describe below, whose beforeEach signs in.
 */
test.describe('Bảo mật & phân quyền — Batch History (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Steps:
   * 1. Xóa cookie/session đăng nhập.
   * 2. Điều hướng trực tiếp tới `/pos/<storeId>/batch`.
   * Expected:
   * Redirect về `/login`; không có dữ liệu batch nào bị lộ trước khi redirect.
   */
  test(
    'TC-BH-052 — direct access when unauthenticated redirects to login',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.BATCH_HISTORY, [
        page.getByRole('table'),
        page.getByRole('columnheader', { name: /batch number/i }),
      ]);
    },
  );
});

test.describe('Bảo mật & phân quyền — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  /**
   * Steps:
   * 1. Đang đăng nhập cho store 14, điều hướng tới `/pos/<otherStoreId>/batch` của store mà user không có quyền truy cập.
   * Expected:
   * Truy cập bị từ chối/redirect; không có dữ liệu batch của store khác bị lộ.
   */
  test(
    'TC-BH-054 — cross-store access is blocked',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      // The shared expectCrossStoreBlocked() still looks for the pre-redesign copy
      // "This merchant is not available."; since 2026-10-13 the blocked screen
      // reads "We couldn't load this merchant" + a "Your merchants" switcher.
      await page.goto(`/pos/nail/${UNAUTHORISED_STORE_ID}/batch`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(
        page.getByText(/couldn't load this merchant|this merchant is not available/i),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('region', { name: /your merchants/i })).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(0);
      // No ledger column headers either — the screen is not merely empty, it is absent.
      await expect(page.getByRole('columnheader', { name: /batch number/i })).toHaveCount(0);
    },
  );

  /**
   * Steps:
   * 1. Kiểm tra URL và lịch sử trình duyệt trong lúc dùng filter.
   * Expected:
   * Chỉ có trạng thái filter (ngày, status, page) xuất hiện trên URL — không có token, thông tin cá nhân (PII), hay tổng tiền thô nào ngoài những gì đã hiển thị công khai trên UI.
   */
  test(
    'TC-BH-055 — no sensitive data leaked via URL/query params',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Open');
      const params = batchHistoryPage.currentQueryParams();

      const allowedKeys = [
        'status',
        'page',
        'from',
        'to',
        'startDate',
        'endDate',
        'date',
        'dateRange',
      ];
      for (const key of params.keys()) {
        expect(
          allowedKeys.some((allowed) => key.toLowerCase().includes(allowed.toLowerCase())),
        ).toBeTruthy();
      }

      const rawQuery = params.toString().toLowerCase();
      expect(rawQuery).not.toMatch(/token|password|ssn|email|phone/);
    },
  );
});
