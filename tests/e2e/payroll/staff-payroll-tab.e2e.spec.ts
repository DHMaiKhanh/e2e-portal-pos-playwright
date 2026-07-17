import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

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
  // TODO(manual/setup): requires multiple pre-seeded pay periods and backend state to verify data refresh per period
  test.fixme(
    'TC-PAY-061 — selecting a pay period reloads the staff summary',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
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
      const rowCount = await rows.count();
      test.skip(rowCount === 0, 'No staff rows available to select');
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
      const rowCount = await rows.count();
      test.skip(rowCount === 0, 'No staff rows available to search');
      const firstRowFullName = (await rows.first().innerText()).split('\n')[0]?.trim() ?? '';
      const partial = firstRowFullName.slice(0, Math.max(1, Math.min(3, firstRowFullName.length)));
      await payrollPage.searchStaffName(partial);
      const filteredRows = payrollPage.staffPayrollTable.rows;
      const filteredCount = await filteredRows.count();
      expect(filteredCount).toBeGreaterThan(0);
      for (let i = 0; i < filteredCount; i++) {
        const text = await filteredRows.nth(i).innerText();
        expect(text.toLowerCase()).toContain(partial.toLowerCase());
      }
    },
  );

  /**
   * Steps: Locate such a staff row (e.g. "Wendy" in sample data).
   * Expected: Row renders `0` for Orders and `$0.00` for all currency columns without errors or blank cells.
   */
  // TODO(manual/setup): requires a seeded staff member with zero orders/income in the active pay period; not guaranteed in live DEV data
  test.fixme(
    'TC-PAY-066 — staff with zero orders/income still displays correctly',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
