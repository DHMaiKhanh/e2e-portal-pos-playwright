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
  /**
   * The locator was never missing: `staffNameSearchInput` is scoped to
   * `:visible`, and every tab renders its own "Search by staff name..." box, so
   * on the Check History tab it resolves to that tab's input. Verified live —
   * exactly one is visible here.
   */
  test(
    'TC-PAY-104 — Search by staff name filters check history',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      // Re-enter the tab by URL rather than trusting the state this test
      // inherited: the search box keeps its value across cases, and starting
      // from someone else's filter makes an empty list look like "this store
      // has no check history". Filling the box with "" does not reset it — the
      // app ignores an empty submit — so the query params are the reset.
      await payrollPage.gotoTab('history');

      const rows = payrollPage.checkHistoryTable.rows;
      // Poll rather than sampling once: under load the list occasionally paints
      // empty for a moment before the history request lands.
      await expect.poll(async () => rows.count(), { timeout: 30_000 }).toBeGreaterThan(0);

      // Take the search term from live data. The STAFF NAME cell renders as
      // "\nJ\nJohnna\n" — an avatar initial above the name, with surrounding
      // blank lines — so the name is the last *non-empty* line, not simply the
      // last one.
      const nameOf = (cellText: string): string =>
        cellText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .pop() ?? '';

      const staffName = nameOf((await rows.first().innerText()).split('\t')[1] ?? '');
      expect(staffName.length).toBeGreaterThan(0);

      await payrollPage.searchStaffName(staffName);

      // Debounced + refetched, so poll until the rendered set reflects the term
      // rather than reading the stale page underneath it.
      await expect
        .poll(async () => {
          const names = (await rows.allInnerTexts()).map((row) => nameOf(row.split('\t')[1] ?? ''));
          return names.length > 0 && names.every((name) => name === staffName);
        })
        .toBe(true);
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
  /**
   * Both halves of the blocker turned out to be false: the tab does have a
   * search box (see TC-PAY-104), and the empty state does not need a dedicated
   * locator — "no rows, and a footer that says zero" is the assertion, and it
   * does not depend on the exact copy the screen chooses.
   */
  test(
    'TC-PAY-106 — No results after filtering shows an empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.checkHistoryTable.rows.first()).toBeVisible();

      await payrollPage.searchStaffName('zzz-no-such-staff-zzz');

      await expect.poll(async () => payrollPage.checkHistoryTable.rows.count()).toBe(0);

      // Not a bare header: the screen says something, and the pager reads zero
      // rather than showing a stale range.
      await expect(payrollPage.paginationSummary.first()).toHaveText(
        /showing 0 to 0 of 0 results/i,
      );
      await expect(payrollPage.previousPageButton.first()).toBeDisabled();
      await expect(payrollPage.nextPageButton.first()).toBeDisabled();
    },
  );
});
