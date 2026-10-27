import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Merchant information" card.
 *
 * Name, phone, email, address, Timezone, WHMCS, Package, Active since. Values
 * are store-scoped, so assertions match FORMAT and label prefixes.
 *
 * TC-OVW-086 (encryption key UUID) was removed and TC-OVW-080 no longer checks
 * the key/copy button: since the 2026-10-13 redesign the Overview renders no
 * encryption key for any store (checked on 100004, 3, 12, 30, 2502).
 */
test.describe('Merchant Information — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-080 — renders the Merchant information block with all its fields',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.merchantInfoSection).toBeVisible();

      const fields = [
        dashboardPage.merchantPhone,
        dashboardPage.merchantEmail,
        dashboardPage.merchantAddress,
        dashboardPage.merchantTimezone,
        dashboardPage.merchantWhmcs,
        dashboardPage.merchantPackage,
        dashboardPage.merchantActiveSince,
      ];
      for (const field of fields) {
        await expect(field).toBeVisible();
        const text = (await field.textContent())?.trim() ?? '';
        expect(text.length).toBeGreaterThan(0);
      }

      // No raw placeholders leak into the block.
      await expect(
        dashboardPage.merchantInfoSection.getByText(/\b(null|undefined|NaN)\b/),
      ).toHaveCount(0);
    },
  );

  test(
    'TC-OVW-081 — Name, Phone, Email, Address render in the expected formats',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      // First line is the business name — the same as the page h1.
      const name = (await dashboardPage.heading.innerText()).trim();
      await expect(dashboardPage.merchantInfoSection).toContainText(name);
      await expect(dashboardPage.merchantPhone).toHaveText(/^\(\d{3}\)\s*\d{3}-\d{4}$/);
      await expect(dashboardPage.merchantEmail).toHaveText(/^\S+@\S+\.\S+$/);
      // Structure, not a US mailing format: "<street>, …, <postal>, <country>".
      await expect(dashboardPage.merchantAddress).toHaveText(/,.*\d{4,6},\s*[A-Za-z]{2,4}$/);
      await expect(dashboardPage.merchantWhmcs).toHaveText(/^WHMCS:\s*\d+$/);
      await expect(dashboardPage.merchantActiveSince).toHaveText(
        /^Active since [A-Z][a-z]{2} \d{1,2}, \d{4}/,
      );
    },
  );
});
