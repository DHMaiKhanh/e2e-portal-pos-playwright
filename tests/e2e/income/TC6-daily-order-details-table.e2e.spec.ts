import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_CURRENCY_PATTERN,
  INCOME_DAILY_COLUMNS,
  INCOME_ORDER_CODE_PATTERN,
  IncomeDailyColumn,
  parseIncomeAmount,
} from '@pages/income/IncomePage';

/**
 * Income Reports — "Tab Daily — bảng Order Details".
 *
 * The Daily tab's `Order Details` card: five columns (`ORDER #`,
 * `SALE/REFUND`, `TAX`, `TIP`, `TOTAL`), an `<N> orders` counter beside the
 * title and the shared `Showing X to Y of Z results` + `Previous` / `1 / n` /
 * `Next` footer.
 *
 * Two constraints shape every assertion below:
 *
 *  1. The data is store- and day-scoped, so nothing asserts a live amount —
 *     only FORMAT (`INCOME_CURRENCY_PATTERN`, `INCOME_ORDER_CODE_PATTERN`) and
 *     INVARIANTS (the counter equals the footer total; `SALE/REFUND + TAX + TIP
 *     = TOTAL`).
 *  2. Cases that need a specific day's data (a day with a refund, a day with
 *     more than one page of orders, a day with no orders at all) cannot seed
 *     that day. The ones whose shape is still checkable guard themselves with
 *     `test.skip(<reason>)` so they never pretend to pass; the two that also
 *     need visual/live verification are left as `test.fixme` scaffolds.
 *
 * The date `2026-08-18` used by TC-INC-050 / TC-INC-053 is the date the source
 * test cases name; it is passed as URL state (`?tab=daily&date=…`), which is
 * how every filter on this screen is addressed.
 */
