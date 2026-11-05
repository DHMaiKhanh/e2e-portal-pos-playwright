import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import {
  CheckoutMessages,
  CheckoutType,
  PointMethods,
  type CheckoutSettingPage,
} from '@pages/settings/CheckoutSettingPage';
import { ORIGINAL_FLAG, OUT_DIR, annotate, log, scrollToTop, shot } from './_shared';
import { vp, watchConsole } from './_vp5098';

/**
 * VP-5098 PROD #20258 — editing inside the moved "Setting point config" step.
 * NO WRITES: every save is answered by `mockSettingWrites()` (fake 200, payload recorded).
 */
async function open(cs: CheckoutSettingPage): Promise<string[]> {
  const errors = watchConsole(cs.page);
  await cs.mockSettingWrites();
  await cs.goto();
  await cs.waitForReady();
  return errors;
}

const STORED_UI = { Cash: '$0.50', Card: '$0.01', 'Gift card': '$2.00', Other: '$1.00' } as const;

test.describe('VP-5098 PROD #20258 — edit & save inside Checkout setting (mocked writes)', () => {
  test('TC07 — sửa 1 Point = $… cho 4 method; badge Earning / No points đúng', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    const v = vp(cs);
    for (const [label, val] of Object.entries(STORED_UI)) {
      await expect(cs.pointInput(label), `${label} stored`).toHaveValue(val);
      await expect(v.pill(label)).toHaveText('Earning');
    }
    await cs.setPointRate('Cash', 200);
    await cs.setPointRate('Card', 125);
    await cs.setPointRate('Gift card', 0);
    await cs.setPointRate('Other', 1000);
    await expect(cs.pointInput('Cash')).toHaveValue('$2.00');
    await expect(cs.pointInput('Card')).toHaveValue('$1.25');
    await expect(cs.pointInput('Gift card')).toHaveValue('$0.00');
    await expect(cs.pointInput('Other')).toHaveValue('$10.00');
    await expect(v.pill('Cash')).toHaveText('Earning');
    await expect(v.pill('Card')).toHaveText('Earning');
    await expect(v.pill('Gift card'), '$0.00 → No points').toHaveText('No points');
    await expect(v.pill('Other')).toHaveText('Earning');
    await expect(cs.saveBar).toBeVisible();
    await scrollToTop(v.pointStep, 260);
    await annotate(
      v.pointStep,
      'edited (mocked, not saved): Cash $2.00 · Card $1.25 · Gift card $0.00 → No points · Other $10.00',
      '#2563eb',
    );
    await annotate(v.pill('Gift card'), 'No points', '#e11d48');
    await shot(
      page,
      'VP-5098_TC07_edit_rates_badges',
      'TC07 · rates editable inside Checkout setting; Gift card $0.00 → "No points" badge (not saved)',
    );
    expect(cs.writes).toHaveLength(0);
    await cs.discardIfDirty();
  });

  test('TC08 — đổi Hybrid + bonus 10 + Cash $2.00 → Save 1 lần → 1 PUT chứa cả 2 (mocked)', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    const v = vp(cs);
    await cs.selectType(CheckoutType.HYBRID);
    await cs.fillPointBonus('10');
    await cs.setPointRate('Cash', 200);
    await cs.saveAndWait();
    await expect(cs.toast(CheckoutMessages.SAVED_BOTH)).toBeVisible();
    const puts = cs.sysSettingWrites();
    const sent = cs.lastWrittenConfig();
    fs.writeFileSync(`${OUT_DIR}/tc08-mocked-put.json`, JSON.stringify(puts, null, 2));
    log(
      `TC08 mocked PUTs=${puts.length} ${puts.map((p) => `${p.method} ${p.url}`).join(' | ')} body=${JSON.stringify(sent)}`,
    );
    expect(puts, 'exactly one PUT').toHaveLength(1);
    expect(cs.writes, 'no other write').toHaveLength(1);
    expect(sent.selected_type).toBe(CheckoutType.HYBRID);
    expect(sent.point_bonus).toBe(10);
    expect(sent.cash).toEqual({ enabled: true, point: 200 });
    expect(sent.card).toEqual(ORIGINAL_FLAG.card);
    expect(sent.gift_card).toEqual(ORIGINAL_FLAG.gift_card);
    expect(sent.other).toEqual(ORIGINAL_FLAG.other);
    expect(sent.earn_on_tip).toBe(ORIGINAL_FLAG.earn_on_tip);
    // UI after the (overlaid) refetch.
    await expect(cs.radio(CheckoutType.HYBRID)).toBeChecked();
    await expect(cs.pointBonusInput).toHaveValue('10');
    await expect(cs.pointInput('Cash')).toHaveValue('$2.00');
    await scrollToTop(cs.checkoutTitle);
    await annotate(cs.card(CheckoutType.HYBRID), 'Hybrid · bonus 10', '#16a34a');
    await annotate(v.tile('Cash'), 'Cash $2.00', '#2563eb');
    await shot(
      page,
      'VP-5098_TC08_mocked_save_both_toast',
      'TC08 · MOCKED save (no data written): 1 PUT with Hybrid/10 + Cash $2.00 → toast "Point and checkout settings saved."',
    );
  });

  test('TC09 — chỉ sửa Point config → toast "Point settings saved", type/bonus giữ nguyên (mocked)', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    await cs.setPointRate('Card', 300);
    await cs.saveAndWait();
    await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toBeVisible();
    const sent = cs.lastWrittenConfig();
    log(`TC09 body=${JSON.stringify(sent)}`);
    expect(cs.sysSettingWrites()).toHaveLength(1);
    expect(sent.selected_type).toBe(ORIGINAL_FLAG.selected_type);
    expect(sent.point_bonus).toBe(ORIGINAL_FLAG.point_bonus);
    expect(sent.card).toEqual({ enabled: true, point: 300 });
    expect(sent.cash).toEqual(ORIGINAL_FLAG.cash);
    await scrollToTop(vp(cs).pointStep, 260);
    await annotate(vp(cs).tile('Card'), 'Card $3.00', '#2563eb');
    await shot(
      page,
      'VP-5098_TC09_mocked_save_point_only_toast',
      'TC09 · MOCKED save: rate only → "Point settings saved"; payload keeps Manual / bonus 0',
    );
  });

  test('TC10 — chỉ đổi Checkout type → toast "Checkout setting saved.", Point config giữ nguyên (mocked)', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    await cs.selectType(CheckoutType.AUTO);
    await cs.saveAndWait();
    await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
    const sent = cs.lastWrittenConfig();
    log(`TC10 body=${JSON.stringify(sent)}`);
    expect(cs.sysSettingWrites()).toHaveLength(1);
    expect(sent.selected_type).toBe(CheckoutType.AUTO);
    expect(sent.point_bonus).toBe(ORIGINAL_FLAG.point_bonus);
    for (const { key } of PointMethods) expect(sent[key], key).toEqual(ORIGINAL_FLAG[key]);
    await scrollToTop(cs.checkoutTitle);
    await shot(
      page,
      'VP-5098_TC10_mocked_save_checkout_only_toast',
      'TC10 · MOCKED save: type only (Auto) → "Checkout setting saved."; 4 rates unchanged in payload',
    );
  });

  test('TC11 — Point Bonus rỗng → lỗi "Point bonus is required", Save không gửi request', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    await cs.selectType(CheckoutType.HYBRID);
    await cs.fillPointBonus('');
    await expect(cs.saveBar).toBeVisible();
    await page.waitForTimeout(600); // let the floating bar finish sliding in
    // Raw mouse click, like a user: locator.click() auto-scrolls the overflow:hidden app shell
    // while the bar is still animating, which shifted the whole layout in the first run (script artifact).
    const btn = await cs.saveButton.boundingBox();
    await page.mouse.click(btn!.x + btn!.width / 2, btn!.y + btn!.height / 2);
    await expect(cs.bonusError(CheckoutMessages.BONUS_REQUIRED)).toBeVisible();
    await page.waitForTimeout(800);
    expect(cs.writes, 'no request sent').toHaveLength(0);
    const shellTop = await page.locator('[data-slot="pos-shell"]').evaluate((e) => e.scrollTop);
    expect(shellTop, 'app shell not shifted').toBe(0);
    await annotate(
      cs.card(CheckoutType.HYBRID),
      'empty Point Bonus → "Point bonus is required"',
      '#e11d48',
    );
    await shot(
      page,
      'VP-5098_TC11_point_bonus_required',
      'TC11 · Hybrid + empty Point Bonus → user clicks Save → blocked, red field + "Point bonus is required", no request',
    );
    await cs.discardIfDirty();
  });

  test('TC12 — Discard trả về giá trị đã lưu (type + bonus + rates)', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    await cs.selectType(CheckoutType.HYBRID);
    await cs.fillPointBonus('25');
    await cs.setPointRate('Other', 0);
    await expect(cs.saveBar).toBeVisible();
    await cs.discardIfDirty();
    await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
    await expect(cs.pointBonusInput).toHaveCount(0);
    for (const [label, val] of Object.entries(STORED_UI))
      await expect(cs.pointInput(label)).toHaveValue(val);
    await expect(vp(cs).pill('Other')).toHaveText('Earning');
    expect(cs.writes).toHaveLength(0);
    await scrollToTop(cs.checkoutTitle);
    await shot(
      page,
      'VP-5098_TC12_discard_back_to_stored',
      'TC12 · after Discard: Manual, rates $0.50 / $0.01 / $2.00 / $1.00 — no request sent',
    );
  });

  test('TC13 — click label "Cash" ở tile point → focus ô cashPoint, không bật/tắt switch Cash của Payment methods', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    await open(cs);
    const v = vp(cs);
    const pmCash = page
      .locator('[data-slot="pos-switch-row"]')
      .filter({
        has: page.locator('[data-slot="pos-switch-row-label"]', { hasText: /^Cash$/ }),
      })
      .getByRole('switch');
    await expect(pmCash).toHaveCount(1);
    const before = await pmCash.getAttribute('aria-checked');
    const ids = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
      const labels = Array.from(document.querySelectorAll('label[for]')).map((l) =>
        l.getAttribute('for')!,
      );
      return {
        dupIds: Array.from(new Set(all.filter((id, i) => all.indexOf(id) !== i))),
        pointFor: Array.from(
          document.querySelectorAll('[data-slot="point-conversion-tile"] label'),
        ).map((l) => l.getAttribute('for')),
        dupLabelFor: Array.from(new Set(labels.filter((id, i) => labels.indexOf(id) !== i))),
      };
    });
    log(`TC13 ids: ${JSON.stringify(ids)} pmCash aria-checked=${before}`);
    expect(ids.dupIds, 'no duplicate DOM ids on the tab').toEqual([]);
    expect(ids.pointFor).toEqual(['cashPoint', 'cardPoint', 'giftCardPoint', 'otherPoint']);

    await v.tile('Cash').locator('label').click();
    await expect(page.locator('#cashPoint')).toBeFocused();
    await expect(pmCash).toHaveAttribute('aria-checked', before!);
    await expect(cs.saveBar, 'clicking a label dirties nothing').toBeHidden();
    await v.tile('Gift card').locator('label').click();
    await expect(page.locator('#giftCardPoint')).toBeFocused();
    await scrollToTop(v.pointStep, 260);
    await annotate(v.tile('Gift card'), 'label click → its rate input focused', '#2563eb');
    await shot(
      page,
      'VP-5098_TC13_label_click_focuses_rate',
      `TC13 · label click focuses the rate input (cashPoint/giftCardPoint); Payment methods Cash switch unchanged (aria-checked=${before})`,
    );
    expect(cs.writes).toHaveLength(0);
  });
});
