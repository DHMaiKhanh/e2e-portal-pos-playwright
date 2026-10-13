import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { MerchantColumn } from '@pages/merchants/MerchantsPage';

/**
 * URL-state facts confirmed on the DEV Portal, 2026-08-18:
 *
 *  - `?tab=overview` is a real normalisation applied to the bare route, and an
 *    unknown `tab` value is rewritten back to it;
 *  - the list itself has no tab strip — `tab` belongs to the per-merchant detail
 *    view that shares this route;
 *  - the toolbar state lives in `q=` and `status=`, both restorable from a cold
 *    deep link;
 *  - unknown params survive untouched (`foo=bar` is kept), while a malformed
 *    known param (`page=abc`) is dropped rather than passed through.
 */
test.describe('Tham số URL & trạng thái (URL state) — Merchants', () => {
  /**
   * TC-MCH-080 — `tab=overview` là giá trị mặc định
   * Steps:
   *  1. Vào `/pos/merchants?tab=overview` trực tiếp.
   *  2. So sánh nội dung với khi vào `/pos/merchants`.
   * Expected:
   *  Hai đường dẫn cho nội dung giống nhau (`overview` là mặc định).
   *
   * [CẦN XÁC MINH] resolved: no other `tab` value is supported on the list, and
   * there is no visible tab bar here — so "same content" is asserted directly and
   * the absence of a tab strip is pinned.
   *
   * Behaviour changed since 2026-08-18: an explicit `?tab=overview` is now
   * *preserved* on the URL rather than normalised away (verified live 2026-10-10;
   * the bare route itself stays bare — TC-MCH-002). "Same list" therefore means
   * identical rows, not an identical URL — the deep link keeps its query.
   */
  test(
    'TC-MCH-080 — explicit ?tab=overview and the bare route render the same list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.goto();
      await merchantsPage.waitForReady();
      const bareRouteIds = await merchantsPage.columnValues(MerchantColumn.WHMCS_ID);

      await merchantsPage.gotoWithQuery({ tab: 'overview' });
      await merchantsPage.waitForReady();

      await expect(page).toHaveURL(/\/pos\/nail\/admin\/merchant\?tab=overview$/);
      expect(await merchantsPage.columnValues(MerchantColumn.WHMCS_ID)).toEqual(bareRouteIds);
      await expect(page.getByRole('tab')).toHaveCount(0);
    },
  );

  /**
   * TC-MCH-081 — Giá trị `tab` không hợp lệ
   * Steps:
   *  1. Mở `/pos/merchants?tab=khong-ton-tai`.
   *  2. Quan sát.
   * Expected:
   *  App fallback êm về nội dung mặc định (hoặc chuẩn hoá URL về `tab=overview`);
   *  không trang trắng, không crash, không lỗi console.
   *
   * Behaviour changed since 2026-08-18: an unknown `tab` value is now stripped
   * back to the bare route rather than rewritten to `?tab=overview` (verified live
   * 2026-10-10 — only a *known* `?tab=overview` is preserved, see TC-MCH-080).
   * The graceful-fallback intent is unchanged: list renders, no blank page, no
   * console/page errors.
   */
  test(
    'TC-MCH-081 — an unknown tab value is stripped back to the bare route without errors',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' && !/status of 401/.test(message.text())) {
          consoleErrors.push(message.text());
        }
      });

      await merchantsPage.gotoWithQuery({ tab: 'khong-ton-tai' });
      await merchantsPage.waitForReady();

      await expect(page).toHaveURL(/\/pos\/nail\/admin\/merchant$/);
      await expect(merchantsPage.pageTitle).toBeVisible();
      expect(await merchantsPage.table.rows.count()).toBeGreaterThan(0);
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    },
  );

  /**
   * TC-MCH-082 — Deep-link kèm nhiều tham số cùng lúc
   * Steps:
   *  1. Mở URL kèm đồng thời tab + search + status.
   *  2. Quan sát thanh công cụ và bảng.
   * Expected:
   *  Cả ô tìm kiếm và combobox trạng thái hiển thị đúng giá trị từ URL, và bảng đã
   *  được lọc tương ứng ngay từ lần render đầu.
   *
   * The search param is `q` — a `search=` deep link is silently ignored (the
   * input stays empty), which is worth knowing if these tests are ever copied
   * from the Staffs specs.
   */
  test(
    'TC-MCH-082 — a tab + q + status deep link restores both controls and the filtered table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.gotoWithQuery({ tab: 'overview', q: 'Bleu', status: 'active' });
      await merchantsPage.waitForReady();

      await expect(merchantsPage.searchInput).toHaveValue('Bleu');
      await expect(merchantsPage.statusFilter).toHaveText(/^Active$/);
      await expect(page).toHaveURL(/q=Bleu/);
      await expect(page).toHaveURL(/status=active/);

      const rows = await merchantsPage.table.rows.allTextContents();
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.toLowerCase()).toContain('bleu');
      }
      for (const status of await merchantsPage.columnValues(MerchantColumn.STATUS)) {
        expect(status).toMatch(/^Active$/i);
      }
    },
  );

  /**
   * TC-MCH-083 — Tham số không được nhận diện bị bỏ qua an toàn
   * Steps:
   *  1. Mở `/pos/merchants?tab=overview&foo=bar&page=abc`.
   *  2. Quan sát.
   * Expected:
   *  Trang tải bình thường với dữ liệu mặc định; param lạ hoặc sai kiểu
   *  (`page=abc`) không gây lỗi, không gây request 500.
   */
  test(
    'TC-MCH-083 — unknown and malformed params are ignored safely',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const serverErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on('response', (response) => {
        if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await merchantsPage.gotoWithQuery({ tab: 'overview', foo: 'bar', page: 'abc' });
      await merchantsPage.waitForReady();

      // Default data, unfiltered.
      await expect(merchantsPage.searchInput).toHaveValue('');
      await expect(merchantsPage.statusFilter).toHaveText(/all statuses/i);
      expect(await merchantsPage.table.rows.count()).toBeGreaterThan(0);
      await expect(merchantsPage.resultsFooter).toHaveText(/showing 1 to \d+ of \d+ results/i);

      // The unrecognised param is harmless; the malformed page value is discarded.
      await expect(page).not.toHaveURL(/page=abc/);
      expect(serverErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    },
  );
});