test.describe('Tab Daily — bảng Order Details — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
    await incomePage.waitForDataSettled();
  });

  /**
   * TC-INC-049 — Bảng `Order Details` đúng tiêu đề cột
   * Steps:
   *  1. Load `?tab=daily`.
   *  2. Đọc các `th`.
   * Expected:
   *  Đúng thứ tự `ORDER #`, `SALE/REFUND`, `TAX`, `TIP`, `TOTAL`.
   *
   * The headers are upper-cased by CSS `text-transform` only — `textContent`
   * is title case, so the comparison is case-insensitive.
   */
  test(
    'TC-INC-049 — Order Details renders ORDER #, SALE/REFUND, TAX, TIP, TOTAL in order',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ incomePage }) => {
      await expect(incomePage.orderDetailsTitle).toBeVisible();
      await expect(incomePage.orderDetailsHeaders).toHaveCount(INCOME_DAILY_COLUMNS.length);

      const headers = (await incomePage.orderDetailsHeaders.allTextContents()).map((text) =>
        text.replace(/\s+/g, ' ').trim().toLowerCase(),
      );
      expect(headers).toEqual(INCOME_DAILY_COLUMNS.map((column) => column.toLowerCase()));
    },
  );

  /**
   * TC-INC-050 — Số lượng order ở đầu card khớp footer
   * Steps:
   *  1. Load `?tab=daily&date=2026-08-18`.
   *  2. Đọc `<N> orders` cạnh tiêu đề và `Showing X to Y of Z results`.
   * Expected:
   *  `N` bằng `Z`.
   */
  test(
    'TC-INC-050 — the "<N> orders" counter equals the footer total',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'daily', date: '2026-08-18' });
      await incomePage.waitForDataSettled();

      const total = await incomePage.totalResults();
      expect(Number.isNaN(total)).toBe(false);
      test.skip(
        total === 0,
        'that date holds no orders on DEV, so no "<N> orders" counter is rendered to compare',
      );

      await expect(incomePage.orderCountLabel).toBeVisible();
      expect(await incomePage.orderCount()).toBe(total);
    },
  );

  /**
   * TC-INC-051 — Dòng refund được đánh dấu rõ
   * Steps:
   *  1. Chọn ngày có refund.
   *  2. Tìm dòng có hậu tố `(Refund)`.
   * Expected:
   *  Mã order kết thúc bằng ` (Refund)`; các cột tiền có dấu âm (vd `-$68.22`);
   *  dòng có style phân biệt (nền/chữ đỏ) — và thông tin refund **không chỉ**
   *  thể hiện bằng màu (có chữ `(Refund)`).
   *
   * // TODO(manual/setup): needs a day known to contain a refunded order — the
   * Daily tab shows exactly one day at a time and DEV refund data moves, so
   * there is no date that can be hard-coded here. The "nền/chữ đỏ" half of the
   * Expected is a computed-style/visual claim the screen scan did not inventory
   * a hook for, so it needs live verification too. Unblocked by pinning a
   * refund date (or a mocked list response) and adding the distinguishing
   * class/colour assertion.
   */
  test.fixme(
    'TC-INC-051 — refund rows carry the " (Refund)" suffix and negative amounts',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      // Best-effort arrange: the locator that will drive the case once a refund
      // date is pinned. Nothing is asserted, so the scaffold cannot fail.
      await incomePage.refundRows.count();
    },
  );

  /**
   * TC-INC-052 — Mã order đúng định dạng
   * Steps:
   *  1. Load bảng.
   *  2. Kiểm tra từng ô `ORDER #`.
   * Expected:
   *  Khớp `^#OD\d{6}-\d{8}( \(Refund\))?$`.
   */
  test(
    'TC-INC-052 — every ORDER # matches #OD######-######## with an optional (Refund) suffix',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      const codes = await incomePage.columnValues(
        incomePage.orderDetailsTable,
        IncomeDailyColumn.ORDER,
      );
      test.skip(
        codes.length === 0,
        'the selected day holds no orders, so there is no code to check',
      );

      for (const code of codes) {
        expect(code).toMatch(INCOME_ORDER_CODE_PATTERN);
      }
    },
  );

  /**
   * TC-INC-053 — Cột `TOTAL` bằng `SALE/REFUND` + `TAX` + `TIP`
   * Steps:
   *  1. Load `?tab=daily&date=2026-08-18`.
   *  2. Với mỗi dòng, parse 4 cột tiền và cộng.
   * Expected:
   *  `SALE/REFUND + TAX + TIP = TOTAL` với mọi dòng (vd
   *  `$18.00 + $1.80 + $0.00 = $19.80`), kể cả dòng refund âm.
   */
  test(
    'TC-INC-053 — SALE/REFUND + TAX + TIP equals TOTAL on every row',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'daily', date: '2026-08-18' });
      await incomePage.waitForDataSettled();

      const table = incomePage.orderDetailsTable;
      const [sale, tax, tip, total] = await Promise.all([
        incomePage.columnValues(table, IncomeDailyColumn.SALE_REFUND),
        incomePage.columnValues(table, IncomeDailyColumn.TAX),
        incomePage.columnValues(table, IncomeDailyColumn.TIP),
        incomePage.columnValues(table, IncomeDailyColumn.TOTAL),
      ]);
      test.skip(sale.length === 0, 'that date holds no orders on DEV, so there is no row to sum');

      expect(tax).toHaveLength(sale.length);
      expect(tip).toHaveLength(sale.length);
      expect(total).toHaveLength(sale.length);

      for (let row = 0; row < sale.length; row += 1) {
        const cells = [sale[row], tax[row], tip[row], total[row]];
        for (const cell of cells) {
          // Negative refund amounts render as `-$68.22`, which the pattern allows.
          expect(cell).toMatch(INCOME_CURRENCY_PATTERN);
        }
        const sum =
          parseIncomeAmount(sale[row]) + parseIncomeAmount(tax[row]) + parseIncomeAmount(tip[row]);
        expect(sum).toBeCloseTo(parseIncomeAmount(total[row]), 2);
      }
    },
  );

  /**
   * TC-INC-054 — Mã order không phải thẻ `<a>`
   * Steps:
   *  1. Load bảng.
   *  2. Đếm `a[href]` bên trong bảng.
   * Expected:
   *  Bằng 0 — mã order chỉ được style giống link; mở chi tiết phải bằng click
   *  dòng (xem TC-INC-060).
   */
  test(
    'TC-INC-054 — the table holds no a[href]; order codes only look like links',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await expect(incomePage.orderDetailsHeaders.first()).toBeVisible();
      await expect(incomePage.orderTableLinks).toHaveCount(0);
    },
  );

  /**
   * TC-INC-055 — Empty state của bảng khi ngày không có order
   * Steps:
   *  1. Chọn một ngày không có order.
   * Expected:
   *  Bảng hiện thông báo rỗng trên 1 dòng, footer `Showing 0 to 0 of 0 results`,
   *  `Previous`/`Next` disable.
   *
   * A date well before this store existed is the cheapest order-free day. If
   * DEV ever does hold orders then, the case skips rather than false-fails.
   */
  test(
    'TC-INC-055 — an order-free day shows no rows, "0 to 0 of 0" and both arrows disabled',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'daily', date: '2024-01-01' });
      await incomePage.waitForDataSettled();

      const [from, to, total] = await incomePage.resultsRange();
      test.skip(total > 0, `DEV unexpectedly holds ${total} orders on that date`);

      expect([from, to, total]).toEqual([0, 0, 0]);
      // `DataTable.rows` excludes the single placeholder row the app renders in
      // place of data, so an empty body reports zero rows.
      expect(await incomePage.orderDetailsTable.rowCount()).toBe(0);
      await expect(incomePage.previousPageButton).toBeDisabled();
      await expect(incomePage.nextPageButton).toBeDisabled();
    },
  );

  /**
   * TC-INC-056 — Phân trang `Previous`/`Next` disable ở biên
   * Steps:
   *  1. Load một ngày chỉ có 1 trang kết quả.
   *  2. Kiểm tra thuộc tính `disabled` của `Previous` và `Next`.
   * Expected:
   *  Cả hai nút disable; chỉ số trang là `1 / 1`.
   */
  test(
    'TC-INC-056 — on a single-page day both arrows are disabled and the indicator reads 1 / 1',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      const [current, totalPages] = await incomePage.pagePosition();
      expect(current).toBe(1);
      // Page 1 is a lower boundary whatever the data volume is.
      await expect(incomePage.previousPageButton).toBeDisabled();

      test.skip(
        totalPages > 1,
        `today's orders span ${totalPages} pages — no single-page day to assert the upper boundary on`,
      );
      await expect(incomePage.nextPageButton).toBeDisabled();
      await expect(incomePage.pageIndicator).toHaveText(/^\s*1\s*\/\s*1\s*$/);
    },
  );

  /**
   * TC-INC-057 — Sang trang khi có nhiều trang
   * Preconditions: Chọn ngày có số order lớn hơn kích thước trang (hoặc mock
   * response nhiều trang).
   * Steps:
   *  1. Bấm `Next`.
   *  2. Đọc footer và URL.
   * Expected:
   *  Chỉ số trang tăng, `Showing` cập nhật đúng dải, URL phản ánh `page=`, tập
   *  dòng thay đổi hoàn toàn (không lặp dòng trang trước).
   */
  test(
    'TC-INC-057 — Next advances the page, the footer range and the URL, with disjoint rows',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const [, totalPages] = await incomePage.pagePosition();
      test.skip(
        totalPages <= 1,
        'today holds a single page of orders, so there is no page boundary to cross',
      );

      const firstCodes = await incomePage.columnValues(
        incomePage.orderDetailsTable,
        IncomeDailyColumn.ORDER,
      );
      const [, firstTo] = await incomePage.resultsRange();

      await incomePage.goToNextPage();

      expect((await incomePage.pagePosition())[0]).toBe(2);
      await expect(page).toHaveURL(/[?&]page=/);

      const [secondFrom, secondTo, secondTotal] = await incomePage.resultsRange();
      expect(secondFrom).toBe(firstTo + 1);
      expect(secondTo).toBeGreaterThanOrEqual(secondFrom);
      expect(secondTo).toBeLessThanOrEqual(secondTotal);

      const secondCodes = await incomePage.columnValues(
        incomePage.orderDetailsTable,
        IncomeDailyColumn.ORDER,
      );
      expect(secondCodes.length).toBeGreaterThan(0);
      expect(secondCodes.some((code) => firstCodes.includes(code))).toBe(false);
    },
  );

  /**
   * TC-INC-058 — `Previous` quay lại trang trước
   * Steps:
   *  1. Sang trang
   *  2. Bấm `Previous`.
   * Expected:
   *  Trở về trang 1 với đúng tập dòng ban đầu và footer `Showing 1 to …`.
   */
  test(
    'TC-INC-058 — Previous restores page 1 with its original rows',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      const [, totalPages] = await incomePage.pagePosition();
      test.skip(
        totalPages <= 1,
        'today holds a single page of orders, so Previous has no earlier page to return to',
      );

      const firstCodes = await incomePage.columnValues(
        incomePage.orderDetailsTable,
        IncomeDailyColumn.ORDER,
      );

      await incomePage.goToNextPage();
      await incomePage.goToPreviousPage();

      expect((await incomePage.pagePosition())[0]).toBe(1);
      expect((await incomePage.resultsRange())[0]).toBe(1);
      expect(
        await incomePage.columnValues(incomePage.orderDetailsTable, IncomeDailyColumn.ORDER),
      ).toEqual(firstCodes);
    },
  );

  /**
   * TC-INC-059 — Đổi ngày reset về trang 1
   * Steps:
   *  1. Sang trang 2 của một ngày nhiều order.
   *  2. Chọn ngày khác.
   * Expected:
   *  Bảng về trang 1 (`Showing 1 to …`), không giữ lại `page` cũ gây bảng rỗng.
   *
   * // TODO(manual/setup): needs a day whose order count exceeds the page size
   * so that page 2 exists at all — the Daily tab reports one day at a time and
   * DEV volume moves day to day, so the precondition cannot be arranged from
   * the test. It also has to survive picking a *different* day in the calendar,
   * which changes with the run date. Unblocked by pinning a high-volume date
   * (or mocking a multi-page list response) and driving the picker from it.
   */
  test.fixme(
    'TC-INC-059 — changing the date resets the table to page 1',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      // Best-effort arrange: read the page position the case would reset.
      await incomePage.pagePosition();
    },
  );
});
