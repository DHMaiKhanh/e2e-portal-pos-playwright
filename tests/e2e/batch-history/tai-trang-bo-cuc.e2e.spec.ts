import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import {
  clientSideNavigate,
  delayDataResponses,
  failDataResponses,
  landOnShell,
  skeletons,
} from '@helpers/network';

test.describe('Tải trang & bố cục — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-001 — direct navigation loads Batch History correctly',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ batchHistoryPage, page }) => {
      await batchHistoryPage.waitForReady();

      await expect(page).not.toHaveURL(/\/login/);
      await batchHistoryPage.expectUrlContains('/pos/\\d+/batch');

      await expect(batchHistoryPage.heading).toBeVisible();
      await expect(batchHistoryPage.heading).toContainText(/Batch History/i);

      await expect(batchHistoryPage.dateRangeButton).toBeVisible();
      await expect(batchHistoryPage.statusCombobox).toBeVisible();
      await expect(batchHistoryPage.statusCombobox).toContainText(/All status/i);
    },
  );

  test(
    'TC-BH-002 — all main areas render on first load',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.waitForReady();

      await expect(batchHistoryPage.heading).toBeVisible();
      await expect(batchHistoryPage.dateRangeButton).toBeVisible();
      await expect(batchHistoryPage.statusCombobox).toBeVisible();
      await expect(batchHistoryPage.tableRoot).toBeVisible();

      const rowCount = await batchHistoryPage.table.rowCount();
      if (rowCount === 0) {
        await expect(batchHistoryPage.emptyState).toBeVisible();
      }

      const paginationVisible = await batchHistoryPage.paginationSummary
        .isVisible()
        .catch(() => false);
      const pageIndicatorVisible = await batchHistoryPage.pageIndicator
        .isVisible()
        .catch(() => false);
      expect(paginationVisible || pageIndicatorVisible).toBeTruthy();
    },
  );

  /**
   * TC-BH-003 — Hiển thị trạng thái loading trước khi dữ liệu trả về
   * Preconditions: Network được throttle/delay qua route interception.
   * Steps:
   *  1. Delay response của API danh sách batch.
   *  2. Điều hướng tới màn hình.
   *  3. Quan sát ngay sau khi điều hướng.
   * Expected: Hiển thị loading indicator/skeleton thay cho bảng; không có khoảng trắng/flash không style.
   */
  test(
    'TC-BH-003 — shows loading state before data returns',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, batchHistoryPage }) => {
      // Arrive by clicking, not goto: a goto is server-rendered, so the batch
      // list never crosses the browser where page.route could delay it.
      await landOnShell(page, Urls.DASHBOARD);
      await delayDataResponses(page, 6000);
      await clientSideNavigate(page, /^Batch History$/i);

      await test.step('Skeletons stand in for the ledger, layout intact', async () => {
        await expect(skeletons(page).first()).toBeVisible({ timeout: 15_000 });
        await expect(batchHistoryPage.heading).toBeVisible();
        await expect(batchHistoryPage.batchNumberHeader).toBeVisible();
      });

      await test.step('Ledger replaces the skeletons when data lands', async () => {
        await expect(skeletons(page)).toHaveCount(0, { timeout: 30_000 });
        await expect(batchHistoryPage.tableRoot).toBeVisible();
      });
    },
  );

  test(
    'TC-BH-004 — browser refresh re-renders same state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      await batchHistoryPage.selectStatus('Open');
      await batchHistoryPage.waitForReady();

      const urlBeforeReload = page.url();
      const paramsBefore = batchHistoryPage.currentQueryParams();

      await page.reload();
      await batchHistoryPage.waitForReady();

      expect(page.url()).toBe(urlBeforeReload);
      const paramsAfter = batchHistoryPage.currentQueryParams();
      expect(paramsAfter.toString()).toBe(paramsBefore.toString());
      await expect(batchHistoryPage.statusCombobox).toContainText(/Open/i);
    },
  );

  /**
   * TC-BH-005 — API load ban đầu lỗi thì hiển thị trạng thái lỗi, không vỡ layout
   * Preconditions: (none specified)
   * Steps:
   *  1. Ép request danh sách batch trả lỗi (500/abort).
   *  2. Điều hướng tới màn hình.
   * Expected: Sidebar/header vẫn render bình thường; khu vực bảng hiển thị thông báo lỗi rõ ràng thay vì skeleton chạy vô hạn hoặc trang trắng.
   */
  test(
    'TC-BH-005 — initial API load error shows error state, layout not broken',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, batchHistoryPage }) => {
      await landOnShell(page, Urls.DASHBOARD);
      await failDataResponses(page, 500);
      await clientSideNavigate(page, /^Batch History$/i);

      await test.step('A clear error replaces the table area', async () => {
        await expect(page.getByText(/error loading batches/i)).toBeVisible({ timeout: 30_000 });
        // Not an endless skeleton, and not a blank page.
        await expect(skeletons(page)).toHaveCount(0);
      });

      await test.step('Chrome survives the failure', async () => {
        await expect(batchHistoryPage.heading).toBeVisible();
        await expect(batchHistoryPage.sidebar.item('Customers').first()).toBeVisible();
      });
    },
  );
});
