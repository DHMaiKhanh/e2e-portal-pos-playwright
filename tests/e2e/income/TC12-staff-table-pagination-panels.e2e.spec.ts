import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_COUNT_PATTERN,
  INCOME_CURRENCY_PATTERN,
  INCOME_PAGE_INDICATOR_PATTERN,
  INCOME_RESULTS_FOOTER_PATTERN,
  INCOME_STAFF_COLUMNS,
  INCOME_STAFF_PAGE_SIZE,
  INCOME_STAFF_SUMMARY_ROWS,
  IncomeStaffColumn,
  IncomeTab,
  incomeRowValue,
  incomeTabUrlPattern,
} from '@pages/income/IncomePage';

/**
 * The wide result set the pagination cases need: the three-week range the
 * source doc names, with `Show staff with no income` pre-checked so the table
 * spans several pages (observed 244 results → `1 / 9` on DEV).
 *
 * Hard-coded on purpose — the *paging arithmetic* is what is under test, so the
 * range must not shrink as the clock moves the way `Today` does.
 */
const WIDE_STAFF_QUERY: Record<string, string> = {
  tab: IncomeTab.STAFF,
  dateAfter: '2026-08-01',
  dateBefore: '2026-08-21',
  showStaffNoIncome: 'true',
};

/** The same range with the checkbox left off — the panel/search cases' baseline. */
const RANGE_STAFF_QUERY: Record<string, string> = {
  tab: IncomeTab.STAFF,
  dateAfter: '2026-08-01',
  dateBefore: '2026-08-21',
};

/** The four money columns of the Staff table (`ORDERS` is a bare count). */
const STAFF_MONEY_COLUMNS = [
  IncomeStaffColumn.SUBTOTAL,
  IncomeStaffColumn.SUPPLY_FEE,
  IncomeStaffColumn.TIP,
  IncomeStaffColumn.TOTAL_INCOME,
] as const;

/** `Total Staff` / `Total Orders` are counts; the remaining four are money. */
const STAFF_SUMMARY_COUNT_ROWS = ['Total Staff', 'Total Orders'];

/**
 * Income Reports — "Tab Staff Income — bảng, phân trang, panel tổng hợp".
 *
 * Three surfaces, one shared result set: the six-column Staff table, the
 * 30-rows-a-page footer (`Showing X to Y of Z results` + `Previous` / `n / m` /
 * `Next`) and the right-hand `STAFF SUMMARY` panel.
 *
 * Two constraints shape every assertion below:
 *
 *  1. The figures are store-scoped and move with the clock, so nothing asserts
 *     a live amount — only FORMAT (`INCOME_CURRENCY_PATTERN`,
 *     `INCOME_COUNT_PATTERN`) and INVARIANTS (`pages = ceil(Z / 30)`,
 *     `Total Staff = Z`, panel totals = column sums, panel constant across
 *     pages). Where a case quotes DEV numbers (`244`, `9`, `70 → 244`) the
 *     relationship is asserted, never the number.
 *  2. Every filter is URL state, so `gotoWithQuery()` is the way into each
 *     state and the query string is a first-class assertion surface.
 *
 * TWO CASES ARE EXPECTED TO FAIL and are written against the CORRECT behaviour
 * on purpose, because the source doc raises them as defect trackers — see the
 * JSDoc on TC-INC-125 (the page counter is not clamped) and TC-INC-131 (the
 * panel ignores `search=`). Softening either would freeze the bug into the
 * suite.
 */
