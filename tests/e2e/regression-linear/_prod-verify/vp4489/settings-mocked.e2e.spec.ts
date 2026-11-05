import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import {
  CheckoutMessages,
  CheckoutType,
  CheckoutTypeText,
  POINT_CONFIG_FLAG,
  PointMethods,
  type CheckoutSettingPage,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { SHOTS_DIR, scrollToTop, shot } from './_shared';

/**
 * VP-4489 — PROD #20258, Portal part, NO WRITES: every non-GET to the POS API is answered by
 * `mockSettingWrites()` (fake 200 + recorded), so prod data never changes here.
 */
const cents = (raw: string): number => Number(raw.replace(/\D/g, '') || '0');

async function focusCard(cs: CheckoutSettingPage): Promise<void> {
  await scrollToTop(cs.checkoutTitle);
}

async function rates(cs: CheckoutSettingPage): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const { label } of PointMethods) out[label] = cents(await cs.pointInput(label).inputValue());
  return out;
}

test.describe.configure({ mode: 'serial' });

test.describe('VP-4489 PROD #20258 — Checkout type / point setting (mocked writes)', () => {
  let flag: PointPaymentConfigValue;

  test.beforeEach(async ({ page, checkoutSettingPage: cs }) => {
    await cs.mockSettingWrites();
    await cs.goto();
    flag = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG)).value;
  });

  test('TC01 — hiển thị 3 Checkout type + giá trị đang lưu + Point config', async ({
    checkoutSettingPage: cs,
  }) => {
    await expect(cs.optionCards).toHaveCount(3);
    for (const [i, type] of [
      CheckoutType.MANUAL,
      CheckoutType.AUTO,
      CheckoutType.HYBRID,
    ].entries()) {
      await expect(cs.optionCards.nth(i)).toContainText(CheckoutTypeText[type].label);
      await expect(cs.optionCards.nth(i)).toContainText(CheckoutTypeText[type].description);
    }
    // UI selection = stored flag.
    await expect(cs.radio(flag.selected_type)).toBeChecked();
    const ui = await rates(cs);
    console.log('STORED FLAG', JSON.stringify(flag), 'UI RATES', JSON.stringify(ui));
    for (const { label, key } of PointMethods) {
      expect(ui[label], `${label} rate shown = stored`).toBe(
        flag[key].enabled ? flag[key].point : 0,
      );
    }
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4489_TC01_checkout_type_current',
      `stored: ${flag.selected_type} · bonus ${flag.point_bonus}`,
    );
    await scrollToTop(cs.pointConfigTitle);
    await shot(cs.page, 'VP-4489_TC01b_point_config_current', 'Setting point config (stored)');
    expect(cs.writes).toHaveLength(0);
  });

  test('TC02 — Auto / Hybrid hiện ô Point Bonus; Discard không ghi', async ({
    checkoutSettingPage: cs,
  }) => {
    await cs.selectType(CheckoutType.AUTO);
    await expect(cs.pointBonusInput).toBeVisible();
    await expect(cs.card(CheckoutType.AUTO)).toContainText(
      CheckoutTypeText[CheckoutType.AUTO].bonusSuffix!,
    );
    await expect(cs.card(CheckoutType.AUTO)).toContainText("Point Config isn't used");
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4489_TC02_auto_option_point_bonus',
      'Auto Checkout selected (not saved)',
    );

    await cs.selectType(CheckoutType.HYBRID);
    await expect(cs.pointBonusInput).toBeVisible();
    await expect(cs.card(CheckoutType.HYBRID)).toContainText(
      CheckoutTypeText[CheckoutType.HYBRID].bonusSuffix!,
    );
    await shot(
      cs.page,
      'VP-4489_TC02b_hybrid_option_point_bonus',
      'Hybrid Checkout selected (not saved)',
    );

    await cs.selectType(CheckoutType.MANUAL);
    await expect(cs.pointBonusInput).toHaveCount(0);
    await cs.discardIfDirty();
    await expect(cs.radio(flag.selected_type)).toBeChecked();
    expect(cs.writes, 'no write sent').toHaveLength(0);
  });

  test('TC03 — case của tiệm: Auto + Point Bonus 1 + tắt hết $→point (No points) → payload giữ check-in bonus', async ({
    checkoutSettingPage: cs,
  }) => {
    await cs.selectType(CheckoutType.AUTO);
    await cs.fillPointBonus('1');
    for (const { label } of PointMethods) await cs.setPointRate(label, 0);
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4489_TC03_auto_bonus1_all_nopoints_before_save',
      'mocked: Auto · bonus 1 · all methods $0.00',
    );
    await scrollToTop(cs.pointConfigTitle);
    await shot(
      cs.page,
      'VP-4489_TC03b_all_methods_nopoints_before_save',
      'mocked: all methods $0.00 = No points',
    );

    await cs.saveAndWait();
    await expect(cs.toast(CheckoutMessages.SAVED_BOTH)).toBeVisible();
    const sent = cs.lastWrittenConfig();
    const w = cs.sysSettingWrites();
    fs.writeFileSync(`${SHOTS_DIR}/../tc03-mocked-put.json`, JSON.stringify(w, null, 2));
    console.log('PUT', w.length, w[w.length - 1].url, JSON.stringify(sent));
    expect(w, 'exactly one PUT').toHaveLength(1);
    expect(sent.selected_type).toBe(CheckoutType.AUTO);
    expect(sent.point_bonus).toBe(1);
    for (const { key } of PointMethods) expect(sent[key].point, `${key} → 0 (No points)`).toBe(0);
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4489_TC03c_saved_mocked_toast',
      'mocked save → "Point and checkout settings saved."',
    );
    // UI after the (overlaid) refetch: still Auto / 1 — not flipped to Manual or $1 = 1 point.
    await expect(cs.radio(CheckoutType.AUTO)).toBeChecked();
    await expect(cs.pointBonusInput).toHaveValue('1');
  });

  test('TC04 — Auto + bonus 1, giữ nguyên $ rates: payload Auto (Point Config không dùng), rates không đổi', async ({
    checkoutSettingPage: cs,
  }) => {
    await cs.selectType(CheckoutType.AUTO);
    await cs.fillPointBonus('1');
    await cs.saveAndWait();
    await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
    const sent = cs.lastWrittenConfig();
    console.log('PUT TC04', JSON.stringify(sent));
    expect(sent.selected_type).toBe(CheckoutType.AUTO);
    expect(sent.point_bonus).toBe(1);
    for (const { key } of PointMethods) expect(sent[key]).toEqual(flag[key]);
    expect(sent.earn_on_tip).toBe(flag.earn_on_tip);
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4489_TC04_auto_bonus1_keep_rates_mocked',
      'mocked save: Auto · bonus 1 · rates unchanged',
    );
  });
});
