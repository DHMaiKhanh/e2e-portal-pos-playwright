import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Filter — khoảng ngày — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-010 — default date range is last 7 days',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.waitForReady();

      await expect(batchHistoryPage.dateRangeButton).toBeVisible();

      const params = batchHistoryPage.currentQueryParams();
      const dateAfter = params.get('dateAfter');
      const dateBefore = params.get('dateBefore');

      if (dateAfter && dateBefore) {
        const after = new Date(dateAfter);
        const before = new Date(dateBefore);
        const diffDays = Math.round((before.getTime() - after.getTime()) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBeGreaterThanOrEqual(6);
        expect(diffDays).toBeLessThanOrEqual(7);
      }
    },
  );

  /**
   * Steps:
   * 1. Mở date range picker.
   * 2. Chọn khoảng rộng hơn bao trùm các batch lịch sử đã biết (vd 2020-01-01 đến hôm nay).
   * 3. Áp dụng.
   * Expected: Bảng nạp lại tất cả batch trong khoảng đã chọn; query param `dateAfter`/`dateBefore`
   * cập nhật đúng; số lượng kết quả ở footer cập nhật theo.
   */
  // TODO(manual/setup): requires interacting with calendar day cells inside the date range
  // picker which are not exposed as stable Page Object locators; needs live verification.
  test.fixme(
    'TC-BH-011 — selecting new date range filters table and updates URL',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.openDateRangePicker();
    },
  );

  test(
    'TC-BH-012 — date range with no matching batches shows empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.gotoWithParams({
        page: '1',
        status: 'all',
        dateAfter: '1999-01-01',
        dateBefore: '1999-01-02',
      });
      await batchHistoryPage.waitForReady();

      await expect(batchHistoryPage.emptyState).toBeVisible();
      await expect(batchHistoryPage.emptyState).toContainText(/No batches found\./i);

      const summary = await batchHistoryPage.paginationSummaryText();
      expect(summary).toMatch(/Showing 0 to 0 of 0 results/i);

      await expect(batchHistoryPage.previousPageButton).toBeDisabled();
      await expect(batchHistoryPage.nextPageButton).toBeDisabled();

      const indicator = await batchHistoryPage.pageIndicatorText();
      expect(indicator).toMatch(/1\s*\/\s*1/);
    },
  );

  /**
   * Steps:
   * 1. Mở date picker.
   * 2. Thử chọn ngày kết thúc sớm hơn ngày bắt đầu đã chọn.
   * Expected: Picker ngăn lựa chọn không hợp lệ (disable các ngày trước đó) hoặc tự động hoán đổi
   * khoảng; không bị crash, không có trạng thái `dateAfter > dateBefore` được gửi lên URL/API.
   */
  // TODO(manual/setup): requires interacting with individual calendar day cells to attempt an
  // invalid end-before-start selection; no stable locator exposed by the Page Object for this.
  test.fixme(
    'TC-BH-013 — selecting end date before start date is blocked or auto-corrected',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.openDateRangePicker();
    },
  );

  test(
    'TC-BH-014 — single-day range (start = end) is valid',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      const today = new Date().toISOString().slice(0, 10);

      await batchHistoryPage.gotoWithParams({
        page: '1',
        status: 'all',
        dateAfter: today,
        dateBefore: today,
      });
      await batchHistoryPage.waitForReady();

      const params = batchHistoryPage.currentQueryParams();
      expect(params.get('dateAfter')).toBe(today);
      expect(params.get('dateBefore')).toBe(today);

      const hasEmptyState = await batchHistoryPage.emptyState.isVisible().catch(() => false);
      if (hasEmptyState) {
        await expect(batchHistoryPage.emptyState).toContainText(/No batches found\./i);
      } else {
        await expect(batchHistoryPage.tableRoot).toBeVisible();
      }
    },
  );

  test(
    'TC-BH-015 — deep-linked date range query params apply filter on load',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.gotoWithParams({
        page: '1',
        status: 'all',
        dateAfter: '2026-01-01',
        dateBefore: '2026-07-15',
      });
      await batchHistoryPage.waitForReady();

      const params = batchHistoryPage.currentQueryParams();
      expect(params.get('dateAfter')).toBe('2026-01-01');
      expect(params.get('dateBefore')).toBe('2026-07-15');

      await expect(batchHistoryPage.dateRangeButton).toBeVisible();

      await expect(batchHistoryPage.tableRoot).toBeVisible();
    },
  );
});
