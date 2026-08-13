import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  clientSideNavigate,
  delayDataResponses,
  expireSessionResponses,
  landOnShell,
  skeletons,
} from '@helpers/network';

test.describe('Trường hợp tiêu cực & biên — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-037 — empty state renders correctly, no console errors',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Apply a date range / status combo unlikely to have any results.
      await batchHistoryPage.gotoWithParams({
        dateAfter: '2000-01-01',
        dateBefore: '2000-01-02',
        status: 'Open',
      });
      await batchHistoryPage.waitForReady();

      await expect(batchHistoryPage.emptyState).toBeVisible();
      await expect(batchHistoryPage.emptyState).toContainText(/No batches found\.?/i);
      await expect(page.getByText(/Showing 0 to 0 of 0 results/i)).toBeVisible();
      expect(consoleErrors).toEqual([]);
    },
  );

  test(
    'TC-BH-038 — invalid/malformed date query params handled safely',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      await batchHistoryPage.gotoWithParams({
        dateAfter: 'not-a-date',
        dateBefore: '2026-07-15',
      });
      await batchHistoryPage.waitForReady();

      // App should not crash: heading/table should still be present, no unhandled exception overlay.
      await expect(batchHistoryPage.heading).toBeVisible();
      await expect(batchHistoryPage.tableRoot).toBeVisible();
    },
  );

  test(
    'TC-BH-039 — invalid status query param falls back to "All status"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.gotoWithParams({ status: 'bogus' });
      await batchHistoryPage.waitForReady();

      await expect(batchHistoryPage.heading).toBeVisible();
      await expect(batchHistoryPage.tableRoot).toBeVisible();
      // Combobox should fall back to "All status" rather than showing the bogus value.
      await expect(batchHistoryPage.statusCombobox).not.toContainText('bogus');
    },
  );

  /**
   * Steps:
   * 1. Delay response danh sách batch 8–10 giây.
   * 2. Quan sát màn hình trong lúc chờ.
   * Expected:
   * Loading indicator hiển thị xuyên suốt; trang vẫn phản hồi được (sidebar/filter vẫn thao tác được nếu áp dụng); nội dung render đầy đủ khi response delay trả về.
   */
  test(
    'TC-BH-040 — slow API shows loading state, UI not stuck',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ page, batchHistoryPage }) => {
      await test.step('Reach Batch History over a deliberately slow API', async () => {
        await landOnShell(page, Urls.DASHBOARD);
        await delayDataResponses(page, 8000);
        await clientSideNavigate(page, /^Batch History$/i);
      });

      await test.step('Loading placeholders are shown while waiting', async () => {
        await expect(skeletons(page).first()).toBeVisible({ timeout: 15_000 });
        // The chrome stays interactive rather than blocking behind the fetch:
        // heading and filter bar are usable while the ledger is still loading.
        await expect(batchHistoryPage.heading).toBeVisible();
        await expect(batchHistoryPage.dateRangeButton.first()).toBeEnabled();
      });

      await test.step('Content resolves once the slow response lands', async () => {
        await expect(skeletons(page)).toHaveCount(0, { timeout: 30_000 });
        await expect(batchHistoryPage.tableRoot).toBeVisible();
      });
    },
  );

  /**
   * Steps:
   * 1. Intercept request danh sách batch và để nó treo vô thời hạn.
   * Expected:
   * Sau một khoảng timeout hợp lý, hiển thị trạng thái lỗi/retry thay vì spinner chạy vô hạn.
   */
  // Product gap, measured on 2026-08-12 by holding the batch list response open for
  // 60s: the skeleton stays up at 3s, 10s, 20s and 35s with no error text, no retry
  // control and no client-side timeout — exactly the "spinner chạy vô hạn" the case
  // is written to rule out. A failed request *is* handled (see TC-BH-005, which
  // asserts the 500 error state); a request that never answers is not.
  // Re-enable once the batch list fetch has a timeout.
  test.fixme(
    'TC-BH-041 — request timeout/no response shows error with retry button',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * Steps:
   * 1. Load màn hình thành công.
   * 2. Vô hiệu hóa session token.
   * 3. Đổi một filter (kích hoạt API call mới).
   * Expected:
   * App phát hiện lỗi 401 và redirect về `/login` (hoặc hiển thị thông báo hết hạn session); không để lại trạng thái UI bị lỗi.
   *
   * Isolated: the app may drop its session cookie on the way to /login, which in
   * the worker-shared context would sign out every later test on this worker.
   */
  test(
    'TC-BH-042 — expired session mid-flow redirects to login',
    { tag: [Tag.REGRESSION] },
    async ({ isolatedPage }) => {
      await landOnShell(isolatedPage, Urls.BATCH_HISTORY);

      await expireSessionResponses(isolatedPage);
      await clientSideNavigate(isolatedPage, /^Orders$/i);

      await expect(isolatedPage).toHaveURL(/\/login/, { timeout: 20_000 });
      // Bounced cleanly — no half-rendered ledger left behind.
      await expect(isolatedPage.locator('tbody tr')).toHaveCount(0);
    },
  );

  /**
   * Steps:
   * 1. Chọn khoảng ngày rộng nhất có thể (vd 2020-01-01 tới hôm nay).
   * 2. Duyệt qua tất cả các trang kết quả.
   * Expected:
   * Tất cả các trang load không bị timeout/đứng UI; tổng số và số lượng mỗi trang nhất quán; không có dòng trùng lặp hoặc thiếu giữa các trang.
   */
  test(
    'TC-BH-043 — large all-time date range loads and paginates without errors',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ batchHistoryPage }) => {
      const today = new Date().toISOString().slice(0, 10);

      await batchHistoryPage.gotoWithParams({
        dateAfter: '2020-01-01',
        dateBefore: today,
        status: 'all',
      });

      const summary = await batchHistoryPage.paginationSummaryText();
      const total = Number(summary.match(/of\s+([\d,]+)\s+results/i)?.[1].replace(/,/g, '') ?? '0');
      const totalPages = Number(
        (await batchHistoryPage.pageIndicatorText()).split('/')[1]?.trim() ?? '1',
      );

      // Walk every page, capped so a store that grows later cannot turn this into
      // a multi-minute test. The cap is reported rather than silently applied.
      const maxPages = Math.min(totalPages, 5);
      if (totalPages > maxPages) {
        // eslint-disable-next-line no-console
        console.log(`TC-BH-043: walking ${maxPages} of ${totalPages} pages (capped)`);
      }

      const seen = new Set<string>();
      let counted = 0;

      const firstRow = batchHistoryPage.tableRoot.locator('tbody tr').first();

      for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
        await expect(batchHistoryPage.pageIndicator).toHaveText(new RegExp(`^\\s*${pageNo}\\s*/`), {
          timeout: Timeouts.MEDIUM,
        });
        await batchHistoryPage.waitForReady();
        await expect(batchHistoryPage.tableRoot).toBeVisible();

        const rows = (await batchHistoryPage.tableRoot.locator('tbody tr').allInnerTexts())
          .map((t) => t.replace(/\s+/g, ' ').trim())
          .filter((t) => t && !/no batches found/i.test(t));

        for (const row of rows) {
          // No row may repeat across pages.
          expect(seen.has(row), `duplicate row on page ${pageNo}: ${row}`).toBe(false);
          seen.add(row);
        }
        counted += rows.length;

        if (pageNo < maxPages) {
          // The table keeps the previous page mounted while the next one is
          // fetched — no skeleton, and the page indicator flips straight away —
          // so the only reliable "the new page has arrived" signal is the first
          // row's contents changing.
          const staleFirstRow = (await firstRow.innerText()).replace(/\s+/g, ' ').trim();
          await batchHistoryPage.goToNextPage();
          await expect
            .poll(async () => (await firstRow.innerText()).replace(/\s+/g, ' ').trim(), {
              timeout: Timeouts.MEDIUM,
            })
            .not.toBe(staleFirstRow);
        }
      }

      // Page contents add up to the advertised total (when not capped).
      if (maxPages === totalPages) expect(counted).toBe(total);
      else expect(counted).toBeLessThanOrEqual(total);
    },
  );
});
