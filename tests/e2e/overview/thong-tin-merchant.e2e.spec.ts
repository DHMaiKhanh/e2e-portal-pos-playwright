import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Thông tin Merchant — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-080 — Merchant Information block renders all labeled fields',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.merchantInfoSection).toBeVisible();

      const fields = [
        dashboardPage.merchantEmail,
        dashboardPage.merchantAddress,
        dashboardPage.merchantTimezone,
        dashboardPage.merchantWhmcs,
        dashboardPage.merchantPackage,
        dashboardPage.merchantActiveSince,
        dashboardPage.merchantPhone,
        dashboardPage.encryptionKey,
      ];

      for (const field of fields) {
        await expect(field).toBeVisible();
        const text = (await field.textContent())?.trim() ?? '';
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/^(null|undefined|NaN)$/i);
      }

      await expect(dashboardPage.copyEncryptionKeyButton).toBeVisible();
    },
  );

  test(
    'TC-OVW-081 — Name, Phone, Email, Address render in the expected formats',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      // Values are store-scoped and dynamic (e.g. seeded data can change between
      // runs/environments), so assert FORMAT, not a fixed live string.
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(page.getByText(/#\d+$/).first()).toBeVisible();
      await expect(dashboardPage.merchantPhone).toHaveText(/\(\d{3}\)\s*\d{3}-\d{4}/);
      await expect(dashboardPage.merchantEmail).toHaveText(/\S+@\S+\.\S+/);
      await expect(dashboardPage.merchantAddress).toHaveText(/,\s*[A-Z]{2},?\s*\d{5}/);
    },
  );

  test(
    'TC-OVW-086 — Encryption key displays as a valid UUID',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.encryptionKey).toBeVisible();
      const text = (await dashboardPage.encryptionKey.textContent())?.trim() ?? '';
      expect(text).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(text).toBe('019dcd1e-140a-7205-b548-64abeecadea9');
      await expect(dashboardPage.copyEncryptionKeyButton).toBeVisible();
    },
  );
});
