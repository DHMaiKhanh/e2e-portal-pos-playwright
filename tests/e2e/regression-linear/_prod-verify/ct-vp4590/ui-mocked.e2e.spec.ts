import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import {
  CheckoutMessages,
  CheckoutType,
  CheckoutTypeText,
  POINT_CONFIG_FLAG,
  PointMethods,
  type CheckoutSettingPage,
  type CheckoutTypeValue,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { ORIGINAL, OUT_DIR, isOriginal, lockHeld, scrollToTop, shot } from './_shared';

/**
 * VP-4590 — PROD #20258, Portal Checkout setting, NO REAL WRITES: every non-GET to the POS API is
 * answered by `mockSettingWrites()` (fake 200 + recorded; the post-save refetch is overlaid with the
 * written value), so prod data never changes here. Screenshots carry the PROD stamp + caption.
 */
const results: Record<string, unknown> = {};
const note = (id: string, v: unknown) => {
  results[id] = v;
  fs.writeFileSync(`${OUT_DIR}/ui-mocked-${id}.json`, JSON.stringify(v, null, 2));
};

const outline = async (cs: CheckoutSettingPage, type: CheckoutTypeValue) =>
  cs.card(type).evaluate((el) => {
    document
      .querySelectorAll<HTMLElement>('[data-slot="merchant-option-card"]')
      .forEach((c) => (c.style.outline = ''));
    (el as HTMLElement).style.outline = '3px solid #e11d48';
    (el as HTMLElement).style.outlineOffset = '2px';
  });

async function focusCard(cs: CheckoutSettingPage, offset = 90): Promise<void> {
  await scrollToTop(cs.checkoutTitle, offset);
}

const usd = (c: number) => (c === 0 ? 'No points' : `1 Point = $${(c / 100).toFixed(2)}`);

test.describe('VP-4590 PROD #20258 — Checkout setting (mocked writes)', () => {
  let flag: PointPaymentConfigValue;

  test.beforeEach(async ({ page, checkoutSettingPage: cs }) => {
    await cs.mockSettingWrites();
    await cs.goto();
    flag = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG)).value;
    if (!isOriginal(flag)) {
      console.log('FLAG != ORIGINAL (lock held:', lockHeld(), ')', JSON.stringify(flag));
    }
  });

  test('TC01/TC02/TC03 — section, default Manual + bonus 0, stored value loads', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await expect(page).toHaveURL(/setting\?tab=payment-transactions/);
    await expect(page.getByRole('tab', { name: /payment & transactions/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(cs.checkoutTitle).toBeVisible();
    await expect(cs.checkoutDescription).toBeVisible();
    await expect(cs.pointConfigTitle).toBeVisible();
    const t = await cs.checkoutTitle.boundingBox();
    const p = await cs.pointConfigTitle.boundingBox();
    const g = await cs.typeGroup.boundingBox();
    // Current prod layout (VP-5098): Setting point config is a sub-section of the Checkout setting
    // card, directly under the 3 checkout type cards.
    expect(p!.y).toBeGreaterThan(g!.y + g!.height - 1);
    expect(p!.y).toBeGreaterThan(t!.y);
    const def = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG)).config
      ?.default_value as PointPaymentConfigValue;
    note('TC01', {
      titleY: t!.y,
      pointConfigY: p!.y,
      cardsBottom: g!.y + g!.height,
      default_value: def,
      stored: flag,
    });
    expect(def.selected_type).toBe(CheckoutType.MANUAL);
    expect(def.point_bonus).toBe(0);
    await expect(cs.radio(flag.selected_type)).toBeChecked();
    await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
    await expect(cs.pointBonusInput).toHaveCount(0);
    await focusCard(cs);
    await outline(cs, CheckoutType.MANUAL);
    await shot(
      page,
      'VP-4590_TC01_checkout_setting_section_manual_default',
      'TC01-03: Payment & transactions › Checkout setting card (3 types + Setting point config + Tip) · stored = Manual Checkout (default type) · no Point Bonus field',
    );
    // Stored bonus of a Manual store (Auto opened, then discarded).
    await cs.selectType(CheckoutType.AUTO);
    await expect(cs.pointBonusInput).toHaveValue(String(flag.point_bonus));
    await scrollToTop(cs.pointBonusInput, 300);
    await shot(
      page,
      'VP-4590_TC02_stored_point_bonus_0',
      `TC02: default/stored Point Bonus = ${flag.point_bonus} (API default_value: payment_method / 0) — shown when Auto is picked (not saved)`,
    );
    await cs.discardIfDirty();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await cs.waitForReady();
    await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
    expect(cs.writes).toHaveLength(0);
  });

  test('TC04-TC07/TC09 — 3 cards texts; Point Bonus only on selected Auto/Hybrid; click card area', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await expect(cs.optionCards).toHaveCount(3);
    const texts: Record<string, string> = {};
    for (const [i, type] of [
      CheckoutType.MANUAL,
      CheckoutType.AUTO,
      CheckoutType.HYBRID,
    ].entries()) {
      await expect(cs.optionCards.nth(i)).toContainText(CheckoutTypeText[type].label);
      await expect(cs.optionCards.nth(i)).toContainText(CheckoutTypeText[type].description);
    }
    // Manual
    await cs.selectType(CheckoutType.MANUAL);
    await expect(cs.pointBonusInput).toHaveCount(0);
    await expect(cs.card(CheckoutType.MANUAL)).not.toContainText('Point Bonus');
    texts.manual = (await cs.card(CheckoutType.MANUAL).innerText()).replace(/\s+/g, ' ');
    await focusCard(cs);
    await outline(cs, CheckoutType.MANUAL);
    await shot(
      page,
      'VP-4590_TC05_manual_card_no_point_bonus',
      `TC04/05: Manual Checkout — "${CheckoutTypeText[CheckoutType.MANUAL].description}" · no Point Bonus field`,
    );
    // Auto — picked by clicking the description text (TC09: card area, not the radio)
    await cs
      .card(CheckoutType.AUTO)
      .getByText(CheckoutTypeText[CheckoutType.AUTO].description)
      .click();
    await expect(cs.radio(CheckoutType.AUTO)).toBeChecked();
    await expect(cs.card(CheckoutType.AUTO).getByLabel('Point Bonus')).toBeVisible();
    await expect(cs.card(CheckoutType.AUTO)).toContainText(
      CheckoutTypeText[CheckoutType.AUTO].bonusSuffix!,
    );
    await expect(cs.pointBonusInput).toHaveCount(1);
    texts.auto = (await cs.card(CheckoutType.AUTO).innerText()).replace(/\s+/g, ' ');
    await focusCard(cs);
    await outline(cs, CheckoutType.AUTO);
    await shot(
      page,
      'VP-4590_TC06_auto_card_point_bonus',
      'TC06/09: Auto Checkout (picked by clicking card text) — "Point Config isn\'t used" · Point Bonus [0] pts for each completed order, whatever the amount',
    );
    // Hybrid
    await cs
      .card(CheckoutType.HYBRID)
      .getByText(CheckoutTypeText[CheckoutType.HYBRID].label, { exact: true })
      .click();
    await expect(cs.radio(CheckoutType.HYBRID)).toBeChecked();
    await expect(cs.card(CheckoutType.HYBRID).getByLabel('Point Bonus')).toBeVisible();
    await expect(cs.card(CheckoutType.HYBRID)).toContainText(
      CheckoutTypeText[CheckoutType.HYBRID].bonusSuffix!,
    );
    await expect(cs.card(CheckoutType.AUTO).getByLabel('Point Bonus')).toHaveCount(0);
    await expect(cs.pointBonusInput).toHaveCount(1);
    texts.hybrid = (await cs.card(CheckoutType.HYBRID).innerText()).replace(/\s+/g, ' ');
    await focusCard(cs);
    await outline(cs, CheckoutType.HYBRID);
    await shot(
      page,
      'VP-4590_TC07_hybrid_card_point_bonus',
      'TC07: Hybrid Checkout — points from Point Config, auto checkout 11:59 PM · Point Bonus [0] pts for each check-in checked out automatically at 11:59 PM',
    );
    note('TC04', texts);
    await cs.discardIfDirty();
    expect(cs.writes).toHaveLength(0);
  });

  test('TC08 — Point config under the cards shows the stored rates', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const shown: Record<string, string> = {};
    for (const { label, key } of PointMethods) {
      const v = Number((await cs.pointInput(label).inputValue()).replace(/\D/g, '') || '0');
      shown[label] = usd(v);
      expect(v, `${label} rate = stored`).toBe(flag[key].enabled ? flag[key].point : 0);
      await expect(cs.pointTile(label)).toContainText(/Earning|No points/);
    }
    note('TC08', { shown, stored: flag });
    await scrollToTop(cs.pointConfigTitle, 200);
    await cs.form
      .locator('[data-slot="point-conversion-tile"]')
      .first()
      .locator('xpath=..')
      .evaluate((el) => {
        (el as HTMLElement).style.outline = '3px solid #e11d48';
      });
    await shot(
      page,
      'VP-4590_TC08_point_config_rates_below_cards',
      `TC08: Setting point config (under the checkout cards) = stored: Cash ${shown.Cash} · Card ${shown.Card} · Gift card ${shown['Gift card']} · Other ${shown.Other}`,
    );
  });

  test('TC10-TC12/TC14/TC15 — invalid Point Bonus blocks Save with a field error', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await cs.selectType(CheckoutType.AUTO);
    const cases: [string, string | RegExp, string][] = [
      ['', CheckoutMessages.BONUS_REQUIRED, 'TC10_empty'],
      ['-1', CheckoutMessages.BONUS_WHOLE_NUMBER, 'TC11_negative'],
      ['1.5', CheckoutMessages.BONUS_WHOLE_NUMBER, 'TC12_decimal_dot'],
      ['1,5', CheckoutMessages.BONUS_WHOLE_NUMBER, 'TC12_decimal_comma'],
      ['99999999999', CheckoutMessages.BONUS_MAX, 'TC14_over_max'],
      ['abc', CheckoutMessages.BONUS_WHOLE_NUMBER, 'TC15_letters'],
      ['1e2', CheckoutMessages.BONUS_WHOLE_NUMBER, 'TC15_exponent'],
      ['+5', CheckoutMessages.BONUS_WHOLE_NUMBER, 'TC15_plus_sign'],
      ['5@#', CheckoutMessages.BONUS_WHOLE_NUMBER, 'TC15_special_chars'],
    ];
    const out: Record<string, string> = {};
    for (const [value, msg, tag] of cases) {
      await cs.fillPointBonus(value);
      await cs.save();
      await expect(cs.bonusError(msg)).toBeVisible();
      await page.waitForTimeout(500);
      expect(cs.sysSettingWrites(), `no PUT for "${value}"`).toHaveLength(0);
      out[tag] = `${JSON.stringify(value)} → "${await cs.bonusError(msg).innerText()}"`;
      if (
        [
          'TC10_empty',
          'TC11_negative',
          'TC12_decimal_dot',
          'TC14_over_max',
          'TC15_letters',
        ].includes(tag)
      ) {
        await scrollToTop(cs.pointBonusInput, 380);
        await shot(
          page,
          `VP-4590_${tag}_point_bonus_error`,
          `${tag.replace('_', ' ')}: Point Bonus ${JSON.stringify(value)} → "${typeof msg === 'string' ? msg : msg}" · Save clicked → no PUT sent`,
        );
      }
    }
    note('TC10-15', out);
    await cs.discardIfDirty();
  });

  test('TC13/TC14/TC15/TC16 — valid edge values are normalised in the payload', async ({
    checkoutSettingPage: cs,
  }) => {
    const out: Record<string, unknown> = {};
    for (const [value, expected, type] of [
      ['0', 0, CheckoutType.HYBRID],
      ['999999', 999999, CheckoutType.AUTO],
      [' 5 ', 5, CheckoutType.HYBRID],
      ['007', 7, CheckoutType.AUTO],
    ] as const) {
      await cs.selectType(type);
      await cs.fillPointBonus(value);
      if (!(await cs.saveBar.isVisible())) await cs.selectType(cs.bonusTypeOtherThan(type));
      await cs.saveAndWait();
      const sent = cs.lastWrittenConfig();
      out[JSON.stringify(value)] = { type: sent.selected_type, point_bonus: sent.point_bonus };
      expect(sent.point_bonus).toBe(expected);
      expect(Number.isInteger(sent.point_bonus)).toBe(true);
    }
    await expect(cs.pointBonusInput).toHaveValue('7');
    note('TC13-16', out);
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4590_TC16_bonus_007_saved_as_7_mocked',
      `TC13-16 (mocked PUT): "0"→0 · "999999"→999999 · " 5 "→5 · "007"→7 — UI after save shows 7`,
    );
  });

  test('TC17/TC24 — Manual save keeps the stored bonus (invalid draft ignored)', async ({
    checkoutSettingPage: cs,
  }) => {
    await cs.seedStoredCheckout(CheckoutType.HYBRID, 7);
    await cs.selectType(CheckoutType.AUTO);
    await cs.fillPointBonus('abc');
    await cs.selectType(CheckoutType.MANUAL);
    await expect(cs.bonusError(CheckoutMessages.BONUS_WHOLE_NUMBER)).toHaveCount(0);
    await cs.saveAndWait();
    await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
    const sent = cs.lastWrittenConfig();
    expect(sent.selected_type).toBe(CheckoutType.MANUAL);
    expect(sent.point_bonus).toBe(7);
    note('TC17-24', sent);
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4590_TC24_manual_save_keeps_bonus7_toast',
      'TC17/24 (mocked): stored Hybrid/7 → Auto "abc" → Manual → Save → toast "Checkout setting saved." · PUT selected_type=payment_method, point_bonus=7',
    );
    await cs.selectType(CheckoutType.AUTO);
    await expect(cs.pointBonusInput).toHaveValue('7');
    await expect(cs.bonusError(CheckoutMessages.BONUS_WHOLE_NUMBER)).toHaveCount(0);
    await scrollToTop(cs.pointBonusInput, 380);
    await shot(
      cs.page,
      'VP-4590_TC41_after_save_auto_shows_db_bonus7',
      'TC41 (VP-4974 fix): after the Manual save, re-picking Auto shows the saved bonus 7 — draft "abc" gone, no error',
    );
  });

  test('TC18-TC21 — switching cards keeps the typed bonus; Discard restores stored', async ({
    checkoutSettingPage: cs,
  }) => {
    await cs.selectType(CheckoutType.AUTO);
    await cs.fillPointBonus('10');
    await cs.selectType(CheckoutType.HYBRID);
    await expect(cs.pointBonusInput).toHaveValue('10');
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4590_TC18_auto10_to_hybrid_keeps_10',
      'TC18: Auto bonus 10 → switch to Hybrid → Point Bonus still 10 (not saved)',
    );
    await cs.fillPointBonus('7');
    await cs.selectType(CheckoutType.AUTO);
    await expect(cs.pointBonusInput).toHaveValue('7');
    await cs.fillPointBonus('12');
    await cs.selectType(CheckoutType.MANUAL);
    await cs.selectType(CheckoutType.AUTO);
    await expect(cs.pointBonusInput).toHaveValue('12');
    await shot(
      cs.page,
      'VP-4590_TC20_auto12_manual_auto_keeps_12',
      'TC19/20: Hybrid 7 → Auto shows 7; Auto 12 → Manual → Auto shows 12 (not saved)',
    );
    await cs.discardButton.click();
    await expect(cs.saveBar).toBeHidden();
    await expect(cs.radio(flag.selected_type)).toBeChecked();
    await expect(cs.pointBonusInput).toHaveCount(0);
    await shot(
      cs.page,
      'VP-4590_TC21_discard_back_to_stored_manual',
      'TC21: Discard → back to stored Manual Checkout, bar hidden, nothing sent',
    );
    expect(cs.writes).toHaveLength(0);
  });

  test('TC22/TC25/TC26/TC28 — Save toast, payload format, no bar without change, double-click = 1 PUT', async ({
    checkoutSettingPage: cs,
  }) => {
    await expect(cs.saveBar).toBeHidden();
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4590_TC26_no_change_no_save_bar',
      'TC26: page opened, nothing changed → no "Unsaved changes" bar',
    );
    await cs.selectType(CheckoutType.AUTO);
    await cs.fillPointBonus('5');
    await cs.saveButton.dblclick();
    await expect.poll(() => cs.sysSettingWrites().length).toBe(1);
    await expect(cs.saveBar).toBeHidden();
    await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
    await cs.page.waitForTimeout(1500);
    expect(cs.sysSettingWrites()).toHaveLength(1);
    const w = cs.sysSettingWrites()[0];
    const sent = cs.lastWrittenConfig();
    note('TC22-28', { method: w.method, url: w.url, sent });
    expect(w.method).toBe('PUT');
    expect(sent.selected_type).toBe(CheckoutType.AUTO);
    expect(sent.point_bonus).toBe(5);
    for (const { key } of PointMethods) expect(sent[key]).toEqual(ORIGINAL[key]);
    expect(sent.earn_on_tip).toBe(ORIGINAL.earn_on_tip);
    await shot(
      cs.page,
      'VP-4590_TC22_save_toast_checkout_setting_saved',
      `TC22/25/28 (mocked): Auto/5 → double-click Save → 1 PUT ${w.url.replace(/^https?:\/\/[^/]+/, '')} · toast "Checkout setting saved."`,
    );
    for (const type of [CheckoutType.HYBRID, CheckoutType.MANUAL]) {
      await cs.selectType(type);
      await cs.saveAndWait();
      expect(cs.lastWrittenConfig().selected_type).toBe(type);
    }
    expect(cs.writtenConfigs().map((c) => c.selected_type)).toEqual([
      'auto_checkout',
      'hybrid_checkout',
      'payment_method',
    ]);
  });

  test('TC27/TC29 — API error keeps input; leaving with unsaved change asks', async ({
    checkoutSettingPage: cs,
    page,
  }) => {
    cs.failWrites(404);
    await cs.selectType(CheckoutType.HYBRID);
    await cs.fillPointBonus('11');
    await cs.save();
    await expect.poll(() => cs.sysSettingWrites().length).toBe(1);
    await expect(cs.toast(/not found/i).first()).toBeVisible();
    await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toHaveCount(0);
    await expect(cs.radio(CheckoutType.HYBRID)).toBeChecked();
    await expect(cs.pointBonusInput).toHaveValue('11');
    await expect(cs.saveBar).toBeVisible();
    const errToasts = await cs.toast(/not found/i).count();
    note('TC27', { errToasts });
    await focusCard(cs);
    await shot(
      page,
      'VP-4590_TC27_save_api_error_keeps_input',
      `TC27 (mocked 404): error toast (x${errToasts}), no success toast, Hybrid/11 kept, bar still open`,
    );
    await cs.sidebar
      .item(/^Overview$/)
      .first()
      .click();
    await expect(cs.unsavedDialog).toBeVisible();
    await shot(
      page,
      'VP-4590_TC29_leave_page_unsaved_dialog',
      'TC29: leave page with unsaved change → "Discard unsaved changes?" (Stay / Discard)',
    );
    await cs.unsavedDialog.getByRole('button', { name: 'Stay' }).click();
    await expect(page).toHaveURL(/tab=payment-transactions/);
  });

  test('TC30-TC33 — Checkout save keeps Point Config; Point Config save keeps type/bonus; both in 1 PUT', async ({
    checkoutSettingPage: cs,
  }) => {
    const out: Record<string, unknown> = {};
    // TC30
    await cs.selectType(CheckoutType.AUTO);
    await cs.fillPointBonus('8');
    await cs.saveAndWait();
    let sent = cs.lastWrittenConfig();
    out.TC30 = sent;
    for (const { key } of PointMethods) expect(sent[key], `TC30 ${key}`).toEqual(ORIGINAL[key]);
    // TC31: only Cash changes
    await cs.setPointRate('Cash', 200);
    await cs.saveAndWait();
    await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toBeVisible();
    sent = cs.lastWrittenConfig();
    out.TC31 = sent;
    expect(sent.selected_type).toBe(CheckoutType.AUTO);
    expect(sent.point_bonus).toBe(8);
    expect(sent.cash).toEqual({ enabled: true, point: 200 });
    // TC32: Card + Hybrid/9 in one Save
    await cs.setPointRate('Card', 300);
    await cs.selectType(CheckoutType.HYBRID);
    await cs.fillPointBonus('9');
    const before = cs.sysSettingWrites().length;
    await cs.saveAndWait();
    expect(cs.sysSettingWrites().length - before).toBe(1);
    await expect(cs.toast(CheckoutMessages.SAVED_BOTH)).toBeVisible();
    sent = cs.lastWrittenConfig();
    out.TC32 = sent;
    expect(sent).toMatchObject({
      selected_type: 'hybrid_checkout',
      point_bonus: 9,
      card: { enabled: true, point: 300 },
      cash: { enabled: true, point: 200 },
    });
    await focusCard(cs);
    await shot(
      cs.page,
      'VP-4590_TC32_point_and_checkout_saved_one_put',
      'TC30-32 (mocked): Card $3.00 + Hybrid/9 in one Save → 1 PUT with both · toast "Point and checkout settings saved."',
    );
    // TC33: Gift card $0.00
    await cs.setPointRate('Gift card', 0);
    await cs.saveAndWait();
    sent = cs.lastWrittenConfig();
    out.TC33 = sent;
    expect(sent.gift_card).toEqual({ enabled: false, point: 0 });
    expect(sent.selected_type).toBe(CheckoutType.HYBRID);
    expect(sent.point_bonus).toBe(9);
    expect(sent.earn_on_tip).toBe(true);
    await expect(cs.pointTile('Gift card')).toContainText('No points');
    await scrollToTop(cs.pointConfigTitle, 200);
    await shot(
      cs.page,
      'VP-4590_TC33_giftcard_no_points_keeps_hybrid9',
      'TC31/33 (mocked): Cash $2.00 → "Point settings saved" keeps Auto/8; Gift card $0.00 → gift_card {enabled:false, point:0}, Hybrid/9 kept',
    );
    note('TC30-33', out);
  });

  test('BUG — reverting the checkout type by hand keeps "1 unsaved change" (compare Point config / Tip)', async ({
    checkoutSettingPage: cs,
    page,
  }) => {
    const barText = async () => {
      await page.waitForTimeout(600);
      return (await cs.saveBar.isVisible())
        ? (await cs.saveBar.innerText()).replace(/\s+/g, ' ')
        : 'HIDDEN';
    };
    const out: Record<string, string> = {};
    // Control 1: Cash tile $0.50 → $0.75 → $0.50
    await cs.setPointRate('Cash', 75);
    out.cashChanged = await barText();
    await cs.setPointRate('Cash', 50);
    out.cashReverted = await barText();
    await cs.discardIfDirty();
    // Control 2: Earn points on tip ON → OFF → ON
    await cs.earnOnTipSwitch.click();
    out.tipOff = await barText();
    await cs.earnOnTipSwitch.click();
    out.tipBackOn = await barText();
    await cs.discardIfDirty();
    // Checkout type: Manual → Auto → Manual
    await expect(cs.saveBar).toBeHidden();
    await focusCard(cs);
    await shot(
      page,
      'VP-4590_BUG01_step1_stored_manual_no_bar',
      'BUG-01 step 1: stored Manual Checkout, nothing changed → no "Unsaved changes" bar',
    );
    await cs.selectType(CheckoutType.AUTO);
    out.typeAuto = await barText();
    await shot(
      page,
      'VP-4590_BUG01_step2_auto_picked_bar',
      'BUG-01 step 2: pick Auto Checkout (bonus untouched) → bar "1 unsaved change" (expected)',
    );
    await cs.selectType(CheckoutType.MANUAL);
    out.typeBackManual = await barText();
    await shot(
      page,
      'VP-4590_BUG01_step3_back_to_manual_bar_stays',
      `BUG-01 step 3: pick Manual again (= stored value) → bar still "${out.typeBackManual}" — expected hidden`,
    );
    // What would Save send?
    await cs.saveAndWait();
    const sent = cs.lastWrittenConfig();
    out.payloadEqualsStored = String(
      JSON.stringify(sent) === JSON.stringify({ ...sent, ...flag }) && isOriginal(sent),
    );
    out.payload = JSON.stringify(sent);
    note('BUG01', out);
    console.log('BUG01', JSON.stringify(out));
    expect(out.cashReverted).toBe('HIDDEN');
    expect(out.typeBackManual, 'bar should hide once the type is back to the stored one').toBe(
      'HIDDEN',
    );
  });

  test('TC40 — responsive 375px', async ({ page, checkoutSettingPage: cs }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await cs.waitForReady();
    await cs.selectType(CheckoutType.HYBRID);
    await cs.fillPointBonus('3');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    for (let i = 0; i < 3; i++) {
      const b = await cs.optionCards.nth(i).boundingBox();
      expect(b!.x + b!.width).toBeLessThanOrEqual(376);
    }
    note('TC40', { overflow });
    expect(overflow).toBeLessThanOrEqual(1);
    await scrollToTop(cs.typeGroup, 60);
    await shot(
      page,
      'VP-4590_TC40_mobile_375_hybrid',
      'TC40: 375px width — cards fit, Point Bonus editable, no horizontal scroll (not saved)',
    );
    await cs.discardIfDirty();
  });
});