test.describe('Tab Staff Income — bảng, phân trang, panel tổng hợp — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  /**
   * TC-INC-120 — Bảng Staff đúng cột
   * Steps:
   *  1. Load tab Staff.
   *  2. Đọc các `th`.
   * Expected:
   *  Đúng thứ tự `STAFF`, `ORDERS`, `SUBTOTAL`, `SUPPLY FEE`, `TIP`, `TOTAL INCOME`.
   *
   * The headers are upper-cased by CSS `text-transform` only, so `textContent`
   * comes back title case — the comparison is case-insensitive.
   */
  test(
    'TC-INC-120 — Staff table renders STAFF, ORDERS, SUBTOTAL, SUPPLY FEE, TIP, TOTAL INCOME in order',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ incomePage, page }) => {
      await incomePage.openTab(IncomeTab.STAFF);
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.STAFF));

      await expect(incomePage.staffHeaders).toHaveCount(INCOME_STAFF_COLUMNS.length);

      const headers = (await incomePage.staffHeaders.allTextContents()).map((text) =>
        text.replace(/\s+/g, ' ').trim().toLowerCase(),
      );
      expect(headers).toEqual(INCOME_STAFF_COLUMNS.map((column) => column.toLowerCase()));
    },
  );

  /**
   * TC-INC-121 — Kích thước trang là 30 dòng
   * Steps:
   *  1. Load tập kết quả > 30 dòng.
   *  2. Đếm dòng và đọc footer.
   * Expected:
   *  Đúng 30 dòng trên trang 1; footer `Showing 1 to 30 of <Z> results`.
   */
  test(
    'TC-INC-121 — page 1 holds exactly 30 rows and the footer reads Showing 1 to 30 of Z',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(WIDE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      await expect(incomePage.resultsFooter).toHaveText(INCOME_RESULTS_FOOTER_PATTERN);

      const [from, to, total] = await incomePage.resultsRange();
      test.skip(
        !(total > INCOME_STAFF_PAGE_SIZE),
        'the dev store no longer returns more than one page for this range, so page size cannot be observed',
      );

      expect(from).toBe(1);
      expect(to).toBe(INCOME_STAFF_PAGE_SIZE);
      expect(await incomePage.staffTable.rowCount()).toBe(INCOME_STAFF_PAGE_SIZE);
    },
  );

  /**
   * TC-INC-122 — Sang trang 2 bằng `Next`
   * Steps:
   *  1. Load `?tab=staff&dateAfter=2026-08-01&dateBefore=2026-08-21&showStaffNoIncome=true`.
   *  2. Bấm `Next`.
   * Expected:
   *  URL thêm `page=2`; footer `Showing 31 to 60 of 244 results`; chỉ số `2 / 9`;
   *  tập dòng khác hoàn toàn trang 1.
   *
   * `244` / `9` are the numbers observed on DEV; asserted here as the
   * relationships they stand for (`31 = 30 + 1`, `pages = ceil(Z / 30)`).
   * "Different row set" is asserted as "the name list changed" rather than as a
   * strict disjointness: the dev data really does hold repeated staff names
   * (see TC-INC-135), so identical name strings on two pages are legitimate.
   */
  test(
    'TC-INC-122 — Next moves to page=2, footer 31 to 60, indicator 2 / ceil(Z/30)',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(WIDE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const total = await incomePage.totalResults();
      test.skip(
        !(total > INCOME_STAFF_PAGE_SIZE),
        'the dev store returns a single page for this range, so there is no page 2 to open',
      );

      const firstPageNames = await incomePage.staffNames();
      await incomePage.goToNextPage();

      expect(incomePage.param('page')).toBe('2');

      const [from, to, totalAfter] = await incomePage.resultsRange();
      expect(from).toBe(INCOME_STAFF_PAGE_SIZE + 1);
      expect(to).toBe(Math.min(INCOME_STAFF_PAGE_SIZE * 2, totalAfter));
      expect(totalAfter).toBe(total);

      await expect(incomePage.pageIndicator).toHaveText(INCOME_PAGE_INDICATOR_PATTERN);
      const [current, pages] = await incomePage.pagePosition();
      expect(current).toBe(2);
      expect(pages).toBe(Math.ceil(total / INCOME_STAFF_PAGE_SIZE));

      const secondPageNames = await incomePage.staffNames();
      expect(secondPageNames).not.toEqual(firstPageNames);
    },
  );

  /**
   * TC-INC-123 — Số trang khớp tổng kết quả và page size
   * Steps:
   *  1. Đọc `Z` trong footer và tổng số trang `M`.
   * Expected:
   *  `M = ceil(Z / 30)` (vd `244` → `9`).
   */
  test(
    'TC-INC-123 — total pages equals ceil(total results / 30)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(WIDE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const total = await incomePage.totalResults();
      expect(Number.isNaN(total)).toBe(false);

      const [, pages] = await incomePage.pagePosition();
      // A zero-result set still renders one (empty) page, which is why the
      // expectation is floored at 1 rather than being a bare `ceil`.
      expect(pages).toBe(Math.max(1, Math.ceil(total / INCOME_STAFF_PAGE_SIZE)));
    },
  );

  /**
   * TC-INC-124 — Trang cuối `Next` bị disable
   * Steps:
   *  1. Điều hướng tới trang cuối.
   * Expected:
   *  `Next` disable, `Previous` enable; footer `Showing` kết thúc đúng bằng `Z`.
   */
  test(
    'TC-INC-124 — on the last page Next is disabled, Previous is enabled and Showing ends at Z',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(WIDE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const [, pages] = await incomePage.pagePosition();
      test.skip(
        pages < 2,
        'the dev store returns a single page for this range, so "the last page" is also the first and Previous is legitimately disabled',
      );

      // The last page is addressed as URL state — the same `page=` the pager writes.
      await incomePage.gotoWithQuery({ ...WIDE_STAFF_QUERY, page: String(pages) });
      await incomePage.waitForDataSettled();

      expect(await incomePage.pagePosition()).toEqual([pages, pages]);

      const [, to, total] = await incomePage.resultsRange();
      expect(to).toBe(total);

      expect(await incomePage.paginationDisabled()).toEqual({ previous: false, next: true });
    },
  );

  /**
   * TC-INC-125 — `page` vượt quá số trang
   * Steps:
   *  1. Load `?tab=staff&page=999`.
   * Expected:
   *  Hiện `No staff income found.` và `Showing 0 to 0 of 0 results`. **Bộ đếm
   *  trang hiện đang render `999 / 1`** — cần kẹp về trang hợp lệ (vd `1 / 9`)
   *  hoặc redirect về trang cuối. Case này dùng để theo dõi lỗi UI đã phát hiện.
   *
   * EXPECTED TO FAIL on the last assertion: DEV renders the raw `page=` in the
   * counter (`999 / 1`), i.e. a current page beyond the total. The empty-state
   * and footer assertions above it pass, so a failure here pinpoints exactly
   * the missing clamp. Do not soften it — this case exists to track that bug.
   */
  test(
    'TC-INC-125 — page=999 shows the empty state and must clamp the page counter to a valid page',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: IncomeTab.STAFF, page: '999' });
      await incomePage.waitForDataSettled();

      await expect(incomePage.staffEmptyState.first()).toBeVisible();
      expect(await incomePage.staffTable.rowCount()).toBe(0);
      expect(await incomePage.resultsRange()).toEqual([0, 0, 0]);

      const [current, pages] = await incomePage.pagePosition();
      expect(
        current,
        'the page counter must be clamped to a page that exists (renders 999 / 1 today)',
      ).toBeLessThanOrEqual(pages);
    },
  );

  /**
   * TC-INC-126 — `page=0` hoặc `page` âm
   * Steps:
   *  1. Load `?tab=staff&page=0`, sau đó `?tab=staff&page=-3`.
   * Expected:
   *  Fallback về trang 1 và render bình thường, không lỗi.
   *
   * Run against the wide range rather than the default `Today`, so "renders
   * normally" has rows to be true of: on an empty day the footer reads
   * `Showing 0 to 0 of 0 results` for every `page=`, which would prove nothing.
   */
  test(
    'TC-INC-126 — page=0 and page=-3 fall back to page 1 and still render',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      for (const page of ['0', '-3']) {
        await incomePage.gotoWithQuery({ ...WIDE_STAFF_QUERY, page });
        await incomePage.waitForDataSettled();

        // Rendered normally: the table and its footer are up, no error screen.
        await expect(incomePage.staffHeaders.first()).toBeVisible();
        await expect(incomePage.unavailableMessage).toHaveCount(0);
        await expect(incomePage.resultsFooter).toHaveText(INCOME_RESULTS_FOOTER_PATTERN);

        // Fell back to page 1: the first result of the whole set is on screen.
        const [from] = await incomePage.resultsRange();
        expect(from, `page=${page} must fall back to the first page`).toBe(1);

        const [current] = await incomePage.pagePosition();
        expect(current, `page=${page} must read as page 1 in the counter`).toBe(1);
      }
    },
  );

  /**
   * TC-INC-127 — Đổi filter reset về trang 1
   * Steps:
   *  1. Sang trang 3.
   *  2. Gõ vào ô tìm kiếm.
   * Expected:
   *  Bảng về trang 1, không giữ `page=3` khiến bảng rỗng dù có kết quả.
   *
   * The search term is read off the page the test is standing on, so the filter
   * is guaranteed to match at least one staff member — which is what makes the
   * "empty table despite results" half of the expectation checkable.
   */
  test(
    'TC-INC-127 — typing in the search box resets the table from page 3 to page 1',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ ...WIDE_STAFF_QUERY, page: '3' });
      await incomePage.waitForDataSettled();

      const [, pages] = await incomePage.pagePosition();
      test.skip(
        pages < 3,
        'the dev store returns fewer than three pages for this range, so page 3 cannot be reached',
      );

      const names = await incomePage.staffNames();
      const term = names[0] ?? '';
      test.skip(term.length === 0, 'page 3 came back empty, so there is no name to search for');

      await incomePage.searchStaff(term);
      await incomePage.waitForDataSettled();

      expect(incomePage.param('page'), 'the stale page= must not survive the new filter').not.toBe(
        '3',
      );
      const [current] = await incomePage.pagePosition();
      expect(current).toBe(1);

      const [from, , total] = await incomePage.resultsRange();
      if (total > 0) {
        expect(from).toBe(1);
        expect(
          await incomePage.staffTable.rowCount(),
          'the filtered set has results, so the table must not be empty',
        ).toBeGreaterThan(0);
      }
    },
  );

  /**
   * TC-INC-128 — Panel `STAFF SUMMARY` đủ chỉ tiêu
   * Steps:
   *  1. Load tab Staff.
   *  2. Đọc panel.
   * Expected:
   *  Có `Total Staff`, `Total Orders`, `Total Subtotal`, `Total Supply Fee`,
   *  `Total Tip`, `TOTAL INCOME`.
   */
  test(
    'TC-INC-128 — STAFF SUMMARY carries all six metrics with values',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.openTab(IncomeTab.STAFF);

      await expect(incomePage.staffSummaryHeading).toBeVisible();

      const rows = await incomePage.staffSummaryRows();
      for (const label of INCOME_STAFF_SUMMARY_ROWS) {
        const value = incomeRowValue(rows, label);
        expect(value, `${label} is rendered with a value`).not.toBe('');
        // The two head rows are counts; everything below them is money.
        expect(value).toMatch(
          STAFF_SUMMARY_COUNT_ROWS.includes(label) ? INCOME_COUNT_PATTERN : INCOME_CURRENCY_PATTERN,
        );
      }
    },
  );

  /**
   * TC-INC-129 — `Total Staff` khớp tổng kết quả bảng
   * Steps:
   *  1. Load tab Staff (không tìm kiếm).
   *  2. So `Total Staff` với `Z` trong `Showing … of Z results`.
   * Expected:
   *  Hai số bằng nhau (đã quan sát khớp: 70/70 và 244/244).
   */
  test(
    'TC-INC-129 — Total Staff equals the footer result total',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(RANGE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const total = await incomePage.totalResults();
      const totalStaff = await incomePage.staffSummaryNumber('Total Staff');

      expect(Number.isNaN(total)).toBe(false);
      expect(Number.isNaN(totalStaff)).toBe(false);
      expect(totalStaff).toBe(total);
    },
  );

  /**
   * TC-INC-130 — `STAFF SUMMARY` cập nhật khi bật checkbox
   * Steps:
   *  1. Ghi lại panel khi tắt checkbox.
   *  2. Bật `Show staff with no income`.
   *  3. Ghi lại panel.
   * Expected:
   *  `Total Staff` tăng đúng theo tổng kết quả mới (70 → 244). **Lưu ý:** đã
   *  quan sát `Total Orders` tăng `991 → 1,000` khi chỉ thêm nhân viên **không
   *  có** doanh thu, trong khi `TOTAL INCOME` không đổi — cần xác nhận đây là
   *  lỗi tính toán.
   *
   * Only the settled half of the expectation is asserted: `Total Staff` grows
   * and keeps matching the footer total. The `Total Orders` drift the doc flags
   * is explicitly marked "cần xác nhận" (awaiting a product answer), so it is
   * left unasserted here rather than encoded as either the bug or the fix.
   */
  test(
    'TC-INC-130 — checking Show staff with no income grows Total Staff to the new result total',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(RANGE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      expect(await incomePage.isShowStaffWithNoIncomeChecked()).toBe(false);
      const staffBefore = await incomePage.staffSummaryNumber('Total Staff');
      const totalBefore = await incomePage.totalResults();
      expect(staffBefore).toBe(totalBefore);

      await incomePage.setShowStaffWithNoIncome(true);

      expect(await incomePage.isShowStaffWithNoIncomeChecked()).toBe(true);
      const staffAfter = await incomePage.staffSummaryNumber('Total Staff');
      const totalAfter = await incomePage.totalResults();

      expect(totalAfter).toBeGreaterThan(totalBefore);
      expect(staffAfter).toBe(totalAfter);
      expect(staffAfter).toBeGreaterThan(staffBefore);
    },
  );

  /**
   * TC-INC-131 — `STAFF SUMMARY` phải phản ánh cả `search` (kỳ vọng)
   * Steps:
   *  1. Load `?tab=staff&dateAfter=2026-08-01&dateBefore=2026-08-21` (ghi lại panel).
   *  2. Thêm `&search=Erin` (bảng còn 1 dòng).
   *  3. Đọc lại panel.
   * Expected:
   *  Panel phải tổng hợp theo tập đã lọc (`Total Staff 1`, `TOTAL INCOME` =
   *  income của `Erin`). **Hiện tại panel không đổi** (`Total Staff 70`,
   *  `TOTAL INCOME -$471,042.34`) → case này dự kiến FAIL, dùng để theo dõi
   *  lỗi. *(Nếu team xác nhận panel cố ý tổng hợp toàn kỳ, đổi kỳ vọng và bổ
   *  sung nhãn giải thích trên UI.)*
   *
   * EXPECTED TO FAIL: the panel aggregates the whole period and ignores
   * `search=`. Written as the correct behaviour — `Total Staff` must keep
   * tracking the footer total the way TC-INC-129 proves it does unfiltered —
   * so the failure names the defect instead of hiding it. The searched name is
   * read from the live table rather than hard-coded to `Erin`.
   */
  test(
    'TC-INC-131 — STAFF SUMMARY must aggregate the searched subset, not the whole period',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(RANGE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const names = await incomePage.staffNames();
      const term = names[0] ?? '';
      test.skip(term.length === 0, 'the range came back empty, so there is no name to search for');

      const unfilteredStaff = await incomePage.staffSummaryNumber('Total Staff');

      await incomePage.gotoWithQuery({ ...RANGE_STAFF_QUERY, search: term });
      await incomePage.waitForDataSettled();

      const filteredTotal = await incomePage.totalResults();
      expect(filteredTotal).toBeGreaterThan(0);
      expect(filteredTotal, 'the search must actually narrow the table').toBeLessThan(
        unfilteredStaff,
      );

      const filteredStaff = await incomePage.staffSummaryNumber('Total Staff');
      expect(
        filteredStaff,
        'Total Staff must summarise the filtered set (still reports the whole period today)',
      ).toBe(filteredTotal);
    },
  );

  /**
   * TC-INC-132 — `STAFF SUMMARY` cập nhật khi đổi khoảng ngày
   * Steps:
   *  1. Đọc panel với khoảng `Today`.
   *  2. Đổi sang `Aug 1 – Aug 21, 2026`.
   *  3. Đọc lại panel.
   * Expected:
   *  Mọi chỉ tiêu trong panel thay đổi theo khoảng ngày mới.
   *
   * Asserted as "the panel is not the same panel any more" plus a hard check on
   * `TOTAL INCOME`: a one-day range and a 21-day range that contains it cannot
   * share a total unless the extra 20 days sum to exactly zero. Requiring each
   * of the six metrics to differ individually would be brittle — two ranges can
   * legitimately share a `Total Staff`.
   */
  test(
    'TC-INC-132 — STAFF SUMMARY re-aggregates when the date range changes',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.openTab(IncomeTab.STAFF);
      expect(await incomePage.dateTriggerLabel()).toBe('Today');

      const todayRows = await incomePage.staffSummaryRows();
      const today = INCOME_STAFF_SUMMARY_ROWS.map((label) => incomeRowValue(todayRows, label));

      await incomePage.gotoWithQuery(RANGE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const rangeRows = await incomePage.staffSummaryRows();
      const range = INCOME_STAFF_SUMMARY_ROWS.map((label) => incomeRowValue(rangeRows, label));

      expect(range).not.toEqual(today);
      expect(incomeRowValue(rangeRows, 'TOTAL INCOME')).not.toBe(
        incomeRowValue(todayRows, 'TOTAL INCOME'),
      );
    },
  );

  /**
   * TC-INC-133 — Panel không đổi khi chỉ sang trang
   * Steps:
   *  1. Đọc panel ở trang 1.
   *  2. Sang trang 2.
   *  3. Đọc lại panel.
   * Expected:
   *  Panel giữ nguyên (tổng của toàn bộ tập lọc, không phải của riêng trang đang xem).
   */
  test(
    'TC-INC-133 — STAFF SUMMARY is unchanged by paging',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(WIDE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const total = await incomePage.totalResults();
      test.skip(
        !(total > INCOME_STAFF_PAGE_SIZE),
        'the dev store returns a single page for this range, so there is no second page to compare',
      );

      const firstRows = await incomePage.staffSummaryRows();
      const onPageOne = INCOME_STAFF_SUMMARY_ROWS.map((label) => incomeRowValue(firstRows, label));

      await incomePage.goToNextPage();
      expect((await incomePage.pagePosition())[0]).toBe(2);

      const secondRows = await incomePage.staffSummaryRows();
      const onPageTwo = INCOME_STAFF_SUMMARY_ROWS.map((label) => incomeRowValue(secondRows, label));

      expect(onPageTwo).toEqual(onPageOne);
    },
  );

  /**
   * TC-INC-134 — `Total Subtotal` / `Total Tip` khớp tổng các dòng
   * Preconditions: Chọn filter cho tập kết quả ≤ 30 dòng (gói trong 1 trang).
   * Steps:
   *  1. Cộng cột `SUBTOTAL` và cột `TIP` của mọi dòng.
   *  2. So với `Total Subtotal` và `Total Tip` trong panel.
   * Expected:
   *  Các cặp giá trị khớp nhau.
   *
   * The single-page precondition is met with a narrow DATE range (the default
   * `Today`), never with `search=`: the panel provably ignores `search=`
   * (TC-INC-131), so a searched subset would make this case fail for that
   * unrelated defect instead of for a real summing error.
   */
  test(
    'TC-INC-134 — Total Subtotal and Total Tip equal the sum of their columns on a single page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.openTab(IncomeTab.STAFF);

      const total = await incomePage.totalResults();
      test.skip(total === 0, 'today holds no staff income, so there is no row to sum');
      test.skip(
        total > INCOME_STAFF_PAGE_SIZE,
        'today already spans more than one page, so the visible rows cannot add up to the whole-set panel',
      );

      const table = incomePage.staffTable;
      expect(await table.rowCount()).toBe(total);

      const subtotalSum = await incomePage.sumColumnAmounts(table, IncomeStaffColumn.SUBTOTAL);
      const tipSum = await incomePage.sumColumnAmounts(table, IncomeStaffColumn.TIP);

      expect(await incomePage.staffSummaryNumber('Total Subtotal')).toBeCloseTo(subtotalSum, 2);
      expect(await incomePage.staffSummaryNumber('Total Tip')).toBeCloseTo(tipSum, 2);
    },
  );

  /**
   * TC-INC-135 — Nhân viên trùng tên vẫn là hai dòng riêng
   * Steps:
   *  1. Bật `Show staff with no income`.
   *  2. Tìm `Bell` (dữ liệu quan sát có 2 nhân viên tên `Bell`).
   * Expected:
   *  Hiện 2 dòng riêng biệt với số liệu khác nhau, không bị gộp hay ghi đè.
   */
  test(
    'TC-INC-135 — two staff sharing a name stay two separate rows',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ ...WIDE_STAFF_QUERY, search: 'Bell' });
      await incomePage.waitForDataSettled();

      const names = await incomePage.staffNames();
      const duplicates = names
        .map((name, index) => ({ name, index }))
        .filter((entry) => entry.name === 'Bell');
      test.skip(
        duplicates.length < 2,
        'the dev store no longer holds two staff named "Bell", so there is no name collision to check',
      );

      // Not merged and not overwritten: one <tr> per staff member, so the row
      // count still equals the number of names read out of the column.
      expect(await incomePage.staffTable.rowCount()).toBe(names.length);
      expect(duplicates.length).toBeGreaterThanOrEqual(2);

      const rows = await Promise.all(
        duplicates.map((entry) => incomePage.staffRowAmounts(entry.index)),
      );
      // Distinct figures only prove independence when at least one of them has
      // any activity — two staff with no income at all legitimately read alike.
      if (rows.some((row) => row.orders !== 0 || row.totalIncome !== 0)) {
        const fingerprints = new Set(rows.map((row) => JSON.stringify(row)));
        expect(fingerprints.size).toBeGreaterThan(1);
      }
    },
  );

  /**
   * TC-INC-136 — Dòng nhân viên không có doanh thu hiển thị `0`/`$0.00`, không để trống
   * Steps:
   *  1. Bật `Show staff with no income`.
   *  2. Xem một dòng như `Cara`.
   * Expected:
   *  `ORDERS` = `0`; các cột tiền = `$0.00`; không có ô trống hay `null`/`NaN`.
   *
   * The zero-income staff are not guaranteed to sit on page 1, so the row is
   * hunted by value (`ORDERS` = `0`) on the first and then the last page rather
   * than by the name the doc happens to quote.
   */
  test(
    'TC-INC-136 — a staff member with no income renders 0 and $0.00, never blanks',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(WIDE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      let orders = await incomePage.columnValues(incomePage.staffTable, IncomeStaffColumn.ORDERS);
      let rowIndex = orders.indexOf('0');

      if (rowIndex < 0) {
        const [, pages] = await incomePage.pagePosition();
        if (pages > 1) {
          await incomePage.gotoWithQuery({ ...WIDE_STAFF_QUERY, page: String(pages) });
          await incomePage.waitForDataSettled();
          orders = await incomePage.columnValues(incomePage.staffTable, IncomeStaffColumn.ORDERS);
          rowIndex = orders.indexOf('0');
        }
      }
      test.skip(
        rowIndex < 0,
        'no zero-order staff row is reachable on the first or last page of this range',
      );

      const cells = await incomePage.rowValues(incomePage.staffTable, rowIndex);
      expect(cells).toHaveLength(INCOME_STAFF_COLUMNS.length);

      expect(cells[IncomeStaffColumn.STAFF]).not.toBe('');
      expect(cells[IncomeStaffColumn.ORDERS]).toBe('0');
      for (const column of STAFF_MONEY_COLUMNS) {
        expect(cells[column]).toBe('$0.00');
      }
      for (const cell of cells) {
        expect(cell).not.toBe('');
        expect(cell).not.toMatch(/null|undefined|NaN/i);
      }
    },
  );

  /**
   * TC-INC-137 — Giá trị âm và giá trị rất lớn render đúng
   * Steps:
   *  1. Tìm dòng có `TOTAL INCOME` âm (vd `Erin` → `-$489,680.82`) và dòng có
   *     `SUBTOTAL` rất lớn (vd `$5,566,988.54`).
   * Expected:
   *  Dấu trừ nằm trước ký hiệu `$`; dấu phẩy phân cách hàng nghìn đúng; ô không
   *  bị tràn/cắt chữ.
   *
   * `INCOME_CURRENCY_PATTERN` (`^-?\$\d{1,3}(?:,\d{3})*\.\d{2}$`) encodes both
   * typographic rules at once: the sign can only precede the `$`, and the
   * integer part can only be grouped in threes. "Not clipped" is asserted as
   * the layout red line — the document must not scroll sideways at the default
   * desktop viewport, however wide the numbers get.
   */
  test(
    'TC-INC-137 — negative and very large amounts keep the sign before $ and comma grouping',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(WIDE_STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const cells = await incomePage.tableCurrencyCells();
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) {
        expect(cell).toMatch(INCOME_CURRENCY_PATTERN);
      }

      // A negative row exists in this range on DEV; assert its shape when it does.
      const negatives = cells.filter((cell) => cell.startsWith('-'));
      if (negatives.length > 0) {
        for (const cell of negatives) {
          expect(cell).toMatch(/^-\$/);
        }
      }

      // "Very large" = at least one thousands separator, i.e. six figures or more.
      const grouped = cells.filter((cell) => /,\d{3}(?:,\d{3})*\.\d{2}$/.test(cell));
      expect(grouped.length, 'the range holds at least one grouped amount').toBeGreaterThan(0);

      expect(await incomePage.hasHorizontalOverflow()).toBe(false);
    },
  );
});
