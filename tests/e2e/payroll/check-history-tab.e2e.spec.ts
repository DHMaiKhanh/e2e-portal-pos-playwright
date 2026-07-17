import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Check History tab — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
    await payrollPage.goToCheckHistoryTab();
  });

  test(
    'TC-PAY-100 — Check History table lists all past checks with date-only timestamps',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      const table = page.getByRole('table').first();
      await expect(table).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /staff name/i })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /created at/i })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /check/i })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /memo/i })).toBeVisible();

      const firstRowText = await payrollPage.checkHistoryTable.rows.first().innerText();
      // Date-only format, e.g. "Jan 5, 2026" — no time-of-day component.
      expect(firstRowText).toMatch(/[A-Za-z]{3}\s+\d{1,2},\s+\d{4}/);
      expect(firstRowText).not.toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    },
  );

  test(
    'TC-PAY-101 — Pagination across multiple pages of check history',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.paginationSummary).toBeVisible();
      await expect(payrollPage.paginationSummary).toHaveText(/Showing \d+ to \d+ of \d+ results/);
      await expect(payrollPage.pageIndicator).toHaveText(/\d+\s*\/\s*\d+/);
      await expect(payrollPage.previousPageButton).toBeDisabled();

      const isNextEnabled = await payrollPage.nextPageButton.isEnabled();
      if (isNextEnabled) {
        const beforeIndicator = await payrollPage.pageIndicator.innerText();
        await payrollPage.goToNextPage();
        const afterIndicator = payrollPage.pageIndicator;
        await expect(afterIndicator).not.toHaveText(beforeIndicator);
        await expect(payrollPage.previousPageButton).toBeEnabled();
      }
    },
  );

  test(
    'TC-PAY-102 — Filter by status narrows the check list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.historyStatusSelect).toBeVisible();
      const options = await payrollPage.historyStatusSelect.locator('option').allTextContents();
      const specificOption = options.find((opt) => !/all statuses/i.test(opt));

      if (specificOption) {
        await payrollPage.historyStatusSelect.selectOption({ label: specificOption });
        await expect(payrollPage.historyStatusSelect).toHaveValue(/.+/);
        await expect(payrollPage.page.getByRole('table').first()).toBeVisible();
      }
    },
  );

  test(
    'TC-PAY-103 — Filter by date range narrows the check list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.historyDatePresetSelect).toBeVisible();
      const options = await payrollPage.historyDatePresetSelect.locator('option').allTextContents();
      const specificOption = options.find((opt) => !/all dates/i.test(opt));

      if (specificOption) {
        await payrollPage.historyDatePresetSelect.selectOption({ label: specificOption });
        await expect(payrollPage.historyDatePresetSelect).toHaveValue(/.+/);
        await expect(payrollPage.page.getByRole('table').first()).toBeVisible();
      }
    },
  );

  /**
   * TC-PAY-104 — Search by staff name filters check history
   * Steps:
   *   1. Type a staff name (e.g. "Vincent") into the search box.
   * Expected:
   *   Only that staff's checks remain visible.
   */
  // TODO(manual/setup): PayrollPage does not expose a dedicated search input locator for the
  // Check History tab (only staffNameSearchInput on the Checks tab is defined). Do not invent
  // a selector; needs POM update / live DOM verification before automating.
  test.fixme(
    'TC-PAY-104 — Search by staff name filters check history',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      // Intentionally left as a scaffold pending a Check History search locator on PayrollPage.
    },
  );

  test(
    'TC-PAY-105 — Clicking a check row opens its history detail panel',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.noCheckSelectedMessage).toBeVisible();
      await expect(payrollPage.noCheckSelectedMessage).toHaveText(/no check selected/i);

      const firstRow = payrollPage.checkHistoryTable.rows.first();
      const rowText = (await firstRow.innerText()).split('\n')[0].trim();

      if (rowText) {
        await payrollPage.selectCheckHistoryRow(rowText);
        await expect(payrollPage.noCheckSelectedMessage).toBeHidden();
      }
    },
  );

  /**
   * TC-PAY-106 — No results after filtering shows an empty state
   * Steps:
   *   1. Apply a filter combination guaranteed to match nothing (e.g. a nonexistent staff name).
   * Expected:
   *   Table shows an appropriate empty/no-results state; pagination shows `0 of 0`.
   */
  // TODO(manual/setup): No dedicated empty-state locator is exposed for the Check History tab
  // (only checksEmptyState exists for the Checks tab) and there is no search input to force a
  // guaranteed no-match filter combination; needs live verification / POM update.
  test.fixme(
    'TC-PAY-106 — No results after filtering shows an empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {
      // Intentionally left as a scaffold pending a Check History empty-state locator on PayrollPage.
    },
  );
});
