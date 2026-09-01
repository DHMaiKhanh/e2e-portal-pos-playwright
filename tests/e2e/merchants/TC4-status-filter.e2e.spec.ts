import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { MERCHANT_STATUS_OPTIONS, MerchantColumn } from '@pages/merchants/MerchantsPage';

/**
 * Status-filter facts confirmed on the DEV Portal, 2026-08-18:
 *
 *  - the trigger is a `button[role="combobox"][aria-label="Filter by status"]`
 *    whose text is the current value; it offers exactly three options —
 *    "All statuses", "Active", "Inactive";
 *  - the choice IS written to the URL: `status=active` / `status=inactive`, and
 *    resetting writes `status=all` (not a removed param);
 *  - a `?status=active` deep link restores the combobox, so the filter survives
 *    a reload;
 *  - while the listbox is open Radix marks the rest of the page `aria-hidden`,
 *    so the trigger cannot be re-queried by role until it closes — read the
 *    selected value through `statusFilterValue()` in that window.
 */
test.describe('Lọc theo trạng thái (Status filter) — Merchants', () => {
  test.beforeEach(async ({ merchantsPage }) => {
    await merchantsPage.goto();
    await merchantsPage.waitForReady();
  });

  /**
   * TC-MCH-030 — Mở dropdown trạng thái và liệt kê option
   * Steps:
   *  1. Click combobox "All statuses".
   *  2. Đọc toàn bộ option.
   * Expected:
   *  Dropdown mở ra, hiển thị "All statuses" cùng các trạng thái merchant hợp lệ.
   *
   * [CẦN XÁC MINH] resolved 2026-08-18: the option list is exactly
   * ["All statuses", "Active", "Inactive"], so the hard assertion the case asked
   * for is now safe to write.
   */
  test(
    'TC-MCH-030 — the status dropdown offers exactly All statuses / Active / Inactive',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.openStatusFilter();

      await expect(merchantsPage.statusOptions).toHaveCount(MERCHANT_STATUS_OPTIONS.length);
      await expect(merchantsPage.statusOptions).toHaveText([...MERCHANT_STATUS_OPTIONS]);

      await page.keyboard.press('Escape');
      await expect(merchantsPage.statusOptions).toHaveCount(0);
    },
  );

  /**
   * TC-MCH-031 — Lọc theo trạng thái Active
   * Steps:
   *  1. Chọn option trạng thái `Active`.
   *  2. Chờ bảng cập nhật.
   * Expected:
   *  Mọi dòng trong bảng có badge STATUS = Active; combobox hiển thị giá trị vừa chọn.
   */
  test(
    'TC-MCH-031 — filtering by Active leaves only Active rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.selectStatus(/^Active$/);

      await expect(page).toHaveURL(/status=active/);
      await expect(merchantsPage.statusFilter).toHaveText(/^Active$/);

      const statuses = await merchantsPage.columnValues(MerchantColumn.STATUS);
      expect(statuses.length).toBeGreaterThan(0);
      for (const status of statuses) {
        expect(status).toMatch(/^Active$/i);
      }
    },
  );

  /**
   * TC-MCH-032 — Lọc theo trạng thái không phải Active
   * Steps:
   *  1. Chọn một trạng thái khác `Active` (vd `Inactive`).
   *  2. Chờ cập nhật.
   * Expected:
   *  Bảng chỉ chứa dòng có đúng trạng thái đó; nếu không có dữ liệu thì hiển thị
   *  empty state đúng chứ không phải danh sách cũ.
   *
   * Both branches are asserted because which one runs depends on DEV data: every
   * merchant was Active on 2026-08-18, so the empty-state branch is the one
   * exercised today, but the test must not start lying the moment someone
   * deactivates a merchant.
   */
  test(
    'TC-MCH-032 — filtering by Inactive shows only Inactive rows, or a proper empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.selectStatus(/^Inactive$/);

      await expect(page).toHaveURL(/status=inactive/);
      await expect(merchantsPage.statusFilter).toHaveText(/^Inactive$/);

      const statuses = await merchantsPage.columnValues(MerchantColumn.STATUS);
      if (statuses.length > 0) {
        for (const status of statuses) {
          expect(status).toMatch(/^Inactive$/i);
        }
      } else {
        // Not the previous, stale list — an explicit empty state.
        await expect(merchantsPage.emptyState).toBeVisible();
        await expect(merchantsPage.emptyState).toHaveText(/no merchants found\./i);
        await expect(merchantsPage.resultsFooter).toHaveText(/showing 0 to 0 of 0 results/i);
      }
    },
  );

  /**
   * TC-MCH-033 — Kết hợp tìm kiếm và lọc trạng thái
   * Steps:
   *  1. Tìm keyword khớp nhiều dòng.
   *  2. Áp thêm filter trạng thái `Active`.
   *  3. Quan sát.
   * Expected:
   *  Hai điều kiện được áp đồng thời (AND): mọi dòng vừa khớp keyword vừa đúng
   *  trạng thái; đổi filter không xoá keyword và ngược lại.
   */
  test(
    'TC-MCH-033 — keyword and status apply together as AND, neither clearing the other',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.search('a');
      const keywordOnly = await merchantsPage.columnValues(MerchantColumn.MERCHANT);
      expect(keywordOnly.length).toBeGreaterThan(0);

      await merchantsPage.selectStatus(/^Active$/);

      // Both conditions live in the URL at once.
      await expect(page).toHaveURL(/q=a/);
      await expect(page).toHaveURL(/status=active/);
      // Applying the filter did not wipe the keyword out of the input.
      await expect(merchantsPage.searchInput).toHaveValue('a');
      await expect(merchantsPage.statusFilter).toHaveText(/^Active$/);

      // AND is proven two ways: every remaining row satisfies the status half,
      // and the result set is a subset of the keyword-only set (so the keyword
      // half is still being applied). Which column carried the keyword match is
      // deliberately not asserted — that is the backend's business.
      const names = await merchantsPage.columnValues(MerchantColumn.MERCHANT);
      for (const status of await merchantsPage.columnValues(MerchantColumn.STATUS)) {
        expect(status).toMatch(/^Active$/i);
      }
      expect(names.length).toBeLessThanOrEqual(keywordOnly.length);
      for (const name of names) {
        expect(keywordOnly).toContain(name);
      }
    },
  );

  /**
   * TC-MCH-034 — Reset filter về "All statuses"
   * Steps:
   *  1. Chọn một trạng thái cụ thể.
   *  2. Chọn lại "All statuses".
   * Expected:
   *  Bảng trở về tập dữ liệu đầy đủ như ban đầu; không còn dòng nào bị lọc bỏ.
   */
  test(
    'TC-MCH-034 — resetting to All statuses restores the full list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const totalBefore = await merchantsPage.totalResults();

      await merchantsPage.selectStatus(/^Inactive$/);
      await expect(page).toHaveURL(/status=inactive/);

      await merchantsPage.selectStatus(/^All statuses$/);

      // Reset writes `status=all` rather than dropping the param.
      await expect(page).toHaveURL(/status=all/);
      await expect(merchantsPage.statusFilter).toHaveText(/all statuses/i);
      expect(await merchantsPage.totalResults()).toBe(totalBefore);
    },
  );

  /**
   * TC-MCH-035 — Trạng thái filter được ghi vào URL
   * Steps:
   *  1. Chọn trạng thái `Active`.
   *  2. Đọc URL.
   *  3. Reload trang.
   * Expected:
   *  Nếu có param (vd `status=active`), sau reload filter phải được giữ.
   *
   * [CẦN XÁC MINH] resolved 2026-08-18: the param exists and survives a reload,
   * so the case takes its positive branch — no "limitation" note needed.
   */
  test(
    'TC-MCH-035 — the status filter is written to the URL and survives a reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.selectStatus(/^Active$/);
      await expect(page).toHaveURL(/status=active/);
      const urlWithFilter = page.url();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await merchantsPage.waitForReady();

      await expect(page).toHaveURL(urlWithFilter);
      await expect(merchantsPage.statusFilter).toHaveText(/^Active$/);
      for (const status of await merchantsPage.columnValues(MerchantColumn.STATUS)) {
        expect(status).toMatch(/^Active$/i);
      }
    },
  );
});
