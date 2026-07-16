import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tab navigation — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
  });

  test(
    'TC-PAY-010 — switching between all 5 tabs updates content and URL',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ payrollPage, page }) => {
      await payrollPage.goToQuickBookTab();
      await expect(page).toHaveURL(/tab=quick-book/);
      await expect(payrollPage.quickBookTab).toHaveAttribute('aria-selected', 'true');
      await expect(payrollPage.selectBankAccountCombobox).toBeVisible();

      await payrollPage.goToStaffPayrollTab();
      await expect(page).toHaveURL(/tab=staff-payroll/);
      await expect(payrollPage.staffPayrollTab).toHaveAttribute('aria-selected', 'true');
      await expect(payrollPage.payPeriodCombobox.or(page.getByRole('table').first())).toBeVisible();

      await payrollPage.goToBankAccountsTab();
      await expect(page).toHaveURL(/tab=bank-account/);
      await expect(payrollPage.bankAccountsTab).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('table').first()).toBeVisible();

      await payrollPage.goToCheckHistoryTab();
      await expect(page).toHaveURL(/tab=history/);
      await expect(payrollPage.checkHistoryTab).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('table').first()).toBeVisible();

      await payrollPage.goToChecksTab();
      await expect(page).toHaveURL(/tab=checks/);
      await expect(payrollPage.checksTab).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('table').first()).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. In "Checks", search for a staff name and go to page 2 (if available).
   * 2. Switch to "Check History" and change page.
   * 3. Switch back to "Checks".
   * Expected: Checks tab still shows the previously entered search term and page;
   * Check History retains its own separate page state.
   */
  // TODO(manual/setup): requires seeded data guaranteeing a second page exists in both
  // Checks and Check History tabs to reliably exercise pagination state retention.
  test.fixme(
    'TC-PAY-011 — each tab retains its own filter/pagination state independently',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await payrollPage.searchStaffName('some-staff');
      await payrollPage.goToNextPage();
      await payrollPage.goToCheckHistoryTab();
      await payrollPage.goToNextPage();
      await payrollPage.goToChecksTab();
    },
  );

  // Tab switches use shallow/replace routing (history.replaceState), not pushState —
  // clicking between tabs never grows the browser history stack. So a single
  // `goBack()` leaves the payroll page entirely (back to whatever preceded it),
  // and `goForward()` returns to the payroll page showing its last-active tab.
  test(
    'TC-PAY-012 — browser back/forward navigates away from and back into the payroll page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await payrollPage.goToBankAccountsTab();
      await expect(page).toHaveURL(/tab=bank-account/);

      await payrollPage.goToCheckHistoryTab();
      await expect(page).toHaveURL(/tab=history/);

      // Tab clicks only replaced the current entry, so the one entry created by
      // the initial payrollPage.goto() (in beforeEach) is what goBack() lands on.
      await page.goBack();
      await expect(page).not.toHaveURL(/tab=(bank-account|history)/);

      await page.goForward();
      await expect(page).toHaveURL(/tab=history/);
      await expect(page.getByRole('table').first()).toBeVisible();
    },
  );
});
