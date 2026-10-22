import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { CheckoutType, CheckoutTypeText, PointMethods } from '@pages/settings/CheckoutSettingPage';

/**
 * Checkout setting — 1. Hiển thị & default (VP-4590).
 * Source: docs/test-cases/checkout-type-setting.md (CHK-PTL-001 … CHK-PTL-009).
 *
 * Read-only: every write is answered by `mockSettingWrites()`, so nothing on DEV changes.
 */
const DEFAULT_STORE_ID = process.env.CHECKOUT_DEFAULT_STORE_ID ?? '30';

test.describe('Checkout setting — Hiển thị & default', () => {
  test.beforeEach(async ({ checkoutSettingPage }) => {
    await checkoutSettingPage.mockSettingWrites();
    await checkoutSettingPage.goto();
  });

  test(
    'CHK-PTL-001 — Hiển thị section Checkout setting ngay dưới Setting point config',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ checkoutSettingPage: cs }) => {
      await expect(cs.checkoutTitle).toBeVisible();
      await expect(cs.checkoutDescription).toBeVisible();
      await expect(cs.pointConfigTitle).toBeVisible();

      const pointBox = await cs.pointConfigTitle.boundingBox();
      const checkoutBox = await cs.checkoutTitle.boundingBox();
      expect(pointBox && checkoutBox, 'both card titles are laid out').toBeTruthy();
      expect(checkoutBox!.y).toBeGreaterThan(pointBox!.y);
      // Same column: left edges line up.
      expect(Math.abs(checkoutBox!.x - pointBox!.x)).toBeLessThan(5);
    },
  );

  test(
    'CHK-PTL-002 — Default khi tiệm chưa lưu Checkout setting: Manual, Point Bonus = 0',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      // Merchant #30 carries the default record (payment_method / 0) per QC Round 2.
      await cs.gotoStore(DEFAULT_STORE_ID);
      await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
      await expect(cs.pointBonusInput).toHaveCount(0);

      await cs.selectType(CheckoutType.AUTO);
      await expect(cs.pointBonusInput).toHaveValue('0');
      await cs.discardIfDirty();
    },
  );

  test(
    'CHK-PTL-003 — Load đúng setting đã lưu sau reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs, page }) => {
      // Non-mutating form: whatever is stored must come back identically after a reload.
      // The "save Hybrid / 7 then reload" variant lives in persistence.e2e.spec.ts (opt-in).
      const before = await cs.readStoredCheckout();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await cs.waitForReady();
      const after = await cs.readStoredCheckout();
      expect(after).toEqual(before);
    },
  );

  test(
    'CHK-PTL-004 — Text 3 thẻ khớp spec',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await expect(cs.optionCards).toHaveCount(3);
      const order = [CheckoutType.MANUAL, CheckoutType.AUTO, CheckoutType.HYBRID];
      for (const [i, type] of order.entries()) {
        const card = cs.optionCards.nth(i);
        await expect(card).toContainText(CheckoutTypeText[type].label);
        await expect(card).toContainText(CheckoutTypeText[type].description);
        await expect(card.locator(`[id="checkout-type-${type}"]`)).toHaveCount(1);
      }
    },
  );

  test(
    'CHK-PTL-005 — Manual không có ô Point Bonus',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.selectType(CheckoutType.MANUAL);
      await expect(cs.pointBonusInput).toHaveCount(0);
      await expect(cs.card(CheckoutType.MANUAL)).not.toContainText('Point Bonus');
    },
  );

  for (const [id, type] of [
    ['CHK-PTL-006', CheckoutType.AUTO],
    ['CHK-PTL-007', CheckoutType.HYBRID],
  ] as const) {
    test(
      `${id} — ${CheckoutTypeText[type].label} có ô Point Bonus và text đúng`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ checkoutSettingPage: cs }) => {
        await cs.selectType(type);
        const card = cs.card(type);
        await expect(card.getByLabel('Point Bonus')).toBeVisible();
        await expect(card).toContainText(CheckoutTypeText[type].bonusSuffix!);
        // Only the selected card renders the field.
        await expect(cs.pointBonusInput).toHaveCount(1);
      },
    );
  }

  test(
    'CHK-PTL-008 — Khung Point Config bên dưới các thẻ hiện đúng tỉ lệ đang lưu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await expect(cs.pointConfigBox).toBeVisible();
      await expect(cs.pointConfigNote).toBeVisible();

      const cardsBox = await cs.typeGroup.boundingBox();
      const configBox = await cs.pointConfigBox.boundingBox();
      expect(configBox!.y).toBeGreaterThan(cardsBox!.y + cardsBox!.height - 1);

      // Untouched form → tiles hold the stored rates; the box must mirror them.
      for (const { label } of PointMethods) {
        const shown = await cs.pointConfigBoxValue(label);
        expect(shown).toMatch(/^(1 Point = \$[\d,]+\.\d{2}|No points)$/);
        expect(shown, `${label} rate`).toBe(await cs.pointTileDisplay(label));
      }
    },
  );

  test(
    'CHK-PTL-009 — Click vùng thẻ (không click radio) chọn được thẻ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const current = await cs.selectedType();
      const target = cs.bonusTypeOtherThan(current);
      await cs.card(target).getByText(CheckoutTypeText[target].description).click();
      await expect(cs.radio(target)).toBeChecked();
      await expect(cs.card(target)).toHaveAttribute('data-selected', /.*/);
    },
  );
});
