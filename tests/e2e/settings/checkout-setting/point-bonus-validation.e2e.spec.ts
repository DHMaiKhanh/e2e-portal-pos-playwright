import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  CheckoutMessages,
  CheckoutType,
  type CheckoutSettingPage,
} from '@pages/settings/CheckoutSettingPage';

/**
 * Checkout setting — 2. Point Bonus validation (VP-4590).
 * Source: docs/test-cases/checkout-type-setting.md (CHK-PTL-010 … CHK-PTL-017).
 *
 * Writes are intercepted (`mockSettingWrites`), so "Save OK" means the expected PUT payload left
 * the browser; "không gửi request" means no `PUT /sys_settings` was recorded.
 *
 * The cases say "Chọn Auto"; Auto and Hybrid share the same field and rules, so a bonus type that
 * differs from the stored one is picked — that keeps the form dirty (Save bar shown) whatever is
 * typed, even when the store is already on Auto.
 */

/** Open a bonus card that differs from the stored type, then type `value` into Point Bonus. */
async function enterBonus(cs: CheckoutSettingPage, value: string): Promise<void> {
  await cs.selectType(cs.bonusTypeOtherThan(await cs.selectedType()));
  await cs.fillPointBonus(value);
}

async function expectRejected(cs: CheckoutSettingPage, message: string | RegExp): Promise<void> {
  await expect(cs.bonusError(message)).toBeVisible();
  await expect(cs.pointBonusInput).toHaveAttribute('aria-invalid', 'true');
  await cs.save();
  // Give a (wrong) request time to leave before asserting none did.
  await cs.page.waitForTimeout(1_000);
  expect(cs.sysSettingWrites()).toHaveLength(0);
  await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toHaveCount(0);
}

async function expectSavedBonus(cs: CheckoutSettingPage, expected: number): Promise<void> {
  await expect(cs.pointBonusInput).not.toHaveAttribute('aria-invalid', 'true');
  await cs.saveAndWait();
  const config = cs.lastWrittenConfig();
  expect(config.point_bonus).toBe(expected);
  expect(Number.isInteger(config.point_bonus)).toBe(true);
}

test.describe('Checkout setting — Point Bonus validation', () => {
  test.beforeEach(async ({ checkoutSettingPage }) => {
    await checkoutSettingPage.mockSettingWrites();
    await checkoutSettingPage.goto();
  });

  test(
    'CHK-PTL-010 — Point Bonus rỗng không lưu được',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await enterBonus(cs, '');
      await expectRejected(cs, CheckoutMessages.BONUS_REQUIRED);
    },
  );

  test(
    'CHK-PTL-011 — Point Bonus âm không lưu được',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await enterBonus(cs, '-1');
      await expectRejected(cs, CheckoutMessages.BONUS_WHOLE_NUMBER);
    },
  );

  for (const value of ['1.5', '1,5']) {
    test(
      `CHK-PTL-012 — Point Bonus số lẻ không lưu được (${value})`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ checkoutSettingPage: cs }) => {
        await enterBonus(cs, value);
        await expectRejected(cs, CheckoutMessages.BONUS_WHOLE_NUMBER);
      },
    );
  }

  test(
    'CHK-PTL-013 — Point Bonus = 0 lưu được',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await enterBonus(cs, '0');
      await expectSavedBonus(cs, 0);
    },
  );

  test(
    'CHK-PTL-014 — Giới hạn giá trị lớn nhất (999999 OK, 99999999999 lỗi)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await enterBonus(cs, '99999999999');
      await expectRejected(cs, CheckoutMessages.BONUS_MAX);

      await cs.fillPointBonus('999999');
      await expectSavedBonus(cs, 999999);
    },
  );

  for (const value of ['abc', '1e2', '+5', '5@#']) {
    test(
      `CHK-PTL-015 — Ký tự không hợp lệ bị chặn (${value})`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ checkoutSettingPage: cs }) => {
        await enterBonus(cs, value);
        await expectRejected(cs, CheckoutMessages.BONUS_WHOLE_NUMBER);
      },
    );
  }

  test(
    'CHK-PTL-015 — Giá trị có khoảng trắng " 5 " lưu = 5',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await enterBonus(cs, ' 5 ');
      await expectSavedBonus(cs, 5);
    },
  );

  test(
    'CHK-PTL-016 — Số có 0 ở đầu "007" lưu = 7',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await enterBonus(cs, '007');
      await expectSavedBonus(cs, 7);
    },
  );

  test(
    'CHK-PTL-017 — Giá trị lỗi ở Auto rồi chuyển Manual và Save: lưu bonus cũ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const stored = await cs.readStoredCheckout();

      await enterBonus(cs, 'abc');
      await expect(cs.bonusError(CheckoutMessages.BONUS_WHOLE_NUMBER)).toBeVisible();

      await cs.selectType(CheckoutType.MANUAL);
      await expect(cs.bonusError(CheckoutMessages.BONUS_WHOLE_NUMBER)).toHaveCount(0);

      await cs.saveAndWait();
      const config = cs.lastWrittenConfig();
      expect(config.selected_type).toBe(CheckoutType.MANUAL);
      expect(config.point_bonus).toBe(Number(stored.bonus));
    },
  );
});
