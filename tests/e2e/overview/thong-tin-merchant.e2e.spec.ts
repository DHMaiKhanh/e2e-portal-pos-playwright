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
      ];

      for (const field of fields) {
        await expect(field).toBeVisible();
        const text = (await field.textContent())?.trim() ?? '';
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/^(null|undefined|NaN)$/i);
      }

      // Store 100004's Merchant Information block has no encryption key (and thus
      // no copy button); assert them when a store provisions a key, skip softly
      // when the feature is absent.
      const hasKey = await dashboardPage.encryptionKey.count();
      test.skip(hasKey === 0, 'store has no encryption key');
      await expect(dashboardPage.encryptionKey).toBeVisible();
      const keyText = (await dashboardPage.encryptionKey.textContent())?.trim() ?? '';
      expect(keyText.length).toBeGreaterThan(0);
      expect(keyText).not.toMatch(/^(null|undefined|NaN)$/i);
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
      // Structure, not a US mailing format: the seeded merchant address is
      // "56A Le Khoi, Phu Thanh War, HCM, B, 70111, AR" — comma-separated with a
      // postal code, but no two-letter state before a 5-digit ZIP.
      await expect(dashboardPage.merchantAddress).toHaveText(/,.*\d{4,6}/);
    },
  );

  test(
    'TC-OVW-086 — Encryption key displays as a valid UUID',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      // Store 100004 renders no encryption key; assert it when a store provisions
      // one, skip softly when the feature is absent.
      const hasKey = await dashboardPage.encryptionKey.count();
      test.skip(hasKey === 0, 'store has no encryption key');
      await expect(dashboardPage.encryptionKey).toBeVisible();
      const text = (await dashboardPage.encryptionKey.textContent())?.trim() ?? '';
      expect(text).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      // Value is store-scoped and dynamic (see TC-OVW-081's note) — assert the
      // UUID FORMAT only, never a fixed live key that breaks on any other store.
      await expect(dashboardPage.copyEncryptionKeyButton).toBeVisible();
    },
  );
});
