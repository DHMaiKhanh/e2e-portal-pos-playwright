import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import {
  CheckoutMessages,
  CheckoutType,
  POINT_CONFIG_FLAG,
  PointMethods,
  type CheckoutSettingPage,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import {
  LOCK_DIR,
  ORIGINAL,
  OUT_DIR,
  PROD_STORE,
  canon,
  isOriginal,
  scrollToTop,
  shot,
} from './_shared';

/**
 * VP-4590 — PROD #20258, REAL writes (opt-in: VP4590_REAL_WRITE=1), under the shared lock dir.
 * Auto/5 → reload · Hybrid/7 → reload · Point-config-only save keeps Hybrid/7 · Manual save keeps
 * bonus 7 · then RESTORE the exact original flag and prove it via API deep-equal + reload.
 */
const ALLOW = process.env.VP4590_REAL_WRITE === '1';
const cents = (raw: string): number => Number(raw.replace(/\D/g, '') || '0');
const log: Record<string, unknown>[] = [];

async function reload(cs: CheckoutSettingPage): Promise<void> {
  await cs.page.reload({ waitUntil: 'domcontentloaded' });
  await cs.waitForReady();
}

async function acquireLock(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      fs.mkdirSync(LOCK_DIR);
      return;
    } catch {
      console.log(`lock busy (${new Date().toISOString()}), retry in 15s`);
      await new Promise((r) => setTimeout(r, 15_000));
    }
  }
  throw new Error('could not acquire checkout-flag lock in 15 min');
}

