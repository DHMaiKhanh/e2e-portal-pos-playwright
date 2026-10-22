import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { CheckoutType } from '@pages/settings/CheckoutSettingPage';

/**
 * Checkout setting — 3. Chuyển thẻ (VP-4590).
 * Source: docs/test-cases/checkout-type-setting.md (CHK-PTL-018 … CHK-PTL-021).
 *
 * Nothing is saved here; writes are still intercepted as a safety net.
 */
test.describe('Checkout setting — Chuyển thẻ', () => {
  test.beforeEach(async ({ checkoutSettingPage }) => {
    await checkoutSettingPage.mockSettingWrites();
    await checkoutSettingPage.goto();
  });

  test(
    'CHK-PTL-018 — Auto → Hybrid giữ giá trị bonus',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.selectType(CheckoutType.AUTO);
      await cs.fillPointBonus('10');
      await cs.selectType(CheckoutType.HYBRID);
      await expect(cs.card(CheckoutType.HYBRID).getByLabel('Point Bonus')).toHaveValue('10');
      await expect(cs.card(CheckoutType.AUTO).getByLabel('Point Bonus')).toHaveCount(0);
    },
  );

  test(
    'CHK-PTL-019 — Hybrid → Auto giữ giá trị bonus',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.selectType(CheckoutType.HYBRID);
      await cs.fillPointBonus('7');
      await cs.selectType(CheckoutType.AUTO);
      await expect(cs.card(CheckoutType.AUTO).getByLabel('Point Bonus')).toHaveValue('7');
    },
  );

  test(
    'CHK-PTL-020 — Auto → Manual → Auto giữ giá trị bonus',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.selectType(CheckoutType.AUTO);
      await cs.fillPointBonus('12');
      await cs.selectType(CheckoutType.MANUAL);
      await expect(cs.pointBonusInput).toHaveCount(0);
      await cs.selectType(CheckoutType.AUTO);
      await expect(cs.pointBonusInput).toHaveValue('12');
    },
  );

  test(
    'CHK-PTL-021 — Discard trả về giá trị đã lưu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const stored = await cs.readStoredCheckout();

      await cs.selectType(cs.bonusTypeOtherThan(stored.type));
      await cs.fillPointBonus('20');
      await expect(cs.saveBar).toBeVisible();

      await cs.discardButton.click();
      await expect(cs.saveBar).toBeHidden();
      await expect(cs.radio(stored.type)).toBeChecked();

      // The bonus must be back to the stored value too.
      if (stored.type === CheckoutType.MANUAL) await cs.selectType(CheckoutType.AUTO);
      await expect(cs.pointBonusInput).toHaveValue(stored.bonus);
      expect(cs.sysSettingWrites()).toHaveLength(0);
    },
  );
});
