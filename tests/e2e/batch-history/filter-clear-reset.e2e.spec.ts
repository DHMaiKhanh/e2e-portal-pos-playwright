import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Filter — clear/reset — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-021 — "Clear filters" chỉ xuất hiện khi filter khác mặc định',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      // Default filters: Clear filters should not be visible.
      expect(await batchHistoryPage.isClearFiltersVisible()).toBeFalsy();

      // Change status away from default -> Clear filters should appear.
      await batchHistoryPage.selectStatus('Closed');
      await expect(batchHistoryPage.clearFiltersButton).toBeVisible();
    },
  );

  test(
    'TC-BH-022 — "Clear filters" reset về khoảng ngày và status mặc định',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      const defaultRange = (await batchHistoryPage.dateRangeButton.innerText()).trim();

      // Apply a non-default date range and status filter.
      await batchHistoryPage.gotoWithParams({
        page: '1',
        status: 'all',
        dateAfter: '2026-08-01',
        dateBefore: '2026-08-21',
      });
      await expect(batchHistoryPage.dateRangeButton).not.toHaveText(defaultRange);
      await batchHistoryPage.selectStatus('Closed');
      await expect(batchHistoryPage.clearFiltersButton).toBeVisible();

      // Click Clear filters.
      await batchHistoryPage.clearFilters();

      // Status chip resets to unset ("all") and Clear filters disappears.
      await expect(batchHistoryPage.statusFilter).toHaveAccessibleName(/^status$/i);
      expect(batchHistoryPage.currentQueryParams().get('status') ?? 'all').toBe('all');
      await expect(batchHistoryPage.dateRangeButton).toHaveText(defaultRange);
      await expect(batchHistoryPage.clearFiltersButton).toBeHidden();
    },
  );
});
