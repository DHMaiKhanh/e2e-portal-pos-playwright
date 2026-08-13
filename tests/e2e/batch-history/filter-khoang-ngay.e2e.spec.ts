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
  /**
   * Day cells now have stable locators (BatchHistoryPage.dayCell), keyed off the
   * calendar's accessible names rather than the bare day number — matching on
   * the number alone would also hit the adjacent month's greyed-out days that
   * share the grid.
   */
  test(
    'TC-BH-011 — selecting new date range filters table and updates URL',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      // Anchor on the all-time total rather than on the default 7-day window,
      // which is routinely empty on this store — "0 results before, 0 after"
      // would let a broken filter pass.
      await batchHistoryPage.gotoAllTime();
      const allTimeTotal = Number(
        (await batchHistoryPage.paginationSummaryText()).match(/of (\d+) results/i)?.[1],
      );
      expect(allTimeTotal).toBeGreaterThan(0);

      // Back to the default view before opening the picker: the calendar opens
      // on the currently selected range's month, so opening it from the
      // all-time view starts the user in January 2020 and "4 months back" lands
      // in 2019 instead of in the recent months that hold data.
      await batchHistoryPage.goto();
      await batchHistoryPage.openDateRangePicker();

      // Both clicks must land in the same month view: navigating months between
      // them restarts the range instead of closing it.
      await batchHistoryPage.goBackMonths(4);
      const caption = (await batchHistoryPage.calendarCaption.innerText()).trim();
      const [monthName, yearText] = caption.split(' ');
      const month = new Date(`${monthName} 1, ${yearText}`).getMonth();
      const year = Number(yearText);
      const iso = (day: number) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      await batchHistoryPage.dayCell(new Date(year, month, 1)).click();
      await batchHistoryPage.dayCell(new Date(year, month, 28)).click();
      await batchHistoryPage.waitForReady();

      await test.step('URL carries the chosen range', async () => {
        const params = batchHistoryPage.currentQueryParams();
        expect(params.get('dateAfter')).toBe(iso(1));
        expect(params.get('dateBefore')).toBe(iso(28));
      });

      await test.step('The table reloads narrowed to that range', async () => {
        // The summary is repainted by the response, not by the click, so poll
        // rather than reading it the instant the URL changes.
        await expect
          .poll(async () => {
            const summary = await batchHistoryPage.paginationSummaryText();
            return Number(summary.match(/of (\d+) results/i)?.[1] ?? NaN);
          })
          .toBeLessThan(allTimeTotal);

        await expect(batchHistoryPage.paginationSummary).toHaveText(
          /showing \d+ to \d+ of \d+ results/i,
        );
        await expect(
          batchHistoryPage.table.rows.first().or(batchHistoryPage.emptyState),
        ).toBeVisible();
      });
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
  /**
   * The case allows either resolution — the picker refuses the earlier date, or
   * it swaps the range. Both are asserted through the same invariant, so this
   * does not have to guess which one the component implements: whatever reaches
   * the URL must never have dateAfter later than dateBefore.
   */
  test(
    'TC-BH-013 — selecting end date before start date is blocked or auto-corrected',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await batchHistoryPage.waitForReady();
      await batchHistoryPage.openDateRangePicker();
      await batchHistoryPage.goBackMonths(1);

      const caption = (await batchHistoryPage.calendarCaption.innerText()).trim();
      const [monthName, yearText] = caption.split(' ');
      const month = new Date(`${monthName} 1, ${yearText}`).getMonth();
      const year = Number(yearText);

      // Pick the 20th first, then try to close the range on the 5th.
      await batchHistoryPage.dayCell(new Date(year, month, 20)).click();
      await batchHistoryPage.dayCell(new Date(year, month, 5)).click();
      await page.waitForTimeout(1500);
      await batchHistoryPage.waitForReady();

      const params = batchHistoryPage.currentQueryParams();
      const after = params.get('dateAfter');
      const before = params.get('dateBefore');

      if (after && before) {
        expect(
          new Date(after).getTime(),
          `inverted range reached the URL: dateAfter=${after} dateBefore=${before}`,
        ).toBeLessThanOrEqual(new Date(before).getTime());
      }

      // Whichever branch the picker took, the screen must still be usable.
      await expect(
        batchHistoryPage.table.rows.first().or(batchHistoryPage.emptyState),
      ).toBeVisible();
      expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
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
