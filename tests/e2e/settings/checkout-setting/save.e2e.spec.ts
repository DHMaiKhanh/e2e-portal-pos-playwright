import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  CheckoutMessages,
  CheckoutType,
  type CheckoutTypeValue,
} from '@pages/settings/CheckoutSettingPage';

/**
 * Checkout setting — 4. Save (VP-4590) + CHK-PTL-041 (bug VP-4974).
 * Source: docs/test-cases/checkout-type-setting.md (CHK-PTL-022 … CHK-PTL-029, CHK-PTL-041).
 *
 * Writes are intercepted (`mockSettingWrites`); the app's post-save refetch is overlaid with the
 * written value, so the page behaves as after a real save. Preconditions such as "Đang là Manual"
 * are set with `seedStoredCheckout()` (mocked saves). The reload half of CHK-PTL-022/023 runs
 * against the real backend in persistence.e2e.spec.ts (opt-in).
 */
const ALL_TYPES = Object.values(CheckoutType);

test.describe('Checkout setting — Save', () => {
  test.beforeEach(async ({ checkoutSettingPage }) => {
    await checkoutSettingPage.mockSettingWrites();
    await checkoutSettingPage.goto();
  });

  test(
    'CHK-PTL-022 — Đổi Checkout Type và Save: toast "Checkout setting saved."',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.seedStoredCheckout(CheckoutType.MANUAL, 5);

      await cs.selectType(CheckoutType.AUTO);
      await cs.saveAndWait();

      await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
      const config = cs.lastWrittenConfig();
      expect(config.selected_type).toBe(CheckoutType.AUTO);
      expect(config.point_bonus).toBe(5);
      await expect(cs.radio(CheckoutType.AUTO)).toBeChecked();
    },
  );

  test(
    'CHK-PTL-023 — Đổi Point Bonus và Save',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.seedStoredCheckout(CheckoutType.HYBRID, 3);

      await cs.fillPointBonus('7');
      await cs.saveAndWait();

      await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
      const config = cs.lastWrittenConfig();
      expect(config.selected_type).toBe(CheckoutType.HYBRID);
      expect(config.point_bonus).toBe(7);
      await expect(cs.radio(CheckoutType.HYBRID)).toBeChecked();
      await expect(cs.pointBonusInput).toHaveValue('7');
    },
  );

  test(
    'CHK-PTL-024 — Chọn Manual rồi Save vẫn giữ bonus cũ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.seedStoredCheckout(CheckoutType.HYBRID, 7);

      await cs.selectType(CheckoutType.MANUAL);
      await cs.saveAndWait();

      const config = cs.lastWrittenConfig();
      expect(config.selected_type).toBe(CheckoutType.MANUAL);
      expect(config.point_bonus).toBe(7);

      await cs.selectType(CheckoutType.AUTO);
      await expect(cs.pointBonusInput).toHaveValue('7');
    },
  );

  test(
    'CHK-PTL-025 — Format payload với từng type',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      // Start on a type different from the stored one so every step is a real change.
      const current = await cs.selectedType();
      const start = ALL_TYPES.indexOf(current) + 1;
      const order: CheckoutTypeValue[] = [0, 1, 2].map((i) => ALL_TYPES[(start + i) % 3]);

      for (const type of order) {
        await cs.selectType(type);
        await cs.saveAndWait();
        const config = cs.lastWrittenConfig();
        expect(config.selected_type).toBe(type);
        expect(ALL_TYPES).toContain(config.selected_type);
        expect(Number.isInteger(config.point_bonus)).toBe(true);
        expect(config.point_bonus).toBeGreaterThanOrEqual(0);
      }
      expect(cs.writtenConfigs()).toHaveLength(3);
    },
  );

  test(
    'CHK-PTL-026 — Không đổi gì thì không hiện thanh Save',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await expect(cs.saveBar).toBeHidden();
      await expect(cs.saveButton).toHaveCount(0);
    },
  );

  test(
    'CHK-PTL-027 — Save lỗi API: báo lỗi, không toast thành công, giữ giá trị đang nhập',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      const target = cs.bonusTypeOtherThan(await cs.selectedType());
      cs.failWrites(404);

      await cs.selectType(target);
      await cs.fillPointBonus('11');
      await cs.save();

      await expect.poll(() => cs.sysSettingWrites().length).toBe(1);
      // Known (non-blocking): the error toast is shown twice — only assert that one appears.
      await expect(cs.toast(/not found/i).first()).toBeVisible();
      await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toHaveCount(0);
      await expect(cs.radio(target)).toBeChecked();
      await expect(cs.pointBonusInput).toHaveValue('11');
      await expect(cs.saveBar).toBeVisible();
    },
  );

  test(
    'CHK-PTL-028 — Double-click Save chỉ gửi 1 request',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      await cs.selectType(cs.bonusTypeOtherThan(await cs.selectedType()));
      await cs.saveButton.dblclick();

      await expect.poll(() => cs.sysSettingWrites().length).toBe(1);
      await expect(cs.saveBar).toBeHidden();
      // A late second request would show up here.
      await cs.page.waitForTimeout(1_500);
      expect(cs.sysSettingWrites()).toHaveLength(1);
    },
  );

  test(
    'CHK-PTL-029 — Rời trang khi chưa lưu có cảnh báo (Stay / Discard)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs, page }) => {
      const target = cs.bonusTypeOtherThan(await cs.selectedType());
      await cs.selectType(target);

      await cs.sidebar
        .item(/^Overview$/)
        .first()
        .click();
      await expect(cs.unsavedDialog).toBeVisible();
      await expect(cs.unsavedDialog.getByRole('button', { name: 'Stay' })).toBeVisible();
      await expect(cs.unsavedDialog.getByRole('button', { name: 'Discard' })).toBeVisible();

      await cs.unsavedDialog.getByRole('button', { name: 'Stay' }).click();
      await expect(cs.unsavedDialog).toBeHidden();
      await expect(page).toHaveURL(/\/setting\?tab=payment-transactions/);
      await expect(cs.radio(target)).toBeChecked();
      expect(cs.sysSettingWrites()).toHaveLength(0);
    },
  );
});

test.describe('Checkout setting — Sync form sau Save (VP-4974)', () => {
  test.beforeEach(async ({ checkoutSettingPage }) => {
    await checkoutSettingPage.mockSettingWrites();
    await checkoutSettingPage.goto();
  });

  test(
    'CHK-PTL-041 — Form sync lại sau khi Save thành công',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ checkoutSettingPage: cs }) => {
      test.fail(true, 'Known bug VP-4974: Point Bonus keeps the draft value after a Manual save');
      await cs.seedStoredCheckout(CheckoutType.MANUAL, 8);

      await cs.selectType(CheckoutType.AUTO);
      await cs.fillPointBonus('abc');
      await cs.selectType(CheckoutType.MANUAL);
      await cs.saveAndWait();
      expect(cs.lastWrittenConfig().point_bonus).toBe(8);

      for (const type of [CheckoutType.AUTO, CheckoutType.HYBRID]) {
        await cs.selectType(type);
        await expect(cs.pointBonusInput).toHaveValue('8', { timeout: 3_000 });
        await expect(cs.bonusError(CheckoutMessages.BONUS_WHOLE_NUMBER)).toHaveCount(0);
      }
      await cs.selectType(CheckoutType.MANUAL);
      await expect(cs.saveBar).toBeHidden({ timeout: 3_000 });
    },
  );
});
