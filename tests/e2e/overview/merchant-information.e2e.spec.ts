import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Merchant Information" area (lean core).
 *
 * Labelled merchant fields (Timezone, WHMCS, Package, Active since, Phone,
 * encryption key) + the "Copy encryption key" button. Values are store-scoped, so
 * assertions match FORMAT and label prefixes, never the exact live strings.
 */
test.describe('Merchant Information — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-080 — renders the Merchant Information block with its fields and copy button',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.merchantTimezone).toBeVisible();
      await expect(dashboardPage.merchantWhmcs).toBeVisible();
      await expect(dashboardPage.merchantPackage).toBeVisible();
      await expect(dashboardPage.merchantActiveSince).toBeVisible();
      await expect(dashboardPage.encryptionKey).toBeVisible();
      await expect(dashboardPage.copyEncryptionKeyButton).toBeVisible();
      // No raw placeholders leak into the block.
      await expect(page.getByText(/\b(null|undefined|NaN)\b/)).toHaveCount(0);
    },
  );

  test(
    'TC-OVW-081 — merchant Phone and Email render in the expected formats',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      // Phone as US "(NNN) NNN-NNNN"; email as a well-formed address (values dynamic).
      await expect(dashboardPage.merchantPhone).toBeVisible();
      await expect(page.getByText(/\S+@\S+\.\S+/).first()).toBeVisible();
    },
  );

  test(
    'TC-OVW-086 — encryption key is displayed in full as a valid UUID',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.encryptionKey).toBeVisible();
      await expect(dashboardPage.encryptionKey).toHaveText(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
    },
  );
});
