import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * The status filter is a chip (aria-label "Status" unset / "Status: Open" set)
 * since the 2026-10-13 redesign. The default 7-day window often holds no open
 * batch on DEV, so the filter cases run over all-time (both kinds present) or
 * over the pinned data-bearing range 2026-08-01..2026-08-21.
 */
test.describe('Filter — trạng thái (status) — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.gotoAllTime();
  });

  test(
    'TC-BH-016 — Open filter shows only open batches',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Open');
      await batchHistoryPage.waitForReady();
      await expect(batchHistoryPage.statusFilter).toHaveAccessibleName(/status: open/i);
      expect(batchHistoryPage.currentQueryParams().get('status')).toBe('open');

      await expect(batchHistoryPage.closedStatusBadges).toHaveCount(0);
      await expect(batchHistoryPage.openStatusBadges.first()).toBeVisible();
      await expect(batchHistoryPage.openStatusBadges).toHaveCount(
        await batchHistoryPage.table.rowCount(),
      );
    },
  );

  test(
    'TC-BH-017 — Closed filter shows only closed batches',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Closed');
      await batchHistoryPage.waitForReady();
      await expect(batchHistoryPage.statusFilter).toHaveAccessibleName(/status: closed/i);
      expect(batchHistoryPage.currentQueryParams().get('status')).toBe('closed');

      await expect(batchHistoryPage.openStatusBadges).toHaveCount(0);
      await expect(batchHistoryPage.closedStatusBadges.first()).toBeVisible();
      await expect(batchHistoryPage.closedStatusBadges).toHaveCount(
        await batchHistoryPage.table.rowCount(),
      );
    },
  );

  test(
    'TC-BH-018 — All status shows both Open and Closed batches',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      const allTotal = await batchHistoryPage.totalResults();

      await batchHistoryPage.selectStatus('Open');
      await batchHistoryPage.waitForReady();
      await expect(batchHistoryPage.statusFilter).toHaveAccessibleName(/status: open/i);

      // Back to "all" = clearing the chip.
      await batchHistoryPage.selectStatus('All statuses');
      await batchHistoryPage.waitForReady();
      await expect(batchHistoryPage.statusFilter).toHaveAccessibleName(/^status$/i);
      expect(batchHistoryPage.currentQueryParams().get('status') ?? 'all').toBe('all');

      await expect(batchHistoryPage.openStatusBadges.first()).toBeVisible();
      await expect(batchHistoryPage.closedStatusBadges.first()).toBeVisible();
      await expect.poll(() => batchHistoryPage.totalResults()).toBe(allTotal);
    },
  );

  test(
    'TC-BH-019 — status filter combined with date range applies both (AND)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await batchHistoryPage.selectStatus('Closed');
      await batchHistoryPage.waitForReady();
      const closedAllTime = await batchHistoryPage.totalResults();

      // Pinned data-bearing window: 2026-08-01..2026-08-21.
      await batchHistoryPage.gotoWithParams({
        page: '1',
        status: 'closed',
        dateAfter: '2026-08-01',
        dateBefore: '2026-08-21',
      });
      await expect(batchHistoryPage.statusFilter).toHaveAccessibleName(/status: closed/i);

      const rows = await batchHistoryPage.table.rowCount();
      expect(rows, 'no closed batch in 2026-08-01..21 on DEV').toBeGreaterThan(0);
      expect(await batchHistoryPage.totalResults()).toBeLessThan(closedAllTime);
      await expect(batchHistoryPage.openStatusBadges).toHaveCount(0);

      for (const date of await batchHistoryPage.columnCellTexts(/batch date/i)) {
        const day = Number(date.match(/^Aug (\d{1,2}), 2026/)?.[1] ?? NaN);
        expect(day, `batch date "${date}" outside Aug 1–21, 2026`).toBeGreaterThanOrEqual(1);
        expect(day, `batch date "${date}" outside Aug 1–21, 2026`).toBeLessThanOrEqual(21);
      }
    },
  );

  test(
    'TC-BH-020 — status filter with no matches renders empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await batchHistoryPage.gotoWithParams({
        status: 'closed',
        dateAfter: '1999-01-01',
        dateBefore: '1999-01-02',
      });

      await expect(batchHistoryPage.table.rows).toHaveCount(0);
      await expect(batchHistoryPage.emptyState).toBeVisible();
      await expect(batchHistoryPage.statusFilter).toHaveAccessibleName(/status: closed/i);
      expect(consoleErrors).toEqual([]);
    },
  );
});
