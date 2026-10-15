import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';

test.describe('Staff Payroll tab — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
    await payrollPage.goToStaffPayrollTab();
  });

  test(
    'TC-PAY-060 — staff payroll table lists staff with income summary',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await payrollPage.waitForReady();
      const table = payrollPage.page.getByRole('table').first();
      await expect(table).toBeVisible();
      const headerText = await table.innerText();
      expect(headerText).toMatch(/Name/i);
      expect(headerText).toMatch(/Orders/i);
      expect(headerText).toMatch(/Subtotal/i);
      expect(headerText).toMatch(/Supply Fee/i);
      expect(headerText).toMatch(/Tip/i);
      expect(headerText).toMatch(/Total Income/i);
    },
  );

  /**
   * Steps: Open the pay-period combobox (e.g. "Jun 30, 2026 - Jun 30, 2026") and select a different period.
   * Expected: `periodId` in the URL updates; table data (Orders/Subtotal/Tip/Total Income) refreshes to reflect the newly selected period.
   */
  /**
   * The periods are already seeded — the store has nine, from "Jul 20, 2026 -
   * Jul 24, 2026" back to "May 4, 2026 - May 5, 2026". So the case only has to
   * pick a different one and prove the screen followed.
   */
  test(
    'TC-PAY-061 — selecting a pay period reloads the staff summary',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await payrollPage.waitForReady();
      await payrollPage.waitForStaffPayrollRows();
      const rowsOf = async (): Promise<string[]> =>
        payrollPage.staffPayrollTable.rows.allInnerTexts();

      const periodBefore = (await payrollPage.payPeriodCombobox.innerText()).trim();
      const periodIdBefore = new URL(page.url()).searchParams.get('periodId');
      const before = await rowsOf();
      expect(before.length).toBeGreaterThan(0);

      await payrollPage.payPeriodCombobox.click();
      const options = page.getByRole('option');
      await expect(options.first()).toBeVisible();
      const labels = (await options.allInnerTexts()).map((label) => label.trim());
      const other = labels.find((label) => label !== periodBefore);
      expect(other, `only one pay period offered: ${labels.join(' | ')}`).toBeTruthy();

      await page.getByRole('option', { name: other as string, exact: true }).click();
      await payrollPage.waitForReady();

      await test.step('The selection is reflected in the control and the URL', async () => {
        await expect(payrollPage.payPeriodCombobox).toHaveText(other as string);
        await expect
          .poll(() => new URL(page.url()).searchParams.get('periodId'))
          .not.toBe(periodIdBefore);
      });

      await test.step('The table reloads for the newly selected period', async () => {
        // Different periods have different income, so the rendered summary must
        // change — a table that stayed identical would mean the period was
        // applied to the URL but never to the data.
        await expect.poll(rowsOf).not.toEqual(before);
        expect((await rowsOf()).length).toBeGreaterThan(0);
      });
    },
  );

  /**
   * Steps: Load Staff Payroll tab for such a store.
   * Expected: `No payroll periods available` message is shown along with a way to create one (`Create` / `Create New`), rather than a blank or errored table.
   */
  // TODO(manual/setup): requires a store/tenant with zero payroll periods configured, not available on default DEV store
  test.fixme(
    'TC-PAY-062 — no payroll periods available shows an empty/setup state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * Steps: Click `Create New`. Fill in a new period's date range and confirm.
   * Expected: A new pay period is created, appears in the period selector, and becomes selectable; staff summary recalculates for that period.
   */
  // TODO(manual/setup): mutates backend state by creating a new payroll period; needs cleanup/isolation not available in this suite
  test.fixme(
    'TC-PAY-063 — create new payroll period flow',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  test(
    'TC-PAY-064 — clicking a staff row opens their payroll detail panel',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await payrollPage.waitForReady();
      const rows = payrollPage.staffPayrollTable.rows;
      // goToStaffPayrollTab settles on the rows, so this is a real assertion
      // rather than the runtime skip it used to be.
      await expect(rows.first()).toBeVisible();
      await expect(payrollPage.noStaffSelectedMessage).toBeVisible();
      const firstRowText = (await rows.first().innerText()).split('\n')[0]?.trim() ?? '';
      await payrollPage.selectStaffPayrollRow(firstRowText);
      await expect(payrollPage.noStaffSelectedMessage).toBeHidden();
    },
  );

  test(
    'TC-PAY-065 — search by staff name filters the Staff Payroll table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await payrollPage.waitForReady();
      const rows = payrollPage.staffPayrollTable.rows;
      await expect(rows.first()).toBeVisible();

      // The NAME cell renders an avatar initial above the name, so its text is
      // e.g. "E\nElise Terry". Take the last line — the earlier version read the
      // first one and searched for "E El", which matches nobody.
      const nameOf = (cellText: string): string =>
        cellText.split('\n').pop()?.replace(/\s+/g, ' ').trim() ?? '';

      const before = (await rows.locator('td:first-child').allInnerTexts()).map(nameOf);
      const fullName = before[0];
      const partial = fullName.slice(0, Math.min(4, fullName.length));
      expect(partial.length).toBeGreaterThan(0);
      // Staff whose display name does not contain the term — the search must drop
      // at least these unless the backend matches them on another field.
      const nonMatching = before.filter((n) => !n.toLowerCase().includes(partial.toLowerCase()));

      await payrollPage.searchStaffName(partial);

      // The search is debounced and refetches, so the unfiltered rows stay up
      // briefly; poll until the rendered set actually reflects the term. The
      // backend also matches fields other than the display name (searching
      // "1001" also returns "Lam"), so don't require every row to contain the
      // term — require the searched staff to stay and the list to narrow.
      await expect
        .poll(
          async () => {
            const names = (
              await payrollPage.staffPayrollTable.rows.locator('td:first-child').allInnerTexts()
            ).map(nameOf);
            const dropped = nonMatching.filter((n) => !names.includes(n)).length;
            return names.includes(fullName) && (nonMatching.length === 0 || dropped > 0);
          },
          { timeout: Timeouts.MEDIUM },
        )
        .toBe(true);
    },
  );

  /**
   * Steps: Locate such a staff row (e.g. "Wendy" in sample data).
   * Expected: Row renders `0` for Orders and `$0.00` for all currency columns without errors or blank cells.
   */
  /**
   * Zero-income staff are not rare here — 19 of the 30 rows on page 1 have no
   * orders in the active period — so the row is found rather than seeded.
   */
  test(
    'TC-PAY-066 — staff with zero orders/income still displays correctly',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await payrollPage.waitForReady();
      await payrollPage.waitForStaffPayrollRows();
      const rows = await payrollPage.staffPayrollTable.rows.allInnerTexts();
      expect(rows.length).toBeGreaterThan(0);

      // Columns: NAME, ORDERS, SUBTOTAL, SUPPLY FEE, TIP, TOTAL INCOME.
      const zeroRow = rows
        .map((row) => row.split('\t').map((cell) => cell.trim()))
        .find((cells) => cells[1] === '0');

      expect(zeroRow, 'no staff with zero orders in the active period').toBeTruthy();
      const cells = zeroRow as string[];

      // The name is still there (the cell stacks an avatar initial above it).
      expect(cells[0].split('\n').pop()?.trim().length ?? 0).toBeGreaterThan(0);
      expect(cells[1]).toBe('0');

      // And every money column reads $0.00 — not blank, not "-", not NaN.
      for (const index of [2, 3, 4, 5]) {
        expect(cells[index], `column ${index} of a zero-income row`).toBe('$0.00');
      }
    },
  );
});
