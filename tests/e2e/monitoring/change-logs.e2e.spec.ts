import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Monitoring › Change Logs is an Internal/admin screen and is NOT store-scoped:
 * the route is `/pos/nail/admin/histories`, so nothing here may hardcode or
 * expect `/pos/<id>/`.
 *
 * Expectations are taken from the manual QA sweep in docs 20-monitoring.md: the
 * system-wide entity-history feed (hundreds of thousands of entries, ~323,668
 * grouped by day under "Today"), with filters Merchant / Entity type / Operation
 * / Channel / time and pagination (1 / 10,789). A row expands to a Field / Before
 * / After detail. It is a read-only audit log — there is nothing to mutate, so no
 * write-guard is needed.
 *
 * Note: the footer counts *entries*, while visible rows are grouped changes, so
 * the entry count is deliberately not asserted equal to the row count.
 */
test.describe('Tải trang & bố cục (Page load / Layout) — Change Logs', () => {
  test.beforeEach(async ({ changeLogsPage }) => {
    await changeLogsPage.goto();
  });

  /**
   * TC-CHL-001 — direct navigation renders the change-log feed, no login
   * redirect.
   */
  test(
    'TC-CHL-001 — direct navigation renders the change-log feed, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ changeLogsPage, page }) => {
      await changeLogsPage.waitForReady();

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/histories/);
      await expect(changeLogsPage.pageHeader.first()).toBeVisible();
      await expect(changeLogsPage.entries.first()).toBeVisible();
    },
  );

  /**
   * TC-CHL-002 — the toolbar exposes the Merchant / Entity type / Operation
   * filters.
   */
  test(
    'TC-CHL-002 — toolbar exposes the Merchant / Entity type / Operation filters',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ changeLogsPage }) => {
      await changeLogsPage.waitForReady();

      await expect(changeLogsPage.merchantFilter).toBeVisible();
      await expect(changeLogsPage.entityTypeFilter).toBeVisible();
      await expect(changeLogsPage.operationFilter).toBeVisible();
    },
  );

  /**
   * TC-CHL-003 — the results footer reports a total entry count.
   *
   * Tolerant: the feed is huge in practice, but this only asserts the parsed
   * total is a real number ≥ 0 (never NaN) rather than freezing a figure that
   * grows every day. Skips when there are no rows (the footer is not rendered).
   */
  test(
    'TC-CHL-003 — the results footer reports a total entry count',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ changeLogsPage }) => {
      await changeLogsPage.waitForReady();
      const rows = await changeLogsPage.entries.count();
      test.skip(rows === 0, 'no change-log entries to count');

      await expect(changeLogsPage.resultsFooter.first()).toBeVisible();
      const total = await changeLogsPage.totalEntries();
      expect(Number.isNaN(total), 'total entry count should parse').toBe(false);
      expect(total).toBeGreaterThanOrEqual(0);
    },
  );

  /**
   * TC-CHL-004 — pagination is present when the feed has rows.
   *
   * Skips when the feed is empty — pagination is not rendered with zero rows.
   */
  test(
    'TC-CHL-004 — pagination is present when the feed has rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ changeLogsPage }) => {
      await changeLogsPage.waitForReady();
      const rows = await changeLogsPage.entries.count();
      test.skip(rows === 0, 'no change-log entries, pagination is not rendered');

      await expect(changeLogsPage.pagination.nextButton.first()).toBeVisible();
    },
  );
});
