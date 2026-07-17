import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

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
  // TODO(manual/setup): requires inspecting network/API responses and DOM via dev tools to verify no unmasked account/routing numbers leak; not verifiable via simple UI assertions.
  test.fixme(
    'TC-PAY-140 — bank account numbers never exposed unmasked',
    { tag: [Tag.REGRESSION] },
    async ({ payrollPage }) => {
      await payrollPage.goToBankAccountsTab();
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
  // TODO(manual/setup): requires multi-store access and switching stores via the store selector to verify data scoping, which is not configured in this environment.
  test.fixme(
    'TC-PAY-141 — payroll data scoped to current store only',
    { tag: [Tag.REGRESSION] },
    async ({ payrollPage }) => {
      await payrollPage.waitForReady();
    },
  );
});
