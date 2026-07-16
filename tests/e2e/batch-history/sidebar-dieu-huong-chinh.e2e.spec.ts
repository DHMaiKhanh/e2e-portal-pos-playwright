import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Sidebar / điều hướng chính — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-006 — link "Batch History" trên sidebar điều hướng đúng và highlight active',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, batchHistoryPage, page }) => {
      // Start from a different screen, then navigate to Batch History via sidebar.
      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/batch$/);

      await expect(page).toHaveURL(/\/pos\/\d+\/batch(\?.*)?$/);
      await expect(batchHistoryPage.heading).toBeVisible();

      const batchLink = dashboardPage.sidebar.item(/Batch History/i).first();
      await expect(batchLink).toBeVisible();
      const ariaCurrent = await batchLink.getAttribute('aria-current');
      const className = (await batchLink.getAttribute('class')) ?? '';
      const isHighlighted =
        ariaCurrent === 'page' ||
        ariaCurrent === 'true' ||
        /active|selected|current/i.test(className);
      expect(
        isHighlighted,
        'Batch History sidebar link should show an active/highlight state',
      ).toBeTruthy();

      const overviewLink = dashboardPage.sidebar.item('Overview').first();
      const overviewAriaCurrent = await overviewLink.getAttribute('aria-current');
      const overviewClassName = (await overviewLink.getAttribute('class')) ?? '';
      const overviewHighlighted =
        overviewAriaCurrent === 'page' ||
        overviewAriaCurrent === 'true' ||
        /active|selected|current/i.test(overviewClassName);
      expect(
        overviewHighlighted,
        'Other sidebar items (e.g. Overview) should be inactive while on Batch History',
      ).toBeFalsy();
    },
  );

  test(
    'TC-BH-007 — trạng thái active vẫn giữ nguyên sau khi reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      await expect(page).toHaveURL(/\/pos\/\d+\/batch(\?.*)?$/);

      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/pos\/\d+\/batch(\?.*)?$/);
      const batchLink = dashboardPage.sidebar.item(/Batch History/i).first();
      await expect(batchLink).toBeVisible();
      const ariaCurrent = await batchLink.getAttribute('aria-current');
      const className = (await batchLink.getAttribute('class')) ?? '';
      const isHighlighted =
        ariaCurrent === 'page' ||
        ariaCurrent === 'true' ||
        /active|selected|current/i.test(className);
      expect(
        isHighlighted,
        'Batch History sidebar link should remain highlighted after reload',
      ).toBeTruthy();
    },
  );

  test(
    'TC-BH-008 — nút Back/Forward của trình duyệt khôi phục đúng trạng thái filter',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      // Apply status=Open filter.
      await batchHistoryPage.selectStatus('Open');
      await batchHistoryPage.waitForReady();
      const paramsAfterOpen = batchHistoryPage.currentQueryParams();
      expect(paramsAfterOpen.get('status')).toBe('Open');

      // Change to Closed to create a second history entry with different params.
      await batchHistoryPage.selectStatus('Closed');
      await batchHistoryPage.waitForReady();
      const paramsAfterClosed = batchHistoryPage.currentQueryParams();
      expect(paramsAfterClosed.get('status')).toBe('Closed');

      // Back should restore the Open state.
      await page.goBack();
      await batchHistoryPage.waitForReady();
      const paramsAfterBack = batchHistoryPage.currentQueryParams();
      expect(paramsAfterBack.get('status')).toBe('Open');

      // Forward should re-apply the Closed state — not a stale/empty table.
      await page.goForward();
      await batchHistoryPage.waitForReady();
      const paramsAfterForward = batchHistoryPage.currentQueryParams();
      expect(paramsAfterForward.get('status')).toBe('Closed');
      await expect(batchHistoryPage.tableRoot).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Ở Batch History, bấm nút thu gọn sidebar.
   * Expected:
   * Sidebar thu gọn về dạng chỉ icon; nội dung chính reflow lại; bấm lần nữa
   * khôi phục về trạng thái mở rộng, "Batch History" vẫn được highlight.
   */
  // TODO(manual/setup): sidebar collapse toggle control/selector is not documented
  // or exposed on the Sidebar component/page object; needs live verification to
  // identify a stable locator before automating.
  test.fixme(
    'TC-BH-009 — nút thu gọn sidebar hoạt động đúng trên màn hình này',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
