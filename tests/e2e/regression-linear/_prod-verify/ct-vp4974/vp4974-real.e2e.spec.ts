import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import type { Route } from '@playwright/test';
import {
  CheckoutMessages,
  CheckoutType,
  type CheckoutSettingPage,
  type CheckoutTypeValue,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import {
  LOCK_DIR,
  ORIGINAL,
  OUT_DIR,
  PROD_STORE,
  canon,
  expectUiShows,
  fmtFlag,
  focusCard,
  isOriginal,
  panel,
  readFlag,
  record,
  saveBarText,
  shot,
} from './_shared';

/**
 * VP-4974 — PROD #20258, REAL round trip (opt-in: VP4974_REAL_WRITE=1).
 *
 * Draft Point Bonus on Auto → back to Manual → REAL Save. Under Manual the Portal writes the stored
 * bonus, so the PUT carries exactly the original flag value (a no-op write; only updatedAt moves).
 * A route guard aborts any PUT whose value is not byte-for-byte the original, and any other write.
 * The shared flag is serialized with the other agents through an atomic mkdir lock (≤3 min).
 */
const ALLOW = process.env.VP4974_REAL_WRITE === '1';
const { MANUAL, AUTO, HYBRID } = CheckoutType;
const SYS_SETTING_ITEM = /\/sys_settings\/([^/?.]+)/;

async function acquireLock(): Promise<number> {
  for (let i = 0; i < 40; i++) {
    try {
      fs.mkdirSync(LOCK_DIR); // atomic: fails if another agent holds it
      fs.writeFileSync(`${LOCK_DIR}/owner.txt`, `ct-vp4974 ${new Date().toISOString()}\n`);
      return Date.now();
    } catch {
      console.log(`lock busy (${i}) → retry in 15s`);
      await new Promise((r) => setTimeout(r, 15_000));
    }
  }
  throw new Error('could not acquire checkout-flag lock');
}

function releaseLock(): void {
  try {
    fs.rmSync(`${LOCK_DIR}/owner.txt`, { force: true });
    fs.rmdirSync(LOCK_DIR);
  } catch (e) {
    console.log('lock release error', e);
  }
}

async function expectSaved(
  cs: CheckoutSettingPage,
  type: CheckoutTypeValue,
  saved: string,
): Promise<void> {
  await cs.selectType(type);
  await expect(cs.pointBonusInput, 'shows the SAVED bonus, not the draft').toHaveValue(saved);
  await expect(cs.pointBonusInput).not.toHaveAttribute('aria-invalid', 'true');
  await expect(cs.typeGroup.getByText(/^Point bonus /)).toHaveCount(0);
}

test.describe('VP-4974 PROD #20258 — real Manual save round trip', () => {
  test.skip(!ALLOW, 'real write on PROD — set VP4974_REAL_WRITE=1');

  test('TC20 — REAL: draft "abc" / "5" ở Auto → Manual → Save thật → Auto/Hybrid + reload + API = giá trị đã lưu', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    test.setTimeout(900_000);
    const puts: { body: unknown; status?: number; allowed: boolean }[] = [];

    // Write guard: only a PUT whose value is exactly ORIGINAL may reach the backend.
    await page.route('**/*', async (route: Route) => {
      const req = route.request();
      const m = req.method().toUpperCase();
      const url = req.url();
      if (
        ['GET', 'HEAD', 'OPTIONS'].includes(m) ||
        !/\/\/volt-pos\./.test(url) ||
        /\/refresh_token(\?|$)/.test(url)
      ) {
        await route.fallback();
        return;
      }
      let body: unknown = null;
      try {
        body = req.postDataJSON();
      } catch {
        body = req.postData();
      }
      const value = (body as { value?: unknown } | null)?.value;
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      const allowed = m === 'PUT' && SYS_SETTING_ITEM.test(url) && isOriginal(parsed);
      puts.push({ body, allowed });
      console.log(`${allowed ? 'ALLOW' : 'BLOCK'} ${m} ${url} ${JSON.stringify(body)}`);
      if (allowed) await route.continue();
      else await route.abort();
    });

    const t0 = await acquireLock();
    let flagId = '';
    try {
      await cs.goto();
      const before = await readFlag(page);
      flagId = before.id;
      console.log('BEFORE', before.updatedAt, canon(before.value));
      expect(isOriginal(before.value), 'flag == original before the real round trip').toBe(true);
      await expectUiShows(cs, before.value);
      await focusCard(cs);
      await panel(page, `API before (updatedAt ${before.updatedAt})`, fmtFlag(before.value));
      await shot(
        page,
        'VP-4974_TC20_1_real_before_api_original',
        'REAL run · lock held · API flag = original (Manual · bonus 0)',
      );
      await panel(page, null);

      let lastUpdatedAt = before.updatedAt;
      for (const [i, draft] of ['abc', '5'].entries()) {
        const tag = draft === 'abc' ? 'abc' : 'valid5';
        const reopen = i === 0 ? HYBRID : AUTO;
        const typeIn = i === 0 ? AUTO : HYBRID;
        const pfx = `VP-4974_TC20_${tag}`;

        await cs.selectType(typeIn);
        await expect(cs.pointBonusInput).toHaveValue('0');
        await cs.fillPointBonus(draft);
        if (draft === 'abc')
          await expect(cs.bonusError(CheckoutMessages.BONUS_WHOLE_NUMBER)).toBeVisible();
        await focusCard(cs);
        await shot(
          page,
          `${pfx}_2_draft_typed`,
          `REAL · ${typeIn === AUTO ? 'Auto' : 'Hybrid'} · draft "${draft}"${draft === 'abc' ? ' → error "Point bonus must be a whole number of 0 or more"' : ' (valid)'}`,
        );

        await cs.selectType(MANUAL);
        await expect(cs.saveBar).toBeVisible();
        await shot(
          page,
          `${pfx}_3_switched_manual`,
          `REAL · back to Manual · bar "${await saveBarText(cs)}"`,
        );

        const resp = page.waitForResponse(
          (r) => r.request().method() === 'PUT' && SYS_SETTING_ITEM.test(r.url()),
        );
        await cs.save();
        const r = await resp;
        expect(r.ok(), `real PUT ok (${r.status()})`).toBe(true);
        await expect(cs.saveBar).toBeHidden({ timeout: 15_000 });
        await expect(cs.toast(CheckoutMessages.SAVED_CHECKOUT).first()).toBeVisible();
        await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toHaveCount(0);
        const toasts = (await page.locator('[data-sonner-toast]').allInnerTexts()).map((t) =>
          t.trim(),
        );
        const sentBody = puts.at(-1)?.body as { value: PointPaymentConfigValue };
        await panel(
          page,
          `REAL PUT /sys_settings/${flagId} → ${r.status()}`,
          fmtFlag(typeof sentBody.value === 'string' ? JSON.parse(sentBody.value) : sentBody.value),
        );
        await shot(
          page,
          `${pfx}_4_real_save_toast`,
          `REAL Save → ${r.status()} · toast "${toasts.join(' | ')}" · PUT = Manual · point_bonus 0`,
        );
        await panel(page, null);

        // Re-open Auto/Hybrid after the REAL save (app refetched the stored flag).
        await expectSaved(cs, reopen, '0');
        await shot(
          page,
          `${pfx}_5_reopen_${reopen === HYBRID ? 'hybrid' : 'auto'}_shows_saved`,
          `REAL · after Save → open ${reopen === HYBRID ? 'Hybrid' : 'Auto'}: Point Bonus = "0" (saved), not "${draft}" · no error`,
        );
        await expectSaved(cs, typeIn, '0');
        await shot(
          page,
          `${pfx}_6_reopen_${typeIn === HYBRID ? 'hybrid' : 'auto'}_shows_saved`,
          `REAL · open ${typeIn === HYBRID ? 'Hybrid' : 'Auto'} (where "${draft}" was typed): Point Bonus = "0"`,
        );
        await cs.discardIfDirty();
        await expect(cs.radio(MANUAL)).toBeChecked();

        // Reload → stored state from the backend.
        await page.reload({ waitUntil: 'domcontentloaded' });
        await cs.waitForReady();
        await expectUiShows(cs, ORIGINAL);
        await expectSaved(cs, reopen, '0');
        const after = await readFlag(page);
        console.log(`AFTER ${tag}`, after.updatedAt, canon(after.value));
        expect(isOriginal(after.value), 'API value after real save = original').toBe(true);
        console.log(
          `updatedAt ${lastUpdatedAt} → ${after.updatedAt} (moved: ${after.updatedAt !== lastUpdatedAt})`,
        );
        lastUpdatedAt = after.updatedAt;
        await focusCard(cs);
        await panel(
          page,
          `API after REAL save (updatedAt ${after.updatedAt})`,
          fmtFlag(after.value),
        );
        await shot(
          page,
          `${pfx}_7_after_reload_${reopen === HYBRID ? 'hybrid' : 'auto'}_and_api`,
          `REAL · after reload: open ${reopen === HYBRID ? 'Hybrid' : 'Auto'} → "0" · API point_bonus 0 (= saved)`,
        );
        await panel(page, null);
        await cs.discardIfDirty();
        record({ tc: `TC20_${tag}`, status: r.status(), toasts, sent: sentBody, apiAfter: after });
      }

      // Final evidence while still holding the lock.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await cs.waitForReady();
      await expectUiShows(cs, ORIGINAL);
      await expect(cs.pointBonusInput).toHaveCount(0);
      await expect(cs.saveBar).toBeHidden();
      const fin = await readFlag(page);
      expect(isOriginal(fin.value)).toBe(true);
      await focusCard(cs);
      await panel(page, `FINAL API (updatedAt ${fin.updatedAt})`, fmtFlag(fin.value));
      await shot(
        page,
        'VP-4974_TC20_9_final_flag_equals_original',
        'FINAL · flag = original (Manual · bonus 0 · cash 50 / card 1 / gift 200 / other 100 · earn_on_tip true)',
      );
    } finally {
      // Restore guard: if anything differs, PUT the original back.
      let now = await readFlag(page);
      if (!isOriginal(now.value)) {
        console.log('RESTORE via API PUT', canon(now.value));
        await page.unroute('**/*');
        const res = await page.request.put(`${dataApiUrl}/sys_settings/${now.id}`, {
          headers: {
            'x-merch-id': PROD_STORE,
            Accept: 'application/ld+json',
            'Content-Type': 'application/ld+json',
          },
          data: { value: ORIGINAL },
          failOnStatusCode: false,
        });
        console.log('restore PUT', res.status());
        now = await readFlag(page);
      }
      fs.writeFileSync(`${OUT_DIR}/final-flag.json`, JSON.stringify(now, null, 2));
      console.log(
        'FINAL',
        now.updatedAt,
        canon(now.value),
        'lock held',
        Math.round((Date.now() - t0) / 1000),
        's',
      );
      releaseLock();
      expect(isOriginal(now.value), 'flag == original at the end').toBe(true);
    }
    expect(
      puts.filter((p) => !p.allowed),
      'no non-original write attempted',
    ).toHaveLength(0);
  });
});
