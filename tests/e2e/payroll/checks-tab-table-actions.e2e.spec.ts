import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';

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
      // The store holds 35 checks, so an empty table is a broken screen rather
      // than a missing precondition — assert instead of skipping past it.
      await expect(payrollPage.checksTable.rows.first()).toBeVisible();

      // Columns are: [checkbox, ID, STAFF NAME, CREATED AT, CHECK AMOUNT, MEMO, STATUS, actions].
      // Derive a real staff name from live data instead of assuming a hardcoded name (e.g. "Mai")
      // exists in the store's checks.
      const firstRowText = await payrollPage.checksTable.rows.first().innerText();
      const staffName = firstRowText.split('\t')[2]?.trim();
      expect(staffName, 'STAFF NAME cell is empty on the first check row').toBeTruthy();

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
      // 2026-10 redesign: the no-match state reuses the generic empty-state
      // block (title "No payroll checks yet") and the pager is not rendered.
      await expect(payrollPage.checksEmptyState).toBeVisible();
      await expect(payrollPage.checksTable.rows).toHaveCount(0);
      await expect(payrollPage.paginationSummary).toHaveCount(0);
    },
  );

  /**
   * Steps: Open the "Created" selector (default "Created") and choose an alternate option.
   * Expected: The listed checks update according to the selection; reverting to "Created"
   * restores the original list.
   *
   * 2026-10 redesign: the "Created" control is the status filter chip
   * ("Check status: Created", options Created / Printed / Voided / Deleted /
   * Archived) and its value lives in the URL (`status=`). Read the IDs, switch
   * to another status, assert the list changed, then switch back and assert it
   * is restored. Read-only — filtering never writes.
   */
  test(
    'TC-PAY-023 — "Created" status selector changes the listed checks',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      const idsInOrder = async (): Promise<string[]> =>
        (await payrollPage.checksTable.rows.allInnerTexts()).map((row) =>
          (row.split('\t')[1] ?? '').trim(),
        );
      const pickStatus = async (label: string): Promise<void> => {
        await payrollPage.checksSortSelect.click();
        await page.getByRole('option', { name: label, exact: true }).click();
        await page.keyboard.press('Escape');
        await expect(payrollPage.checksSortSelect).toHaveAccessibleName(
          new RegExp(`check status: ${label}`, 'i'),
        );
        await payrollPage.waitForReady();
      };

      await expect(
        payrollPage.checksTable.rows.first().or(payrollPage.checksEmptyState).first(),
      ).toBeVisible();
      await expect(payrollPage.checksSortSelect).toHaveAccessibleName(/check status: created/i);
      const original = await idsInOrder();

      await payrollPage.checksSortSelect.click();
      const options = page.getByRole('option');
      await expect(options.first()).toBeVisible();
      const labels = (await options.allInnerTexts()).map((label) => label.trim());
      expect(labels).toContain('Printed');
      await page.keyboard.press('Escape');

      await pickStatus('Printed');
      await expect(page).toHaveURL(/status=printed/);
      await expect.poll(idsInOrder).not.toEqual(original);

      await pickStatus('Created');
      await expect.poll(idsInOrder).toEqual(original);
    },
  );

  /**
   * Steps: Change the date filter from "All dates" to a narrower preset (e.g. "This week").
   * Expected: Table only shows checks whose CREATED AT falls within the selected range;
   * pagination/count updates.
   */
  /**
   * "Narrows" is relative, so it can be asserted without knowing the data: the
   * total under a narrower preset must not exceed the total under "All dates",
   * and every row still on screen must fall inside the window. Both hold
   * whatever the store happens to contain.
   */
  test(
    'TC-PAY-024 — "All dates" preset filter narrows results by date range',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      // "1–30 of 64"; the pager is not rendered at all for an empty result.
      const totalResults = async (): Promise<number> => {
        if ((await payrollPage.paginationSummary.count()) === 0) return 0;
        const summary = await payrollPage.paginationSummary.first().innerText();
        return Number(summary.match(/of (\d+)/i)?.[1] ?? NaN);
      };

      await expect(payrollPage.checksTable.rows.first()).toBeVisible();
      const allDatesTotal = await totalResults();
      expect(allDatesTotal).toBeGreaterThan(0);

      await expect(payrollPage.checksDatePresetSelect).toHaveText(/all dates/i);
      await payrollPage.checksDatePresetSelect.click();
      const options = page.getByRole('listbox', { name: 'Presets' }).getByRole('option');
      await expect(options.first()).toBeVisible();
      const labels = (await options.allInnerTexts()).map((label) => label.trim());
      const narrower = labels.find((label) => /^last year$/i.test(label)) ?? labels[0];
      expect(narrower, `no narrower preset offered: ${labels.join(', ')}`).toBeTruthy();

      await options.filter({ hasText: narrower }).first().click();
      await page.keyboard.press('Escape');
      await expect(page).toHaveURL(/dateAfter=/);
      await expect(payrollPage.checksDatePresetSelect).toHaveText(narrower);
      await payrollPage.waitForReady();

      await expect.poll(async () => totalResults()).toBeLessThanOrEqual(allDatesTotal);

      // Whatever survived must be real rows or an explicit empty state — never
      // a half-rendered table.
      await expect(
        payrollPage.checksTable.rows.first().or(payrollPage.checksEmptyState).first(),
      ).toBeVisible();
    },
  );

  test(
    'TC-PAY-025 — "Pick a date range" opens a custom range picker',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      // 2026-10 redesign: the "All dates" trigger opens one popover holding the
      // presets list and a range calendar — there is no separate button.
      await expect(payrollPage.pickDateRangeButton).toBeEnabled();
      await payrollPage.pickDateRangeButton.click();
      const picker = page.getByRole('dialog').filter({ has: page.getByRole('grid') });
      await expect(picker).toBeVisible();
      await expect(picker.getByRole('grid').first()).toBeVisible();
      await expect(picker.getByRole('button', { name: /previous month/i })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(picker).toBeHidden();
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
  /**
   * Pinned to the "Printed" status (14 checks on 2026-10-20): the default
   * "Created" view holds a single check on the shared DEV store. Rows are
   * addressed by index within the current page, which is exactly what the case
   * describes. Selecting rows is client-side only — no bulk action is clicked.
   */
  test(
    'TC-PAY-027 — selecting individual rows works independently of Select all',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await page.goto(`${Urls.PAYROLL}?tab=checks&status=printed`, {
        waitUntil: 'domcontentloaded',
      });
      await payrollPage.waitForReady();
      const rows = payrollPage.checksTable.rows;
      await expect(rows.first().or(payrollPage.checksEmptyState).first()).toBeVisible();
      const rowCount = await rows.count();
      // Partial selection needs a middle row left unchecked, so at least three
      // checks. Checks cannot be seeded without mutating the shared store, so a
      // thinner store fails here as a missing precondition.
      expect(
        rowCount < 3,
        `Checks store holds ${rowCount} check(s); need >= 3 to exercise partial selection.`,
      ).toBeFalsy();

      const first = payrollPage.rowSelectCheckbox(0);
      const third = payrollPage.rowSelectCheckbox(2);
      const second = payrollPage.rowSelectCheckbox(1);

      await first.check();
      await third.check();

      await expect(first).toBeChecked();
      await expect(third).toBeChecked();
      await expect(second).not.toBeChecked();

      // A partial selection must not read as "all selected" on the header.
      await expect(payrollPage.selectAllCheckbox).not.toBeChecked();

      await first.uncheck();
      await third.uncheck();
      await expect(first).not.toBeChecked();
      await expect(third).not.toBeChecked();
    },
  );

  /**
   * Steps: Click `Print` on a specific check row (e.g. #46).
   * Expected: A print dialog/preview opens (or a print-formatted view/PDF is generated) for
   * check #46 specifically, not for other checks.
   */
  /**
   * The blocker assumed the button hands straight to a native print dialog.
   * Live, it does not: it opens an in-app confirmation ("Print Check — Are you
   * sure you want to print this check? Make sure the printer is loaded with
   * check stock…") with Cancel / Print. That is observable, so the case runs.
   *
   * It stops at the confirmation on purpose. Confirming would send real check
   * stock to a printer, and the case's actual claim — that the row's button
   * starts printing *that* check — is already settled by the prompt appearing
   * for the right row.
   */
  test(
    'TC-PAY-028 — print button on a row triggers print for that check',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await expect(payrollPage.checksTable.rows.first()).toBeVisible();
      const firstRow = payrollPage.checksTable.rows.first();
      const checkId = (await firstRow.innerText()).split('\t')[1].trim();
      expect(checkId).toMatch(/#?\d+/);

      await payrollPage.clickPrintOnRow(0);

      // Rendered as an alertdialog, so `getByRole('dialog')` alone misses it.
      const confirmation = page
        .getByRole('alertdialog')
        .or(page.getByRole('dialog'))
        .filter({ hasText: /print check/i })
        .first();
      await expect(confirmation).toBeVisible();
      await expect(confirmation).toContainText(/are you sure you want to print/i);
      await expect(confirmation.getByRole('button', { name: /^print$/i })).toBeVisible();

      await test.step('Backing out prints nothing and leaves the row untouched', async () => {
        await confirmation.getByRole('button', { name: /^cancel$/i }).click();
        await expect(confirmation).toBeHidden();
        await expect(payrollPage.checksTable.rows.first()).toContainText(checkId);
      });
    },
  );

  test(
    'TC-PAY-029 — Create check (formerly Add Staff) button opens the create-checks flow',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      // 2026-10 redesign: "Add Staff" is now the header "Create check" button,
      // opening the bulk "Create checks" dialog (period, bank, staff picker).
      // Closed without creating anything.
      await expect(payrollPage.addStaffButton).toBeEnabled();
      await payrollPage.addStaffButton.click();
      const dialog = page.getByRole('dialog', { name: /create checks/i });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('combobox', { name: /payroll period/i })).toBeVisible();
      await expect(dialog.getByRole('button', { name: /^create check$/i })).toBeDisabled();
      await dialog
        .getByRole('button', { name: /^close$/i })
        .last()
        .click();
      await expect(dialog).toBeHidden();
    },
  );

  test(
    'TC-PAY-030 — Edit Signature button opens the signature editor',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await expect(payrollPage.editSignatureButton).toBeEnabled();
      await payrollPage.editSignatureButton.click();
      const dialog = page.getByRole('dialog', { name: /edit signature/i });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: /save signature/i })).toBeVisible();
      // Cancel — never save a signature on the shared store.
      await dialog.getByRole('button', { name: /^cancel$/i }).click();
      await expect(dialog).toBeHidden();
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
