import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Checks tab — table & actions — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
    await payrollPage.goToChecksTab();
  });

  test(
    'TC-PAY-020 — checks table columns and data formats',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      const header = payrollPage.page.getByRole('table').first();
      await expect(header.getByRole('columnheader', { name: /ID/i })).toBeVisible();
      await expect(header.getByRole('columnheader', { name: /STAFF NAME/i })).toBeVisible();
      await expect(header.getByRole('columnheader', { name: /CREATED AT/i })).toBeVisible();
      await expect(header.getByRole('columnheader', { name: /CHECK AMOUNT/i })).toBeVisible();
      await expect(header.getByRole('columnheader', { name: /MEMO/i })).toBeVisible();
      await expect(header.getByRole('columnheader', { name: /STATUS/i })).toBeVisible();

      const firstRow = payrollPage.checksTable.rows.first();
      await expect(firstRow).toBeVisible();
      await expect(firstRow).toContainText(/\$[\d,]+\.\d{2}/);
    },
  );

  test(
    'TC-PAY-021 — search by staff name filters table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      const rowsBefore = await payrollPage.checksTable.rows.count();
      test.skip(rowsBefore === 0, 'No checks available to derive a staff name search term from.');

      // Columns are: [checkbox, ID, STAFF NAME, CREATED AT, CHECK AMOUNT, MEMO, STATUS, actions].
      // Derive a real staff name from live data instead of assuming a hardcoded name (e.g. "Mai")
      // exists in the store's checks.
      const firstRowText = await payrollPage.checksTable.rows.first().innerText();
      const staffName = firstRowText.split('\t')[2]?.trim();
      test.skip(!staffName, 'Could not read a staff name from the first row.');

      await payrollPage.searchStaffName(staffName);
      await payrollPage.waitForReady();

      const escapedStaffName = staffName!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const staffNamePattern = new RegExp(escapedStaffName, 'i');
      // This store is live/shared (checks can be created by other concurrent runs/users), so the
      // "first row" read above can churn before the debounced search request resolves. Poll instead
      // of asserting on a single snapshot.
      await expect
        .poll(
          async () => {
            const rowTexts = await payrollPage.checksTable.rows.allTextContents();
            return rowTexts.length > 0 && rowTexts.every((text) => staffNamePattern.test(text));
          },
          { timeout: 15000 },
        )
        .toBeTruthy();
    },
  );

  test(
    'TC-PAY-022 — search with no matches shows empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await payrollPage.searchStaffName('zzzznotreal');
      await expect(payrollPage.checksEmptyState).toBeVisible();
      await expect(payrollPage.checksEmptyState).toContainText(/no checks found/i);
    },
  );

  /**
   * Steps: Open the sort select (default "Created") and choose an alternate option if available.
   * Expected: Row order updates according to the selected sort; reverting to "Created" restores
   * original (most-recent-first) order.
   */
  // TODO(manual/setup): requires seeded data with 2+ known rows spanning different dates to
  // deterministically verify row-order changes; live data order is not stable enough to assert.
  test.fixme('TC-PAY-023 — "Created" sort/column selector changes row order', async () => {});

  /**
   * Steps: Change the date filter from "All dates" to a narrower preset (e.g. "This week").
   * Expected: Table only shows checks whose CREATED AT falls within the selected range;
   * pagination/count updates.
   */
  // TODO(manual/setup): needs backend-seeded checks spanning multiple weeks to verify the date
  // range narrows results correctly; live store data/time-based and not deterministic.
  test.fixme('TC-PAY-024 — "All dates" preset filter narrows results by date range', async () => {});

  test(
    'TC-PAY-025 — "Pick a date range" opens a custom range picker',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.pickDateRangeButton).toBeVisible();
      await expect(payrollPage.pickDateRangeButton).toBeEnabled();
    },
  );

  test(
    'TC-PAY-026 — select all checkbox selects every visible row',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.selectAllCheckbox).toBeVisible();
      await payrollPage.selectAllCheckbox.check();
      await expect(payrollPage.selectAllCheckbox).toBeChecked();
      await payrollPage.selectAllCheckbox.uncheck();
      await expect(payrollPage.selectAllCheckbox).not.toBeChecked();
    },
  );

  /**
   * Steps: Check row 1 and row 3 individually. Verify header checkbox state.
   * Expected: Only rows 1 and 3 are checked; header checkbox shows an indeterminate/unchecked
   * state (not fully checked) since not all rows are selected.
   */
  // TODO(manual/setup): requires a stable, seeded set of 3+ rows to reliably target row indices
  // 1 and 3 and verify the header checkbox's indeterminate state.
  test.fixme('TC-PAY-027 — selecting individual rows works independently of Select all', async () => {});

  /**
   * Steps: Click `Print` on a specific check row (e.g. #46).
   * Expected: A print dialog/preview opens (or a print-formatted view/PDF is generated) for
   * check #46 specifically, not for other checks.
   */
  // TODO(manual/setup): triggers a native browser print dialog / new tab PDF generation which
  // cannot be verified deterministically without a known seeded check id and print interception.
  test.fixme('TC-PAY-028 — print button on a row triggers print for that check', async () => {});

  test(
    'TC-PAY-029 — Add Staff button opens the add-staff flow',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.addStaffButton).toBeVisible();
      await expect(payrollPage.addStaffButton).toBeEnabled();
    },
  );

  test(
    'TC-PAY-030 — Edit Signature button opens the signature editor',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.editSignatureButton).toBeVisible();
      await expect(payrollPage.editSignatureButton).toBeEnabled();
    },
  );

  test(
    'TC-PAY-031 — pagination Next/Previous navigate pages of checks',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.previousPageButton).toBeVisible();
      await expect(payrollPage.nextPageButton).toBeVisible();
      await expect(payrollPage.previousPageButton).toBeDisabled();
    },
  );
});
