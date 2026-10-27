import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parse the date-range trigger label into [start, end] (local midnight).
 * Formats seen live: "Oct 13 – 20, 2026", "Aug 1 – Sep 5, 2026",
 * "Jan 1, 2020 – Oct 20, 2026", "Aug 18, 2026".
 */
const parseRangeLabel = (label: string): [Date, Date] => {
  const [left, right = left] = label.split(/\s+[–-]\s+/).map((part) => part.trim());
  const year = right.match(/\d{4}$/)?.[0] ?? '';
  const end = new Date(/^[A-Z]/.test(right) ? right : `${left.split(' ')[0]} ${right}`);
  const start = new Date(/\d{4}$/.test(left) ? left : `${left}, ${year}`);
  return [start, end];
};

const iso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

test.describe('Filter — khoảng ngày — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-010 — default date range is last 7 days',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.dateRangeButton).toBeVisible();

      // The default window is not written to the URL; read it off the trigger.
      const label = (await batchHistoryPage.dateRangeButton.innerText()).trim();
      const [start, end] = parseRangeLabel(label);
      expect(Number.isNaN(start.getTime()), `unparseable range label "${label}"`).toBe(false);

      const spanDays = Math.round((end.getTime() - start.getTime()) / DAY_MS);
      expect(spanDays).toBeGreaterThanOrEqual(6);
      expect(spanDays).toBeLessThanOrEqual(7);

      // Ends today (±1 day for the store vs. runner timezone difference).
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(Math.abs(Math.round((end.getTime() - today.getTime()) / DAY_MS))).toBeLessThanOrEqual(
        1,
      );
      await expect(batchHistoryPage.clearFiltersButton).toBeHidden();
    },
  );

  /**
   * Steps: open the picker, pick a range, apply.
   * Expected: the table reloads for that range; `dateAfter`/`dateBefore` update;
   * the result count updates.
   */
  test(
    'TC-BH-011 — selecting new date range filters table and updates URL',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.gotoAllTime();
      const allTimeTotal = await batchHistoryPage.totalResults();
      expect(allTimeTotal).toBeGreaterThan(0);

      // From the default view the calendar opens on last month + this month;
      // step back to a month that holds data (DEV has batches since mid-2026).
      await batchHistoryPage.goto();
      await batchHistoryPage.openDateRangePicker();
      await batchHistoryPage.goBackMonths(2);
      const { year, month } = await batchHistoryPage.calendarMonth();

      const from = new Date(year, month, 1);
      const to = new Date(year, month, 28);
      await batchHistoryPage.dayCell(from).click();
      await batchHistoryPage.dayCell(to).click();
      await batchHistoryPage.applyDateRangeButton.click();
      await batchHistoryPage.waitForReady();

      await test.step('URL carries the chosen range', async () => {
        await expect
          .poll(() => batchHistoryPage.currentQueryParams().get('dateAfter'))
          .toBe(iso(from));
        expect(batchHistoryPage.currentQueryParams().get('dateBefore')).toBe(iso(to));
      });

      await test.step('The table reloads narrowed to that range', async () => {
        await expect.poll(() => batchHistoryPage.totalResults()).toBeLessThan(allTimeTotal);
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

      await expect(batchHistoryPage.emptyState).toBeVisible();
      await expect(batchHistoryPage.table.rows).toHaveCount(0);
      await expect(batchHistoryPage.countBadge).toHaveText(/^0\s*batches$/i);
      // With nothing to page through the pagination bar is not rendered at all.
      await expect(batchHistoryPage.pagination).toBeHidden();
    },
  );

  /**
   * Expected: the picker prevents an end date before the start (or swaps the
   * range); never a `dateAfter > dateBefore` state in the URL; no crash.
   */
  test(
    'TC-BH-013 — selecting end date before start date is blocked or auto-corrected',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await batchHistoryPage.openDateRangePicker();
      await batchHistoryPage.goBackMonths(1);
      const { year, month } = await batchHistoryPage.calendarMonth();

      // Pick the 20th first, then try to close the range on the 5th.
      await batchHistoryPage.dayCell(new Date(year, month, 20)).click();
      await batchHistoryPage.dayCell(new Date(year, month, 5)).click();
      await batchHistoryPage.applyDateRangeButton.click();
      await batchHistoryPage.waitForReady();

      await expect.poll(() => batchHistoryPage.currentQueryParams().get('dateAfter')).toBeTruthy();
      const params = batchHistoryPage.currentQueryParams();
      const after = params.get('dateAfter')!;
      const before = params.get('dateBefore') ?? after;
      expect(
        new Date(after).getTime(),
        `inverted range reached the URL: dateAfter=${after} dateBefore=${before}`,
      ).toBeLessThanOrEqual(new Date(before).getTime());

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
      // Pinned to a known data-bearing day on DEV.
      const day = '2026-08-18';
      await batchHistoryPage.gotoWithParams({
        page: '1',
        status: 'all',
        dateAfter: day,
        dateBefore: day,
      });

      const params = batchHistoryPage.currentQueryParams();
      expect(params.get('dateAfter')).toBe(day);
      expect(params.get('dateBefore')).toBe(day);
      await expect(batchHistoryPage.dateRangeButton).toHaveText(/Aug 18, 2026/);

      await expect(batchHistoryPage.table.rows.first()).toBeVisible();
      for (const date of await batchHistoryPage.columnCellTexts(/batch date/i)) {
        expect(date).toMatch(/^Aug 18, 2026/);
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
        dateAfter: '2026-08-01',
        dateBefore: '2026-08-21',
      });

      const params = batchHistoryPage.currentQueryParams();
      expect(params.get('dateAfter')).toBe('2026-08-01');
      expect(params.get('dateBefore')).toBe('2026-08-21');

      await expect(batchHistoryPage.dateRangeButton).toHaveText(/Aug 1\s*[–-]\s*21, 2026/);
      await expect(batchHistoryPage.table.rows.first()).toBeVisible();
      for (const date of await batchHistoryPage.columnCellTexts(/batch date/i)) {
        expect(date).toMatch(/^Aug \d{1,2}, 2026/);
      }
    },
  );
});
