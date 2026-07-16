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
      // Apply a non-default status filter.
      await batchHistoryPage.selectStatus('Closed');
      await expect(batchHistoryPage.clearFiltersButton).toBeVisible();

      // Click Clear filters.
      await batchHistoryPage.clearFilters();

      // Status resets back to "All status" and Clear filters disappears.
      await expect(batchHistoryPage.statusCombobox).toHaveText(/All status/i);
      expect(await batchHistoryPage.isClearFiltersVisible()).toBeFalsy();
    },
  );
});
