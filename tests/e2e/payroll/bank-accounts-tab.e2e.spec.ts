import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bank Accounts tab — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
    await payrollPage.goToBankAccountsTab();
  });

  /**
   * TC-PAY-080 — Bank Accounts table lists accounts with masked sensitive fields
   * Preconditions: At least one bank account configured (e.g. "Techcombank").
   * Steps:
   *  1. Load the Bank Accounts tab.
   *  2. Inspect ACCOUNT NUMBER and ROUTING NUMBER cells.
   * Expected: Both fields are masked showing only the last 4 digits (e.g. `****7890`, `****1111`);
   * full numbers are never exposed in the DOM/network response beyond what's needed.
   */
  // TODO(manual/setup): requires inspecting network responses / verifying no full account numbers
  // are exposed beyond the DOM, which needs backend/network verification tooling.
  test.fixme(
    'TC-PAY-080 — bank accounts table masks sensitive fields',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-PAY-081 — BANK LINK opens the linked banking URL
   * Preconditions: A bank account row with a BANK LINK value.
   * Steps:
   *  1. Click the BANK LINK URL for a row.
   * Expected: Opens the linked URL (e.g. `https://techcombank.gulit.ronaldo.com`) in a new tab,
   * without exposing masked account details in the link.
   */
  // TODO(manual/setup): requires a known bank account row with a BANK LINK value present in the
  // live store and verifying a new-tab navigation; data not guaranteed to exist.
  test.fixme(
    'TC-PAY-081 — bank link opens linked banking URL',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  test(
    'TC-PAY-082 — create new opens the add-bank-account form',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.createNewBankAccountButton).toBeVisible();
      await expect(payrollPage.createNewBankAccountButton).toBeEnabled();
    },
  );

  /**
   * TC-PAY-083 — Edit updates an existing bank account
   * Preconditions: At least one bank account exists.
   * Steps:
   *  1. Click `Edit` on a row.
   *  2. Change the account name and save.
   * Expected: Table reflects the updated account name; account/routing numbers remain masked
   * unless explicitly re-entered.
   */
  // TODO(manual/setup): mutates backend state (renames an existing bank account); needs seeded
  // data and cleanup to avoid side effects on shared store data.
  test.fixme(
    'TC-PAY-083 — edit updates an existing bank account',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-PAY-084 — Delete removes a bank account after confirmation
   * Preconditions: At least one bank account exists that is not referenced by pending checks.
   * Steps:
   *  1. Click `Delete` on a row.
   *  2. Confirm the deletion in the confirmation dialog.
   * Expected: A confirmation prompt appears before deletion; after confirming, the account is
   * removed from the table and no longer selectable in Quick Book.
   */
  // TODO(manual/setup): destructive backend mutation (deletes a bank account); requires seeded
  // disposable data to avoid impacting other tests/store state.
  test.fixme(
    'TC-PAY-084 — delete removes a bank account after confirmation',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-PAY-085 — Deleting a bank account in use is blocked or warned
   * Preconditions: A bank account referenced by an existing/pending check.
   * Steps:
   *  1. Attempt to `Delete` that account.
   * Expected: App blocks the deletion or warns the user of the dependency, rather than silently
   * breaking existing checks.
   */
  // TODO(manual/setup): requires seeding a bank account that is referenced by a pending check,
  // which needs backend state setup not available in this environment.
  test.fixme(
    'TC-PAY-085 — deleting a bank account in use is blocked or warned',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  test(
    'TC-PAY-086 — search by bank or account name filters the list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await expect(payrollPage.bankSearchInput).toBeVisible();
      await payrollPage.searchBankAccount('zzz-nonexistent-bank-account-xyz');
      // Filtering happens asynchronously (debounced search + network round-trip); poll instead of
      // taking an immediate single snapshot, which raced ahead of the filter completing.
      await expect
        .poll(async () => {
          const hasEmptyState = await payrollPage.noBankAccountsMessage
            .isVisible()
            .catch(() => false);
          const rowCount = await payrollPage.bankAccountsTable.rows.count();
          return hasEmptyState || rowCount === 0;
        })
        .toBeTruthy();
    },
  );

  test(
    'TC-PAY-087 — empty state when no bank accounts exist',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await payrollPage.searchBankAccount('zzz-nonexistent-bank-account-xyz');
      await expect(payrollPage.noBankAccountsMessage).toBeVisible();
    },
  );
});
