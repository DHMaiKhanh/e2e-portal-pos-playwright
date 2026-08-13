import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { expectCrossStoreBlocked } from '@helpers/security';

test.describe('Security & permissions — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
  });

  /**
   * TC-PAY-140 — Bank account numbers are never exposed unmasked in the client
   * Preconditions: Bank Accounts tab loaded; browser dev tools open.
   * Steps:
   *   1. Inspect the rendered DOM and the underlying API response for account/routing numbers.
   * Expected: Only masked values (`****` + last 4) are present in both the rendered UI and
   * (unless required for edit) the API payload; no full account/routing number leaks to the client.
   */
  /**
   * SECURITY FINDING — this case is written to fail, and it currently does.
   *
   * "Not verifiable via simple UI assertions" was the reason it was parked;
   * it is verifiable — `page.on('response')` gives the raw payload. Doing so on
   * 2026-08-13 showed the masking is presentation-only:
   *
   *   GET https://volt-pos.<host>/bank_accounts?...
   *   → accountNumber "15198183456", "13289193855", "15131045931",
   *     "14139222256", "18437017491", "15341628249",
   *     routingNumber  "021000021"
   *
   * The table renders `****1111`, but every full account and routing number is
   * delivered to the browser, where devtools, a HAR export, or any script on
   * the page can read it. The Edit form then pre-fills the same full value into
   * its input (confirmed while writing TC-PAY-083), so the masking is only ever
   * skin-deep.
   *
   * Left as `fixme` rather than a red test so the suite stays actionable, and
   * kept here (not folded into TC-PAY-080, which pins the UI masking that does
   * hold) so the finding is not lost. Un-fixme once the API returns only the
   * last 4 digits.
   */
  test.fixme(
    'TC-PAY-140 — bank account numbers never exposed unmasked',
    { tag: [Tag.REGRESSION] },
    async ({ payrollPage, page }) => {
      const payloads: string[] = [];
      page.on('response', async (response) => {
        if (!/bank_?accounts/i.test(response.url())) return;
        await response
          .text()
          .then((body) => payloads.push(body))
          .catch(() => undefined);
      });

      await payrollPage.gotoTab('bank-account');
      await expect(payrollPage.bankAccountsTable.rows.first()).toBeVisible();

      expect(payloads.length, 'no bank account response captured').toBeGreaterThan(0);
      for (const body of payloads) {
        const longDigitRuns = body.match(/(?<!\d)\d{8,}(?!\d)/g) ?? [];
        expect(longDigitRuns, `unmasked digits in payload: ${longDigitRuns.join(', ')}`).toEqual(
          [],
        );
      }
    },
  );

  /**
   * TC-PAY-141 — Payroll data is scoped to the current store only
   * Preconditions: User has access to multiple stores.
   * Steps:
   *   1. Note check/staff data for store #100004's Payroll screen.
   *   2. Switch to a different store via the store selector.
   * Expected: Payroll screen reloads with that store's own checks/staff/bank accounts only;
   * no cross-store data leakage.
   */
  /**
   * "Requires multi-store access" reads the case too literally. Its point is
   * that payroll data is scoped to the store in the URL — and that is testable
   * from one account by asking for a store the account does not have, which is
   * the stronger direction anyway: a leak matters most when the store is not
   * yours.
   *
   * Runs on `isolatedPage` because the Portal remembers the active merchant;
   * doing this in the worker-shared context would strand later tests on the
   * wrong store.
   */
  test(
    'TC-PAY-141 — payroll data scoped to current store only',
    { tag: [Tag.REGRESSION] },
    async ({ isolatedPage }) => {
      await expectCrossStoreBlocked(isolatedPage, (storeId) => `/pos/${storeId}/payroll`);

      const body = await isolatedPage.locator('body').innerText();

      // None of the payroll-shaped data of another store may appear: no check
      // amounts, no masked account numbers, no pay-period ranges.
      expect(body, 'a currency amount leaked from another store').not.toMatch(/\$[\d,]+\.\d{2}/);
      expect(body, 'a masked account number leaked from another store').not.toMatch(/\*{2,}\d+/);
      expect(body).not.toMatch(/showing \d+ to \d+ of \d+ results/i);
    },
  );
});
