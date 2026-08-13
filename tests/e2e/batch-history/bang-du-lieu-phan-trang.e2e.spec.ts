import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  buildMockBatch,
  buildMockBatchesCollection,
  formatBatchAmount,
  formatBatchNumber,
  paginateMockBatches,
  BATCHES_PAGE_SIZE,
} from '@data/dynamic/factories/mockBatch';

test.describe('Bảng dữ liệu & phân trang — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-023 — header bảng hiển thị đúng nhãn và đúng thứ tự',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.batchDateHeader).toBeVisible();
      await expect(batchHistoryPage.batchNumberHeader).toBeVisible();
      await expect(batchHistoryPage.statusHeader).toBeVisible();
      await expect(batchHistoryPage.totalPaymentHeader).toBeVisible();
      await expect(batchHistoryPage.amountHeader).toBeVisible();

      const headers = [
        batchHistoryPage.batchDateHeader,
        batchHistoryPage.batchNumberHeader,
        batchHistoryPage.statusHeader,
        batchHistoryPage.totalPaymentHeader,
        batchHistoryPage.amountHeader,
      ];
      const boxes = await Promise.all(headers.map((h) => h.boundingBox()));
      for (let i = 1; i < boxes.length; i++) {
        const prev = boxes[i - 1];
        const curr = boxes[i];
        expect(prev).not.toBeNull();
        expect(curr).not.toBeNull();
        if (prev && curr) {
          expect(curr.x).toBeGreaterThan(prev.x);
        }
      }
    },
  );

  /**
   * Steps:
   * 1. So sánh dữ liệu một batch đã biết trước với dòng tương ứng trên bảng.
   * Expected:
   * BATCH DATE, BATCH NUMBER, STATUS, TOTAL PAYMENT và AMOUNT đều khớp chính xác, không bị cắt/lệch dữ liệu.
   */
  /**
   * "Compare against the source" was read as needing a seeded backend fixture,
   * and parked. The source is available at run time: the `/batches` collection
   * the screen itself fetches. Capturing that response and diffing it against
   * the rendered cells checks exactly what the case asks — including the
   * transforms the ledger applies (minor units to dollars, batchNumber to
   * "B-00103", UTC timestamp to the store's +7 date).
   */
  test(
    'TC-BH-024 — giá trị từng dòng khớp với dữ liệu nguồn',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      const payloads: Array<{ member: Array<Record<string, unknown>> }> = [];
      page.on('response', async (response) => {
        if (!/\/batches\?/.test(response.url())) return;
        await response
          .json()
          .then((json) => payloads.push(json))
          .catch(() => undefined);
      });

      await batchHistoryPage.gotoAllTime();

      const source = payloads.filter((p) => (p.member?.length ?? 0) > 0).pop();
      expect(source, 'no populated /batches response was captured').toBeTruthy();
      const member = (source as { member: Array<Record<string, unknown>> }).member;

      const rendered = await batchHistoryPage.table.rows.allInnerTexts();
      expect(rendered).toHaveLength(member.length);

      for (const [index, record] of member.entries()) {
        const cells = rendered[index].split('\t').map((cell) => cell.trim());
        const [batchDate, batchNumber, status, totalPayment, amount] = cells;

        expect(batchNumber, `row ${index} BATCH NUMBER`).toBe(
          formatBatchNumber(record.batchNumber as number),
        );
        expect(amount.replace(/\s/g, ''), `row ${index} AMOUNT`).toBe(
          formatBatchAmount(record.totalAmount as number),
        );
        expect(totalPayment, `row ${index} TOTAL PAYMENT`).toBe(String(record.totalCount));
        expect(status.toLowerCase(), `row ${index} STATUS`).toBe(record.status);

        // An open batch has no close date yet and reads "Not closed yet".
        if (record.status === 'open') {
          expect(batchDate).toMatch(/not closed yet/i);
        } else {
          const expected = new Date(record.batchDate as string).toLocaleDateString('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          expect(batchDate, `row ${index} BATCH DATE`).toContain(expected);
        }
      }
    },
  );

  /**
   * Steps:
   * 1. Ghi lại dữ liệu dòng trang 1.
   * 2. Bấm "Next".
   * 3. Bấm "Previous".
   * Expected:
   * Trang 2 hiển thị tập dòng khác, footer/chỉ số trang cập nhật ("2 / N"); Previous quay lại đúng các dòng trang 1 ban đầu.
   */
  /**
   * The note said an all-time range "cannot be assumed" to exceed one page. It
   * can be established rather than assumed: `gotoAllTime()` opens the ledger
   * from 2020 to today, which holds 88 records across 3 pages on this store.
   */
  test(
    'TC-BH-025 — nút Next/Previous chuyển trang đúng',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.gotoAllTime();
      expect(await batchHistoryPage.pageIndicatorText()).toMatch(/1\s*\/\s*[2-9]/);
      const page1 = await batchHistoryPage.table.rows.allInnerTexts();

      await batchHistoryPage.goToNextPage();
      await batchHistoryPage.waitForReady();
      await expect(batchHistoryPage.pageIndicator).toHaveText(/2\s*\/\s*\d+/);

      // The indicator flips from the URL immediately, while the rows arrive with
      // the next response — reading them straight after the indicator returned
      // page 1's data. The web-first assertion retries until the rows turn over.
      await expect(batchHistoryPage.table.rows).not.toHaveText(page1, {
        useInnerText: true,
      });

      await batchHistoryPage.goToPreviousPage();
      await batchHistoryPage.waitForReady();
      await expect(batchHistoryPage.pageIndicator).toHaveText(/1\s*\/\s*\d+/);
      await expect(batchHistoryPage.table.rows).toHaveText(page1, {
        useInnerText: true,
      });
    },
  );

  test(
    'TC-BH-026 — nút phân trang disable đúng ở trang đầu/cuối',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.previousPageButton).toBeDisabled();

      // Advance to the last available page (works regardless of dataset size).
      for (let i = 0; i < 50; i++) {
        const isDisabled = await batchHistoryPage.nextPageButton.isDisabled();
        if (isDisabled) break;
        await batchHistoryPage.goToNextPage();
      }

      await expect(batchHistoryPage.nextPageButton).toBeDisabled();
      const indicator = await batchHistoryPage.pageIndicatorText();
      expect(indicator).toMatch(/\d+\s*\/\s*\d+/);
    },
  );

  /**
   * Steps:
   * 1. Load tập filter có tổng số đã biết (vd 88 kết quả / 3 trang).
   * 2. Kiểm tra text footer ở trang 1, 2 và trang cuối.
   * Expected:
   * Trang 1 hiển thị "Showing 1 to 30 of 88 results", trang 2 "31 to 60", trang cuối phản ánh đúng phần còn lại (vd "61 to 88"); tổng không bao giờ vượt quá Z.
   */
  /**
   * A known total was treated as a precondition to seed. Mocking the collection
   * supplies one exactly: 88 records, so the footer must read 1–30, 31–60 and
   * 61–88 across three pages. That also pins the arithmetic on the final,
   * partial page, which is where an off-by-one would actually show up.
   */
  test(
    'TC-BH-027 — footer "Showing X to Y of Z results" chính xác qua các trang',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      const total = 88;
      const batches = Array.from({ length: total }, (_, index) =>
        buildMockBatch({ batchNumber: total - index }),
      );
      await page.route('**/volt-pos.**/batches?*', async (route) => {
        await route.fulfill({
          json: buildMockBatchesCollection(
            paginateMockBatches(batches, route.request().url()),
            total,
          ),
        });
      });

      await batchHistoryPage.gotoAllTime();

      const expectedRanges = [
        [1, 30],
        [31, 60],
        [61, 88],
      ];
      for (const [index, [from, to]] of expectedRanges.entries()) {
        if (index > 0) {
          await batchHistoryPage.goToNextPage();
          await batchHistoryPage.waitForReady();
        }
        await expect(batchHistoryPage.paginationSummary).toHaveText(
          new RegExp(`Showing ${from} to ${to} of ${total} results`, 'i'),
        );
        await expect(batchHistoryPage.table.rows).toHaveCount(
          Math.min(BATCHES_PAGE_SIZE, to - from + 1),
        );
      }

      await expect(batchHistoryPage.nextPageButton).toBeDisabled();
    },
  );

  /**
   * Steps:
   * 1. Lọc khoảng có ≤30 kết quả.
   * Expected:
   * Cả Previous và Next đều disable, chỉ số trang hiển thị "1 / 1"; không có trang 2 bị vỡ/thiếu dữ liệu.
   */
  test(
    'TC-BH-028 — phân trang ẩn/disable đúng khi kết quả chỉ có 1 trang',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      // A single short page is the state to test, so serve exactly that rather
      // than hunting for a date range that happens to produce it.
      const batches = Array.from({ length: 5 }, (_, index) =>
        buildMockBatch({ batchNumber: 5 - index }),
      );
      await page.route('**/volt-pos.**/batches?*', async (route) => {
        await route.fulfill({ json: buildMockBatchesCollection(batches) });
      });

      await batchHistoryPage.gotoAllTime();

      await expect(batchHistoryPage.table.rows).toHaveCount(5);
      await expect(batchHistoryPage.pageIndicator).toHaveText(/1\s*\/\s*1/);
      await expect(batchHistoryPage.previousPageButton).toBeDisabled();
      await expect(batchHistoryPage.nextPageButton).toBeDisabled();
      await expect(batchHistoryPage.paginationSummary).toHaveText(/Showing 1 to 5 of 5 results/i);
    },
  );

  /**
   * Steps:
   * 1. Điều hướng tới trang 2 hoặc 3 của kết quả.
   * 2. Đổi filter status hoặc khoảng ngày.
   * Expected:
   * Bảng reset về trang 1 của kết quả đã lọc mới, thay vì hiển thị trang ngoài phạm vi hoặc bảng trống.
   */
  test(
    'TC-BH-029 — đổi filter khi đang ở trang 2+ reset về trang 1',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      // All-time gives the 3 pages this needs (88 records live).
      await batchHistoryPage.gotoAllTime();
      await batchHistoryPage.goToNextPage();
      await batchHistoryPage.waitForReady();
      await expect(batchHistoryPage.pageIndicator).toHaveText(/2\s*\/\s*\d+/);

      await batchHistoryPage.selectStatus('Open');
      await batchHistoryPage.waitForReady();

      // Staying on page 2 of a smaller result set would strand the user on an
      // out-of-range page — an empty table that looks like "no results".
      await expect(batchHistoryPage.pageIndicator).toHaveText(/1\s*\/\s*\d+/);
      expect(batchHistoryPage.currentQueryParams().get('page')).toBe('1');
      await expect(
        batchHistoryPage.table.rows.first().or(batchHistoryPage.emptyState),
      ).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Bấm trực tiếp vào ô BATCH NUMBER và các ô khác trong một dòng.
   * Expected:
   * Không có điều hướng, modal hay drawer nào mở ra — đúng với việc màn hình này không có detail view; không phát sinh lỗi console khi bấm.
   */
  /**
   * This case was written as "the ledger is read-only, so cells do nothing".
   * Live verification disproved the premise: clicking *any* cell of a row opens
   * a "Batch Close Review" dialog listing the orders in that batch. The case is
   * kept under its id and retargeted at the behaviour that exists — every cell
   * is a uniform entry point, the dialog reflects the row it came from, and it
   * dismisses cleanly without touching the URL.
   */
  test(
    'TC-BH-030 — click vào bất kỳ ô nào trong dòng mở dialog "Batch Close Review"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await batchHistoryPage.gotoAllTime();
      const urlBefore = page.url();
      const [batchDate, batchNumber, status, totalPayment, amount] = (
        await batchHistoryPage.table.rows.first().innerText()
      )
        .split('\t')
        .map((cell) => cell.trim());
      void batchDate;

      const CELLS_PER_ROW = 5;
      const cells = batchHistoryPage.table.rows.first().getByRole('cell');
      await expect(cells).toHaveCount(CELLS_PER_ROW);

      for (let index = 0; index < CELLS_PER_ROW; index++) {
        await test.step(`cell ${index} opens the review dialog`, async () => {
          // Re-resolved per iteration: the ledger re-renders between clicks, and
          // a locator captured earlier resolves to a skeleton row that
          // DataTable filters out.
          const cell = batchHistoryPage.table.rows.first().getByRole('cell').nth(index);
          await expect(cell).toBeVisible();
          await cell.click();

          await expect(batchHistoryPage.batchReviewDialog).toBeVisible();
          // The dialog belongs to the row that was clicked, not to some default.
          await expect(batchHistoryPage.batchReviewDialog).toContainText(batchNumber);
          await expect(batchHistoryPage.batchReviewDialog).toContainText(status);

          await batchHistoryPage.batchReviewCloseButton.click();
          await expect(batchHistoryPage.batchReviewDialog).toBeHidden();
        });
      }

      await test.step('the dialog lists the batch orders and carries its totals', async () => {
        await batchHistoryPage.openBatchReview(0);
        await expect(batchHistoryPage.batchReviewDialog).toContainText(totalPayment);
        await expect(batchHistoryPage.batchReviewDialog).toContainText(amount);
        await expect(batchHistoryPage.batchReviewOrderRows.first()).toBeVisible();
        await expect(batchHistoryPage.batchReviewNextButton).toBeVisible();

        // Escape dismisses it too — it is a real dialog, not a page.
        await page.keyboard.press('Escape');
        await expect(batchHistoryPage.batchReviewDialog).toBeHidden();
      });

      // Opening a dialog must not rewrite the ledger's URL state, or Back would
      // take the user somewhere unexpected.
      expect(page.url()).toBe(urlBefore);
      expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
    },
  );
});
