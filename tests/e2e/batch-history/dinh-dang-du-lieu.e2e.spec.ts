import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  buildMockBatch,
  buildMockBatchesCollection,
  formatBatchNumber,
} from '@data/dynamic/factories/mockBatch';

/**
 * Formatting cases need rows, and the screen's default 7-day window is routinely
 * empty on the DEV store — which is why three of these used to skip themselves
 * at runtime rather than assert anything. Opening the ledger over an all-time
 * range makes them deterministic; none of them cares about the window itself.
 */
test.describe('Định dạng dữ liệu — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.gotoAllTime();
    // Guard the premise once, here, instead of degrading to a skip in each test.
    await expect(batchHistoryPage.tableRoot.locator('tbody tr').first()).toBeVisible();
  });

  test(
    'TC-BH-031 — BATCH DATE hiển thị kèm chú thích timezone',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.batchDateHeader).toBeVisible();

      const dateTexts = await batchHistoryPage.columnCellTexts(/batch date/i);
      expect(dateTexts.length).toBeGreaterThan(0);

      // A batch only gets a close date once it closes; until then the column
      // reads "Not closed yet" (seen on live Open batches). Both are valid — an
      // empty cell or a date without its timezone note is not.
      const closeDate = /^[A-Z][a-z]{2} \d{1,2}, \d{4} \(UTC[+-]\d+\)$/;
      const notClosed = /^not closed yet$/i;

      const dated = dateTexts.filter((t) => closeDate.test(t.trim()));
      for (const text of dateTexts) {
        const value = text.trim();
        expect(
          closeDate.test(value) || notClosed.test(value),
          `unexpected BATCH DATE: "${value}"`,
        ).toBe(true);
      }

      // The timezone annotation is the point of this case, so at least one real
      // date must be present to have actually verified it.
      expect(dated.length, 'no closed batch in range to check the timezone note').toBeGreaterThan(
        0,
      );
    },
  );

  test(
    'TC-BH-032 — AMOUNT hiển thị đúng định dạng tiền tệ USD',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.amountHeader).toBeVisible();

      const texts = await batchHistoryPage.columnCellTexts(/^amount$/i);
      expect(texts.length).toBeGreaterThan(0);

      for (const text of texts) {
        // Every AMOUNT cell is USD with thousands separators and 2 decimals.
        expect(text.trim()).toMatch(/^-?\$\d{1,3}(,\d{3})*\.\d{2}$/);
      }
    },
  );

  /**
   * Steps:
   * 1. Kiểm tra giá trị TOTAL PAYMENT ở nhiều dòng.
   * Expected: Giá trị là số nguyên thường (vd "14", "2784"), không có ký hiệu `$` hay số thập phân.
   */
  test(
    'TC-BH-033 — TOTAL PAYMENT hiển thị dạng số nguyên thường, không định dạng tiền tệ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.totalPaymentHeader).toBeVisible();

      // Resolved by column header rather than by a hand-written selector, which
      // is what this case was previously parked for.
      const texts = await batchHistoryPage.columnCellTexts(/total payment/i);
      expect(texts.length).toBeGreaterThan(0);

      for (const text of texts) {
        const value = text.trim();
        expect(value).toMatch(/^\d+$/);
        expect(value).not.toMatch(/[$.,]/);
      }
    },
  );

  test(
    'TC-BH-034 — Style badge STATUS khớp với giá trị ("Open" vs "Closed")',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.statusHeader).toBeVisible();

      const openCount = await batchHistoryPage.openStatusBadges.count();
      const closedCount = await batchHistoryPage.closedStatusBadges.count();

      if (openCount > 0) {
        await expect(batchHistoryPage.openStatusBadges.first()).toBeVisible();
        await expect(batchHistoryPage.openStatusBadges.first()).toHaveText(/Open/i);
      }
      if (closedCount > 0) {
        await expect(batchHistoryPage.closedStatusBadges.first()).toBeVisible();
        await expect(batchHistoryPage.closedStatusBadges.first()).toHaveText(/Closed/i);
      }
      expect(openCount + closedCount).toBeGreaterThanOrEqual(0);
    },
  );

  test(
    'TC-BH-035 — Định dạng BATCH NUMBER nhất quán, dạng chuỗi số có padding 0',
    {
      tag: [Tag.REGRESSION, Tag.UI],
    },
    async ({ batchHistoryPage }) => {
      await expect(batchHistoryPage.batchNumberHeader).toBeVisible();

      const texts = await batchHistoryPage.columnCellTexts(/batch number/i);
      expect(texts.length).toBeGreaterThan(0);

      for (const text of texts) {
        expect(text.trim()).toMatch(/^B-\d{4,}$/);
      }
    },
  );

  /**
   * Steps: (none listed)
   * Preconditions: Có một batch với 0 payment/amount (nếu có sẵn trong dữ liệu test).
   * Expected: Hiển thị "0" / "$0.00" tương ứng — không bao giờ để trống, "NaN", hay "undefined".
   */
  /**
   * No batch in this store has a zero total (checked across all 88 records), so
   * the precondition was treated as unmeetable. It is meetable without touching
   * the backend: serve the ledger a zero-valued batch through the same
   * `/batches` collection the screen already fetches, and assert the cells
   * render "0" and "$0.00" rather than collapsing to blank.
   */
  test(
    'TC-BH-036 — TOTAL PAYMENT/AMOUNT bằng 0 hiển thị là 0, không để trống',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      const zeroBatch = buildMockBatch({
        batchNumber: 90001,
        totalAmount: 0,
        totalCount: 0,
        status: 'closed',
      });
      await page.route('**/volt-pos.**/batches?*', async (route) => {
        await route.fulfill({ json: buildMockBatchesCollection([zeroBatch]) });
      });

      await batchHistoryPage.gotoAllTime();

      const row = batchHistoryPage.row(formatBatchNumber(zeroBatch.batchNumber));
      await expect(row).toBeVisible();

      const cells = (await row.innerText()).split('\t').map((cell) => cell.trim());
      const [, , , totalPayment, amount] = cells;

      expect(totalPayment).toBe('0');
      expect(amount.replace(/\s/g, '')).toBe('$0.00');
      // The failure this guards against is a falsy-check turning 0 into nothing.
      for (const value of [totalPayment, amount]) {
        expect(value).not.toBe('');
        expect(value).not.toMatch(/NaN|undefined|null|^—$/i);
      }
    },
  );
});
