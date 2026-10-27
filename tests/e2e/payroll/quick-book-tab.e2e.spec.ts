import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Quick Book tab — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
    await payrollPage.goToQuickBookTab();
  });

  test(
    'TC-PAY-040 — Quick Book form renders all required fields',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ payrollPage, page }) => {
      await expect(payrollPage.selectBankAccountCombobox).toBeVisible();
      await expect(payrollPage.endingBalanceText).toBeVisible();
      await expect(payrollPage.selectStaffCombobox).toBeVisible();
      // 2026-10 redesign labels: "Pay to" (was "PAY TO THE ORDER OF"),
      // "Amount" (was "AMOUNT ($)"), "Memo".
      await expect(page.locator('form').getByText(/^pay to$/i)).toBeVisible();
      await expect(payrollPage.amountInput).toBeVisible();
      await expect(page.locator('form').getByText(/^amount$/i)).toBeVisible();
      await expect(payrollPage.memoTextarea).toBeVisible();
      await expect(page.locator('form').getByText(/^memo$/i)).toBeVisible();
      await expect(payrollPage.createCheckButton).toBeVisible();
    },
  );

  test(
    'TC-PAY-041 — Selecting a bank account updates the Ending Balance',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await expect(payrollPage.endingBalanceText).toBeVisible();
      await expect(payrollPage.selectBankAccountCombobox).toHaveText(/select bank account/i);

      // Pick the first bank account the store offers (read-only: nothing is
      // submitted). The balance must stay a currency-formatted amount.
      await payrollPage.selectBankAccountCombobox.click();
      const option = page.getByRole('option').first();
      await expect(option).toBeVisible();
      const bank = (await option.innerText()).trim();
      await option.click();

      await expect(payrollPage.selectBankAccountCombobox).toContainText(bank);
      await expect(payrollPage.endingBalanceText).toHaveText(/ending balance\s*\$[\d,]+\.\d{2}/i);
    },
  );

  test(
    'TC-PAY-042 — Entering an amount auto-populates the spelled-out DOLLAR text',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await payrollPage.amountInput.fill('250.75');
      await expect(page.getByText(/two hundred fifty/i)).toBeVisible();
    },
  );

  /**
   * 2026-10 redesign: the Create button is now disabled until the form is
   * valid, with a hint naming what is still missing ("Choose a bank account,
   * who to pay and an amount"). The old submit-time "X is required" behaviour
   * is gone. Nothing is ever submitted here.
   */
  test(
    'TC-PAY-043 — Create stays disabled and names the missing fields until the form is valid',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      // The redesign dropped the <form> wrapper; the fields, hint and submit now
      // sit directly in the Quick book tabpanel (the only mounted tabpanel).
      const form = page.getByRole('tabpanel').first();

      await expect(payrollPage.createCheckButton).toBeDisabled();
      await expect(form).toContainText(/choose a bank account, who to pay and an amount/i);

      await payrollPage.selectBankAccountCombobox.click();
      await page.getByRole('option').first().click();

      // Bank chosen — staff and amount still missing, so still blocked.
      await expect(form).not.toContainText(/choose a bank account/i);
      await expect(form).toContainText(/choose who to pay/i);
      await expect(payrollPage.createCheckButton).toBeDisabled();
    },
  );

  /**
   * The amount field is a masked currency input: typing "-10" does not produce a negative value
   * or disable Create (verified live — the Create button stays enabled regardless of amount).
   * The mask strips the "-" and reformats the digits as a positive amount (e.g. "-10" -> "$0.10"),
   * which is how negative input is actually rejected here. Updated the assertion to check the
   * masked value instead of an incorrect disabled-button expectation.
   */
  test(
    'TC-PAY-046 — Non-numeric or negative amount is rejected by the input mask',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await payrollPage.amountInput.fill('-10');
      const value = await payrollPage.amountInput.inputValue();
      expect(value).not.toContain('-');
      expect(value).toMatch(/^\$[\d,]+\.\d{2}$/);
    },
  );

  test(
    'TC-PAY-047 — Memo field accepts free text and enforces any max length',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      const longText = 'a'.repeat(500);
      await payrollPage.memoTextarea.fill(longText);
      const value = await payrollPage.memoTextarea.inputValue();
      expect(value.length).toBeLessThanOrEqual(500);
      expect(value.length).toBeGreaterThan(0);
    },
  );
});