test.describe('VP-4590 PROD #20258 — real save + restore', () => {
  test.skip(!ALLOW, 'real write on PROD — set VP4590_REAL_WRITE=1');

  test('TC03/22/23/24/30/31 real — save, reload, keep keys; restore original', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    test.setTimeout(1_200_000);
    const puts: unknown[] = [];
    page.on('request', (r) => {
      if (r.method() === 'PUT' && /\/sys_settings\//.test(r.url()))
        puts.push({ at: new Date().toISOString(), url: r.url(), body: r.postData() });
    });
    await cs.goto();
    await acquireLock();
    const t0 = Date.now();
    const el = () => `${Math.round((Date.now() - t0) / 1000)}s`;
    let changed = false;
    let flagId = '';
    try {
      await reload(cs);
      const pre = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
      flagId = pre.id;
      fs.writeFileSync(`${OUT_DIR}/flag-before-real-save.json`, JSON.stringify(pre, null, 2));
      log.push({ step: 'pre', at: el(), updatedAt: pre.updatedAt, value: pre.value });
      expect(
        isOriginal(pre.value),
        'flag == original before writing (else another agent is mid-write)',
      ).toBe(true);
      await expect(cs.saveBar).toBeHidden();

      // 1. Auto / 5 ---------------------------------------------------------------------------
      await cs.selectType(CheckoutType.AUTO);
      await cs.fillPointBonus('5');
      changed = true;
      await cs.saveToBackend();
      await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
      await scrollToTop(cs.checkoutTitle, 90);
      await shot(
        page,
        'VP-4590_TC22_REAL_save_auto5_toast',
        'TC22 REAL save: Auto Checkout · Point Bonus 5 → toast "Checkout setting saved."',
      );
      await reload(cs);
      await expect(cs.radio(CheckoutType.AUTO)).toBeChecked();
      await expect(cs.pointBonusInput).toHaveValue('5');
      let api = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG)).value;
      log.push({ step: 'auto5', at: el(), api });
      expect(api).toMatchObject({
        selected_type: 'auto_checkout',
        point_bonus: 5,
        earn_on_tip: true,
      });
      for (const { key } of PointMethods)
        expect(api[key], `TC30 ${key} kept`).toEqual(ORIGINAL[key]);
      await scrollToTop(cs.checkoutTitle, 90);
      await shot(
        page,
        'VP-4590_TC03_REAL_reload_auto5_persisted',
        `TC03/30 REAL: after reload → Auto Checkout · bonus 5 · Point config kept (API ${canon({ c: api.cash.point, d: api.card.point, g: api.gift_card.point, o: api.other.point })} cents)`,
      );

      // 2. Hybrid / 7 (bonus follows the card switch, then edited) ------------------------------
      await cs.selectType(CheckoutType.HYBRID);
      await expect(cs.pointBonusInput).toHaveValue('5');
      await cs.fillPointBonus('7');
      await cs.saveToBackend();
      await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT)).toBeVisible();
      await reload(cs);
      await expect(cs.radio(CheckoutType.HYBRID)).toBeChecked();
      await expect(cs.pointBonusInput).toHaveValue('7');
      api = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG)).value;
      log.push({ step: 'hybrid7', at: el(), api });
      expect(api).toMatchObject({ selected_type: 'hybrid_checkout', point_bonus: 7 });
      for (const { key } of PointMethods) expect(api[key]).toEqual(ORIGINAL[key]);
      await scrollToTop(cs.checkoutTitle, 90);
      await shot(
        page,
        'VP-4590_TC23_REAL_reload_hybrid7_persisted',
        'TC23 REAL: Hybrid · bonus 7 saved → after reload Hybrid Checkout · Point Bonus 7',
      );

      // 3. Point-config-only save keeps checkout type + bonus ----------------------------------
      await cs.setPointRate('Cash', 75);
      await cs.saveToBackend();
      await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toBeVisible();
      await scrollToTop(cs.pointConfigTitle, 200);
      await shot(
        page,
        'VP-4590_TC31_REAL_point_config_only_save_toast',
        'TC31 REAL: only Cash $0.50 → $0.75 saved → toast "Point settings saved"',
      );
      api = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG)).value;
      log.push({ step: 'cash75', at: el(), api });
      expect(api).toMatchObject({
        selected_type: 'hybrid_checkout',
        point_bonus: 7,
        cash: { enabled: true, point: 75 },
        earn_on_tip: true,
      });

      // 4. Manual + Cash back to $0.50 in one save → bonus 7 kept ------------------------------
      await cs.selectType(CheckoutType.MANUAL);
      await cs.setPointRate('Cash', 50);
      await cs.saveToBackend();
      await expect(cs.toast(CheckoutMessages.SAVED_BOTH)).toBeVisible();
      await reload(cs);
      await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
      await expect(cs.pointBonusInput).toHaveCount(0);
      api = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG)).value;
      log.push({ step: 'manual-keeps-7', at: el(), api });
      expect(api).toMatchObject({
        selected_type: 'payment_method',
        point_bonus: 7,
        cash: { enabled: true, point: 50 },
      });
      await cs.selectType(CheckoutType.AUTO);
      await expect(cs.pointBonusInput).toHaveValue('7');
      await scrollToTop(cs.checkoutTitle, 90);
      await shot(
        page,
        'VP-4590_TC24_REAL_manual_saved_bonus7_kept',
        'TC24 REAL: Manual + Cash $0.50 saved ("Point and checkout settings saved.") → API selected_type=payment_method, point_bonus=7 kept · Auto re-picked shows 7 (not saved)',
      );
      await cs.discardIfDirty();
    } finally {
      try {
        if (changed) {
          // 5. Restore: Auto + bonus 0 (+ rates), then Manual -----------------------------------
          await reload(cs).catch(() => undefined);
          try {
            await cs.selectType(CheckoutType.AUTO);
            await cs.fillPointBonus(String(ORIGINAL.point_bonus));
            for (const { label, key } of PointMethods)
              await cs.setPointRate(label, ORIGINAL[key].enabled ? ORIGINAL[key].point : 0);
            if (await cs.saveBar.isVisible()) await cs.saveToBackend();
            await cs.selectType(CheckoutType.MANUAL);
            if (await cs.saveBar.isVisible()) await cs.saveToBackend();
          } catch (e) {
            console.log('UI restore error', String(e));
          }
          let restored = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG))
            .value;
          if (!isOriginal(restored)) {
            console.log('UI restore mismatch → API PUT original', canon(restored));
            const r = await page.request.put(`${dataApiUrl}/sys_settings/${flagId}`, {
              headers: {
                'x-merch-id': PROD_STORE,
                Accept: 'application/ld+json',
                'Content-Type': 'application/ld+json',
              },
              data: { value: ORIGINAL },
              failOnStatusCode: false,
            });
            console.log('API PUT status', r.status());
            restored = (await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG))
              .value;
          }
          const after = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
          fs.writeFileSync(`${OUT_DIR}/flag-after-restore.json`, JSON.stringify(after, null, 2));
          log.push({
            step: 'restored',
            at: el(),
            equalsOriginal: isOriginal(after.value),
            updatedAt: after.updatedAt,
            api: after.value,
          });
          await reload(cs);
          await expect(cs.radio(CheckoutType.MANUAL)).toBeChecked();
          for (const { label, key } of PointMethods)
            expect(cents(await cs.pointInput(label).inputValue()), label).toBe(ORIGINAL[key].point);
          await scrollToTop(cs.checkoutTitle, 90);
          await shot(
            page,
            'VP-4590_RESTORE_REAL_original_after_reload',
            `RESTORED (API deep-equal original = ${isOriginal(after.value)}) → reload: Manual · bonus 0 · Cash $0.50 · Card $0.01 · Gift $2.00 · Other $1.00 · earn on tip ON`,
          );
          expect(isOriginal(after.value), 'flag restored exactly').toBe(true);
        }
      } finally {
        fs.rmdirSync(LOCK_DIR);
        log.push({ step: 'lock released', at: el() });
        fs.writeFileSync(`${OUT_DIR}/real-save-log.json`, JSON.stringify({ log, puts }, null, 2));
        console.log('REAL LOG', JSON.stringify(log.map((l) => ({ step: l.step, at: l.at }))));
      }
    }
  });
});
