import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import {
  CheckoutType,
  POINT_CONFIG_FLAG,
  PointMethods,
  type CheckoutSettingPage,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import { PROD_STORE, SHOTS_DIR, scrollToTop, shot } from './_shared';

/**
 * VP-4489 — PROD #20258, REAL write (opt-in: VP4489_REAL_WRITE=1).
 * Saves the shop's target config (Auto Checkout · Point Bonus 1 · every method $0.00 = No points),
 * reloads to prove it persists (no silent flip back to Manual / $1 = 1 point), then RESTORES the
 * exact original flag value and proves it via reload + API deep-equal.
 */
const ALLOW = process.env.VP4489_REAL_WRITE === '1';
/** Guard: abort if someone else changed the flag since the read-only exploration. */
const EXPECTED_UPDATED_AT = process.env.VP4489_EXPECTED_UPDATED_AT ?? '2026-10-14T03:11:32+00:00';

const cents = (raw: string): number => Number(raw.replace(/\D/g, '') || '0');

async function reload(cs: CheckoutSettingPage): Promise<void> {
  await cs.page.reload({ waitUntil: 'domcontentloaded' });
  await cs.waitForReady();
}

/** Key-order-independent JSON. */
const canon = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
};
const sameValue = (a: PointPaymentConfigValue, b: PointPaymentConfigValue): boolean =>
  canon(a) === canon(b);

test.describe('VP-4489 PROD #20258 — real save + restore', () => {
  test.skip(!ALLOW, 'real write on PROD — set VP4489_REAL_WRITE=1');
  test.describe.configure({ mode: 'serial' });

  test('TC05 — lưu thật Auto + bonus 1 + No points, reload vẫn giữ; khôi phục nguyên trạng', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    test.setTimeout(240_000);
    await cs.goto();
    const origFlag = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
    const orig = origFlag.value;
    fs.writeFileSync(
      `${SHOTS_DIR}/../original-flag-backup.json`,
      JSON.stringify(origFlag, null, 2),
    );
    console.log('ORIGINAL', origFlag.updatedAt, JSON.stringify(orig));
    expect(origFlag.updatedAt, 'flag unchanged since exploration (no concurrent editor)').toBe(
      EXPECTED_UPDATED_AT,
    );
    await expect(cs.saveBar).toBeHidden();

    const origCents: Record<string, number> = {};
    for (const { label, key } of PointMethods)
      origCents[label] = orig[key].enabled ? orig[key].point : 0;

    let changed = false;
    try {
      // --- 1. Shop's target config, one Save --------------------------------------------------
      await cs.selectType(CheckoutType.AUTO);
      await cs.fillPointBonus('1');
      for (const { label } of PointMethods) await cs.setPointRate(label, 0);
      changed = true;
      await cs.saveToBackend();
      await scrollToTop(cs.checkoutTitle);
      await shot(
        page,
        'VP-4489_TC05a_real_save_auto_bonus1_nopoints_toast',
        'REAL save: Auto · bonus 1 · all No points',
      );

      // --- 2. Reload: still Auto / 1 / No points ------------------------------------------------
      await reload(cs);
      await expect(cs.radio(CheckoutType.AUTO)).toBeChecked();
      await expect(cs.pointBonusInput).toHaveValue('1');
      for (const { label } of PointMethods)
        expect(cents(await cs.pointInput(label).inputValue()), label).toBe(0);
      await expect(cs.radio(CheckoutType.MANUAL)).not.toBeChecked();
      await scrollToTop(cs.checkoutTitle);
      await shot(
        page,
        'VP-4489_TC05b_after_reload_auto_bonus1_nopoints_persisted',
        'after reload: Auto · bonus 1 · No points persisted',
      );
      const saved = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG)).value;
      console.log('SAVED (API)', JSON.stringify(saved));
      expect(saved.selected_type).toBe(CheckoutType.AUTO);
      expect(saved.point_bonus).toBe(1);
      for (const { key } of PointMethods) expect(saved[key]).toEqual({ enabled: false, point: 0 });
      expect(saved.earn_on_tip).toBe(orig.earn_on_tip);
    } finally {
      if (changed) {
        // --- 3. Restore: (a) bonus back on a bonus type + original rates, (b) original type -----
        await reload(cs);
        await cs.selectType(CheckoutType.AUTO);
        await cs.fillPointBonus(String(orig.point_bonus));
        for (const { label } of PointMethods) await cs.setPointRate(label, origCents[label]);
        if (await cs.saveBar.isVisible()) await cs.saveToBackend();
        if (orig.selected_type !== CheckoutType.AUTO) {
          await cs.selectType(orig.selected_type);
          if (await cs.saveBar.isVisible()) await cs.saveToBackend();
        }
        let restored = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG))
          .value;
        if (!sameValue(restored, orig)) {
          console.log('UI restore mismatch → API PUT original', JSON.stringify(restored));
          const r = await page.request.put(`${dataApiUrl}/sys_settings/${origFlag.id}`, {
            headers: {
              'x-merch-id': PROD_STORE,
              Accept: 'application/ld+json',
              'Content-Type': 'application/ld+json',
            },
            data: { value: orig },
            failOnStatusCode: false,
          });
          console.log('API PUT status', r.status());
          restored = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG)).value;
        }
        console.log('RESTORED (API)', JSON.stringify(restored));
        fs.writeFileSync(`${SHOTS_DIR}/../restored-flag.json`, JSON.stringify(restored, null, 2));
        expect(sameValue(restored, orig), 'flag restored exactly').toBe(true);

        await reload(cs);
        await expect(cs.radio(orig.selected_type)).toBeChecked();
        for (const { label } of PointMethods) {
          expect(cents(await cs.pointInput(label).inputValue()), `${label} restored`).toBe(
            origCents[label],
          );
        }
        await scrollToTop(cs.checkoutTitle);
        await shot(
          page,
          'VP-4489_TC05c_restored_original_after_reload',
          `RESTORED: ${orig.selected_type} · bonus ${orig.point_bonus} · rates as before`,
        );
      }
    }
  });
});
