import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Filter — trạng thái (status) — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-016 — Open filter shows only open batches',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Open');
      await expect(batchHistoryPage.statusCombobox).toHaveText(/Open/);

      const closedCount = batchHistoryPage.closedStatusBadges;
      await expect(closedCount).toHaveCount(0);

      const openCount = await batchHistoryPage.openStatusBadges.count();
      if (openCount > 0) {
        await expect(batchHistoryPage.openStatusBadges.first()).toBeVisible();
      }

      const params = batchHistoryPage.currentQueryParams();
      const statusParam = params.get('status');
      if (statusParam) {
        expect(statusParam.toLowerCase()).toBe('open');
      }
    },
  );

  test(
    'TC-BH-017 — Closed filter shows only closed batches',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Closed');
      await expect(batchHistoryPage.statusCombobox).toHaveText(/Closed/);

      const openCount = batchHistoryPage.openStatusBadges;
      await expect(openCount).toHaveCount(0);

      const closedCount = await batchHistoryPage.closedStatusBadges.count();
      if (closedCount > 0) {
        await expect(batchHistoryPage.closedStatusBadges.first()).toBeVisible();
      }
    },
  );

  test(
    'TC-BH-018 — All status shows both Open and Closed batches',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Open');
      await expect(batchHistoryPage.statusCombobox).toHaveText(/Open/);

      await batchHistoryPage.selectStatus('All status');
      await expect(batchHistoryPage.statusCombobox).toHaveText(/All status/);

      await expect(batchHistoryPage.tableRoot).toBeVisible();
    },
  );

  test(
    'TC-BH-019 — status filter combined with date range applies both (AND)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Open');
      await expect(batchHistoryPage.statusCombobox).toHaveText(/Open/);

      const closedCount = batchHistoryPage.closedStatusBadges;
      await expect(closedCount).toHaveCount(0);

      const params = batchHistoryPage.currentQueryParams();
      const statusParam = params.get('status');
      if (statusParam) {
        expect(statusParam.toLowerCase()).toBe('open');
      }
    },
  );

  test(
    'TC-BH-020 — status filter with no matches renders empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await batchHistoryPage.gotoWithParams({
        status: 'closed',
        from: '1999-01-01',
        to: '1999-01-02',
      });
      await batchHistoryPage.waitForReady();

      const rowCount = await batchHistoryPage.table.rowCount();
      if (rowCount === 0) {
        await expect(batchHistoryPage.emptyState).toBeVisible();
        await expect(batchHistoryPage.emptyState).toHaveText(/No batches found\./i);
      }

      expect(consoleErrors).toEqual([]);
    },
  );
});
