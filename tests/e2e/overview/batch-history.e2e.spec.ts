import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Batch history (last 7 days)" card: a table (Date /
 * Batch # / Amount / Status) or the "No batches yet" empty state, and a
 * "View all" link to the Batches ledger. Row values match FORMAT, not live data.
 */
test.describe('Batch History — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-111 — renders the Batch history section (7-day scope) with a table or empty state',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.batchHistorySection).toBeVisible();
      await expect(dashboardPage.batchHistorySection).toContainText(/last 7 days/i);
      await expect(
        dashboardPage.batchHistoryTable.or(dashboardPage.batchEmptyState).first(),
      ).toBeVisible();
    },
  );

  test(
    'TC-OVW-112 — the table shows Date, Batch #, Amount, Status columns with formatted rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.batchHistoryTable).toBeVisible();
      const headers = await dashboardPage.batchHistoryTable
        .getByRole('columnheader')
        .allInnerTexts();
      expect(headers.map((h) => h.trim())).toEqual(['Date', 'Batch #', 'Amount', 'Status']);

      const rows = await dashboardPage.batchRows.allInnerTexts();
      expect(rows.length, 'no batch in the last 7 days on DEV').toBeGreaterThan(0);
      for (const row of rows) {
        const [date, batch, amount, status] = row.split('\t').map((c) => c.trim());
        expect(date).toMatch(/^([A-Z][a-z]{2} \d{1,2}, \d{4}|Not closed yet)$/);
        expect(batch).toMatch(/^B-\d{5,}$/);
        expect(amount).toMatch(/^\$\d{1,3}(,\d{3})*\.\d{2}$/);
        expect(status).toMatch(/^(Open|Closed)$/);
      }
    },
  );

  test(
    'TC-OVW-115 — "View all" navigates to the batch page /pos/<id>/batch',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await dashboardPage.batchViewAllLink.click();
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/batch/);
      await expect(page.getByRole('heading', { level: 1, name: 'Batches' })).toBeVisible();
    },
  );
});
