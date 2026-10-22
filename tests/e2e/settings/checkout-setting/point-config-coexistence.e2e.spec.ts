import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  CheckoutMessages,
  CheckoutType,
  PointMethods,
  type CheckoutSettingPage,
  type PointMethodKey,
} from '@pages/settings/CheckoutSettingPage';

/**
 * Checkout setting — 5. Không ghi đè Point Config (dùng chung flag) (VP-4590).
 * Source: docs/test-cases/checkout-type-setting.md (CHK-PTL-030 … CHK-PTL-035).
 *
 * Both cards write the same flag `merchant_point_payment_config`, so every save must carry the
 * 4 payment keys AND `selected_type` / `point_bonus`. Writes are intercepted (`mockSettingWrites`).
 */

/** Stored conversion rates (cents) as loaded in the untouched tiles. */
async function readStoredRates(cs: CheckoutSettingPage): Promise<Record<PointMethodKey, number>> {
  const rates = {} as Record<PointMethodKey, number>;
  for (const { label, key } of PointMethods) {
    rates[key] = Number((await cs.pointInput(label).inputValue()).replace(/\D/g, '') || '0');
  }
  return rates;
}

/** A rate different from `stored`, preferring `wanted`. */
const differentRate = (stored: number, wanted: number): number =>
  stored === wanted ? wanted + 100 : wanted;

test.describe('Checkout setting — Không ghi đè Point Config', () => {
  test.beforeEach(async ({ checkoutSettingPage }) => {
    await checkoutSettingPage.mockSettingWrites();
    await checkoutSettingPage.goto();
  });

  test(
    'CHK-PTL-030 — Lưu Checkout setting không làm mất Point Config',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const rates = await readStoredRates(cs);

      await cs.selectType(cs.bonusTypeOtherThan(await cs.selectedType()));
      await cs.fillPointBonus('8');
      await cs.saveAndWait();

      const config = cs.lastWrittenConfig();
      for (const { key } of PointMethods) {
        expect(config[key], key).toEqual({ enabled: rates[key] > 0, point: rates[key] });
      }
      await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
    },
  );

  test(
    'CHK-PTL-031 — Lưu Point Config không làm mất Checkout setting',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const stored = await cs.readStoredCheckout();
      const rates = await readStoredRates(cs);
      const cash = differentRate(rates.cash, 200);

      await cs.setPointRate('Cash', cash);
      await cs.saveAndWait();

      const config = cs.lastWrittenConfig();
      expect(config.cash).toEqual({ enabled: true, point: cash });
      expect(config.selected_type).toBe(stored.type);
      expect(config.point_bonus).toBe(Number(stored.bonus));
      await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toBeVisible();
    },
  );

  test(
    'CHK-PTL-032 — Sửa cả 2 form và Save 1 lần: 1 PUT chứa đủ cả 2',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const rates = await readStoredRates(cs);
      const card = differentRate(rates.card, 300);
      const type = cs.bonusTypeOtherThan(await cs.selectedType());

      await cs.setPointRate('Card', card);
      await cs.selectType(type);
      await cs.fillPointBonus('8');
      await cs.saveAndWait();

      expect(cs.sysSettingWrites()).toHaveLength(1);
      const config = cs.lastWrittenConfig();
      expect(config.card).toEqual({ enabled: true, point: card });
      expect(config.selected_type).toBe(type);
      expect(config.point_bonus).toBe(8);
      await expect(cs.toast(CheckoutMessages.SAVED_BOTH)).toBeVisible();
    },
  );

  test(
    'CHK-PTL-033 — Gift card No points giữ đúng khi đổi Checkout',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      // Start from Manual so choosing Hybrid is always a change.
      await cs.seedStoredCheckout(CheckoutType.MANUAL, 5);

      await cs.setPointRate('Gift card', 0);
      await cs.selectType(CheckoutType.HYBRID);
      await cs.saveAndWait();

      const config = cs.lastWrittenConfig();
      expect(config.gift_card).toEqual({ enabled: false, point: 0 });
      expect(config.selected_type).toBe(CheckoutType.HYBRID);
    },
  );

  test(
    'CHK-PTL-034 — Khung Point Config cập nhật sau khi lưu Point Config',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.setPointRate('Cash', 200);
      await cs.setPointRate('Card', 300);
      await cs.setPointRate('Gift card', 0);
      // The box shows SAVED rates only — unchanged while editing.
      const untouchedOther = await cs.pointConfigBoxValue('Other');

      await cs.saveAndWait();

      await expect.poll(() => cs.pointConfigBoxValue('Cash')).toBe('1 Point = $2.00');
      await expect.poll(() => cs.pointConfigBoxValue('Card')).toBe('1 Point = $3.00');
      await expect.poll(() => cs.pointConfigBoxValue('Gift card')).toBe('No points');
      expect(await cs.pointConfigBoxValue('Other')).toBe(untouchedOther);
    },
  );

  test(
    'CHK-PTL-035 — Sửa Product tax rate không ảnh hưởng Checkout setting',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const stored = await cs.selectedType();
      const tax = cs.productTaxRateInput.first();
      await expect(tax).toBeVisible();
      const current = await tax.inputValue();
      await tax.fill(current.replace(/[^\d.]/g, '') === '6' ? '7' : '6');
      await tax.blur();

      await expect(cs.saveBar).toBeVisible();
      await cs.save();
      await expect.poll(() => cs.writes.length).toBeGreaterThan(0);
      await expect(cs.saveBar).toBeHidden();

      expect(cs.writtenConfigs(), 'no merchant_point_payment_config write').toHaveLength(0);
      await expect(cs.radio(stored)).toBeChecked();
    },
  );
});
