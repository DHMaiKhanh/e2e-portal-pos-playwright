import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Data formatting & consistency — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
  });

  test(
    'TC-PAY-120 — currency values formatted consistently across tabs',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      const currencyRegex = /\$[\d,]+\.\d{2}/;

      await payrollPage.goToChecksTab();
      await payrollPage.waitForReady();
      const checksRowCount = await payrollPage.checksTable.rowCount();
      if (checksRowCount > 0) {
        const checksText = await payrollPage.page.getByRole('table').first().innerText();
        expect(checksText).toMatch(currencyRegex);
        // No raw currency numbers should appear without a leading $ sign.
        const rawNumberWithoutDollar = /(?<!\$)\b\d{1,3}(,\d{3})*\.\d{2}\b/;
        const strippedOfDollarAmounts = checksText.replace(new RegExp(currencyRegex, 'g'), '');
        expect(rawNumberWithoutDollar.test(strippedOfDollarAmounts)).toBeFalsy();
      }

      await payrollPage.goToStaffPayrollTab();
      await payrollPage.waitForReady();
      const staffRowCount = await payrollPage.staffPayrollTable.rowCount();
      if (staffRowCount > 0) {
        const staffText = await payrollPage.page.getByRole('table').first().innerText();
        expect(staffText).toMatch(currencyRegex);
      }

      await payrollPage.goToCheckHistoryTab();
      await payrollPage.waitForReady();
      const historyRowCount = await payrollPage.checkHistoryTable.rowCount();
      if (historyRowCount > 0) {
        const historyText = await payrollPage.page.getByRole('table').first().innerText();
        expect(historyText).toMatch(currencyRegex);
      }
    },
  );

  /**
   * TC-PAY-121 — Date/time formatting differs intentionally between Checks and Check History
   * Preconditions: Same check visible in both Checks tab (e.g. #46) and Check History tab.
   * Steps:
   *   1. Compare the CREATED AT value for check #46 in both tabs.
   * Expected: Checks tab shows full timestamp with time (`Jul 2, 2026, 1:48 AM (US/Central UTC-5)`);
   * Check History shows date only (`Jul 2, 2026 (US/Central UTC-5)`) — both refer to the same
   * underlying timestamp.
   */
  // TODO(manual/setup): requires a specific, pre-seeded check (#46) with a known CREATED AT
  // timestamp to compare exact formatted strings across tabs; not safely assertable against
  // live, time-based store data.
  test.fixme(
    'TC-PAY-121 — CREATED AT format differs: Checks (with time) vs Check History (date only)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-PAY-122 — MEMO field renders the pay-period date range consistently
   * Preconditions: A check tied to a pay period.
   * Steps:
   *   1. Inspect the MEMO column for a check in Checks, Quick-Book-generated checks, and Check History.
   * Expected: MEMO consistently shows `MMM D, YYYY to MMM D, YYYY` for the same check across all
   * tabs where it appears.
   */
  // TODO(manual/setup): requires seeding/identifying a specific check tied to a known pay period
  // and comparing its MEMO text across Checks, Quick-Book, and Check History tabs; depends on
  // live, mutable backend data not controllable from this suite.
  test.fixme(
    'TC-PAY-122 — MEMO date range format consistent across Checks, Quick-Book, and Check History',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
