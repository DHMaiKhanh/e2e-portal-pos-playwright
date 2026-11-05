import { test, expect } from '@fixtures/index';
import type { Locator, Page } from '@playwright/test';
import * as fs from 'fs';
import { env } from '@configs/env/loadEnv';
import {
  CheckoutMessages,
  CheckoutType,
  type CheckoutSettingPage,
  POINT_CONFIG_FLAG,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';

/**
 * VP-4812 — PROD evidence run on store #20258 only (ad-hoc, not part of the suite).
 * - "mocked" tests: PUT /sys_settings is faked (CheckoutSettingPage.mockSettingWrites) — no prod write.
 * - "REAL" test: one real round trip (toggle → save → reload → restore → reload), original value
 *   recorded first and restored in a finally block, verified via API + reload screenshot.
 */
const SCRATCH =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4812';
const SHOTS = `${SCRATCH}/shots`;
const DESCRIPTION = 'Count the tip in the amount that earns points.';

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeAll(() => {
  expect(env.STORE_ID, 'PROD verification must only touch store #20258').toBe('20258');
  expect(env.BASE_URL).toContain('v2.fastboypay.com');
  fs.mkdirSync(SHOTS, { recursive: true });
});

const nowUtc7 = (): { date: string; time: string; full: string } => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    date,
    time: `${parts.hour}:${parts.minute}`,
    full: `${date} ${parts.hour}:${parts.minute}:${parts.second}`,
  };
};

/** Fixed overlay with the verification stamp (+ optional detail lines), then a 1920x1080 shot. */
async function shot(page: Page, name: string, extra: string[] = []): Promise<void> {
  const { date, time } = nowUtc7();
  const head = `Verified on PROD ${date} ${time} (UTC+7) · store #20258`;
  await page.evaluate(
    ([h, lines]) => {
      document.getElementById('__vp_stamp')?.remove();
      const d = document.createElement('div');
      d.id = '__vp_stamp';
      d.style.cssText =
        'position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
        'background:#fff3cd;color:#5c3b00;border:2px solid #e0a800;border-radius:6px;padding:5px 12px;' +
        'font:600 13px/1.4 system-ui,Segoe UI,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25);' +
        'pointer-events:none;max-width:1150px;text-align:center;white-space:pre-wrap';
      const b = document.createElement('div');
      b.textContent = h as string;
      b.style.fontSize = '14px';
      d.appendChild(b);
      for (const l of lines as string[]) {
        const e = document.createElement('div');
        e.textContent = l;
        e.style.fontWeight = '500';
        d.appendChild(e);
      }
      document.body.appendChild(d);
    },
    [head, extra] as const,
  );
  // Undo automation-only scrolls: Playwright's click auto-scroll also scrolls overflow-hidden
  // wrappers (the app shell), which a real user can never do. Only real scroll panes keep theirs.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      if (el.scrollTop === 0 && el.scrollLeft === 0) continue;
      const oy = getComputedStyle(el).overflowY;
      if (oy !== 'auto' && oy !== 'scroll') {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    }
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/**
 * Bring `loc` into view by scrolling only its nearest scrollable ancestor (the app's content pane),
 * then reset the document scroll — Playwright's scrollIntoViewIfNeeded also scrolls the
 * overflow-hidden document and shifts the whole app shell off-screen in screenshots.
 */
async function reveal(loc: Locator, where: 'center' | 'top' = 'center'): Promise<void> {
  await loc.first().waitFor({ state: 'visible' });
  await loc.first().evaluate((el, w) => {
    let p: HTMLElement | null = el.parentElement;
    while (p) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) break;
      p = p.parentElement;
    }
    const r = el.getBoundingClientRect();
    if (p) {
      const pr = p.getBoundingClientRect();
      const offset = w === 'top' ? 70 : (p.clientHeight - r.height) / 2;
      p.scrollTop += r.top - pr.top - offset;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, where);
  await loc.page().waitForTimeout(250);
}

async function outline(loc: Locator, color = '#e11d48'): Promise<void> {
  await loc.evaluate((el, c) => {
    (el as HTMLElement).style.outline = `3px solid ${c}`;
    (el as HTMLElement).style.outlineOffset = '4px';
  }, color);
}

/** The Tip step block (nearest ancestor of the "Tip" title that also holds the switch). */
const tipBlock = (cs: CheckoutSettingPage): Locator =>
  cs.tipStepTitle.locator('xpath=ancestor::*[.//*[@id="earnOnTip"]][1]');

const isOn = async (cs: CheckoutSettingPage): Promise<boolean> =>
  (await cs.earnOnTipSwitch.getAttribute('aria-checked')) === 'true';

const omitTip = (v: PointPaymentConfigValue): Omit<PointPaymentConfigValue, 'earn_on_tip'> => {
  const { earn_on_tip: _ignored, ...rest } = v;
  return rest;
};

test.describe('VP-4812 PROD evidence — mocked writes (no prod write)', () => {
  test.beforeEach(async ({ checkoutSettingPage }) => {
    await checkoutSettingPage.mockSettingWrites();
    await checkoutSettingPage.goto();
  });

  test('TC01/TC02 — Tip step visible, label + help text, shows stored value (default ON)', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const flag = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
    const def = (flag.config?.default_value as PointPaymentConfigValue | undefined)?.earn_on_tip;
    fs.writeFileSync(`${SCRATCH}/flag-at-tc01.json`, JSON.stringify(flag, null, 2));

    // Whole card: Point config (rates) + Checkout type + Tip step.
    await reveal(cs.pointConfigTitle, 'top');
    await shot(page, 'VP-4812_TC01_card_point_config_and_checkout', [
      'Store Settings › Payment & transactions — "Setting point config" + "Checkout setting" share ONE form/flag merchant_point_payment_config',
    ]);

    await reveal(tipBlock(cs));
    await expect(cs.tipStepTitle).toBeVisible();
    await expect(cs.earnOnTipSwitch).toBeVisible();
    await expect(cs.earnOnTipSwitch).toBeEnabled();
    await expect(cs.earnOnTipDescription).toHaveText(DESCRIPTION);
    await reveal(tipBlock(cs));
    await outline(tipBlock(cs));
    await shot(page, 'VP-4812_TC01_tip_step_label_helptext', [
      `Step "Tip" · switch "Earn points on tip" · help text: "${(await cs.earnOnTipDescription.innerText()).trim()}"`,
    ]);

    const on = await isOn(cs);
    expect(on).toBe(flag.value.earn_on_tip === true);
    await shot(page, 'VP-4812_TC02_stored_value_default_ON', [
      `UI switch aria-checked=${on} · API GET /sys_settings?key=${POINT_CONFIG_FLAG}: earn_on_tip=${flag.value.earn_on_tip} · backend default_value.earn_on_tip=${def}`,
      `Point rates (cents/point): cash=${flag.value.cash.point} card=${flag.value.card.point} gift_card=${flag.value.gift_card.point} other=${flag.value.other.point} · checkout=${flag.value.selected_type} · flag updatedAt ${flag.updatedAt}`,
    ]);
  });

  test('TC03 — toggle shows "1 unsaved change", Discard restores, no write sent', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const before = await isOn(cs);
    await reveal(tipBlock(cs));
    await cs.earnOnTipSwitch.click();
    await expect(cs.saveBar).toBeVisible();
    await expect(cs.saveBar).toContainText('1 unsaved change');
    await reveal(tipBlock(cs));
    await outline(tipBlock(cs));
    await outline(cs.saveBar, '#2563eb');
    await shot(page, 'VP-4812_TC03_toggled_unsaved_bar', [
      `Switch flipped ${before ? 'ON → OFF' : 'OFF → ON'} (not saved) → bar "${(await cs.saveBar.innerText()).replace(/\s+/g, ' ').trim()}"`,
    ]);
    await cs.discardButton.click();
    await expect(cs.saveBar).toBeHidden();
    await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(before));
    expect(cs.writes).toHaveLength(0);
    await shot(page, 'VP-4812_TC03_after_discard', [
      `After Discard: switch back to ${before ? 'ON' : 'OFF'}, bar hidden, write requests sent: ${cs.writes.length}`,
    ]);
  });

  test('REL — Auto/Hybrid checkout: Tip step state (points relation), discarded', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const stored = await cs.selectedType();
    for (const type of [CheckoutType.AUTO, CheckoutType.HYBRID]) {
      if (type === stored) continue;
      await cs.selectType(type);
      await reveal(tipBlock(cs));
      const visible = await cs.earnOnTipSwitch.isVisible();
      const enabled = visible ? await cs.earnOnTipSwitch.isEnabled() : false;
      await shot(page, `VP-4812_REL_tip_step_with_${type}`, [
        `Checkout type ${type} selected (NOT saved): Tip switch visible=${visible}, enabled=${enabled}`,
      ]);
      fs.appendFileSync(
        `${SCRATCH}/rel.txt`,
        `${type}: visible=${visible} enabled=${enabled} text=${
          visible
            ? await tipBlock(cs)
                .innerText()
                .catch(() => '')
            : ''
        }\n`,
      );
    }
    await cs.discardIfDirty();
    expect(cs.writes).toHaveLength(0);
  });

  test('TC07 — changing Checkout type keeps earn_on_tip in the payload (mocked save)', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    const stored = await isOn(cs);
    const type = cs.bonusTypeOtherThan(await cs.selectedType());
    await cs.selectType(type);
    await cs.saveAndWait();
    const written = cs.lastWrittenConfig();
    expect(written.earn_on_tip).toBe(stored);
    await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(stored));
    await reveal(tipBlock(cs));
    await shot(page, 'VP-4812_TC07_checkout_type_change_keeps_tip', [
      `MOCKED save (no prod write): selected_type → ${written.selected_type}; PUT payload earn_on_tip=${written.earn_on_tip} (stored ${stored})`,
    ]);
  });

  test('TC08 — save failure (mocked 500) shows no success toast, bar stays', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    cs.failWrites(500);
    await reveal(tipBlock(cs));
    await cs.earnOnTipSwitch.click();
    await cs.save();
    await expect.poll(() => cs.sysSettingWrites().length).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    await expect(cs.toast(/saved/i)).toHaveCount(0);
    await expect(cs.saveBar).toBeVisible();
    await reveal(tipBlock(cs));
    const toasts = await page.locator('[data-sonner-toast]').allInnerTexts();
    await shot(page, 'VP-4812_TC08_save_failure_500', [
      `MOCKED PUT → 500 (PUT requests sent: ${cs.sysSettingWrites().length}): success toast count=0, toasts=${JSON.stringify(toasts)}, Unsaved bar still visible`,
    ]);
  });
});

test.describe('VP-4812 PROD evidence — REAL round trip on #20258 (restored)', () => {
  test('TC04/TC05/TC06 — real toggle + Save + reload, then restore original', async ({
    page,
    checkoutSettingPage: cs,
  }) => {
    test.setTimeout(240_000);
    const log: string[] = [];
    const note = (s: string): void => {
      log.push(`[${nowUtc7().full} UTC+7] ${s}`);
    };
    await cs.goto();
    const orig = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
    fs.writeFileSync(`${SCRATCH}/flag-original.json`, JSON.stringify(orig, null, 2));
    const origOn = orig.value.earn_on_tip === true;
    const target = !origOn;
    note(`original earn_on_tip=${orig.value.earn_on_tip} updatedAt=${orig.updatedAt}`);

    const putBodies: unknown[] = [];
    page.on('request', (r) => {
      if (r.method() === 'PUT' && /\/sys_settings\//.test(r.url())) {
        try {
          putBodies.push({ url: r.url(), body: r.postDataJSON() });
        } catch {
          putBodies.push({ url: r.url(), body: r.postData() });
        }
      }
    });

    await reveal(tipBlock(cs));
    await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(origOn));
    await reveal(tipBlock(cs));
    await outline(tipBlock(cs));
    await shot(page, 'VP-4812_TC06_0_before_real_toggle', [
      `REAL test start · original earn_on_tip=${orig.value.earn_on_tip} (flag updatedAt ${orig.updatedAt})`,
    ]);

    const ordersBetween = async (after: string, before: string): Promise<string[]> => {
      const r = await page.request.get(
        `${dataApiUrl}/orders?page=1&date_range[completedAt][after]=${encodeURIComponent(after)}&date_range[completedAt][before]=${encodeURIComponent(before)}&order[completedAt]=desc`,
        {
          headers: { 'x-merch-id': '20258', Accept: 'application/ld+json' },
          failOnStatusCode: false,
        },
      );
      const j = (await r.json().catch(() => ({}))) as {
        member?: { orderCode: string; completedAt: string }[];
      };
      return (j.member ?? []).map((o) => `${o.orderCode}@${o.completedAt}`);
    };
    const sixHoursAgo = new Date(Date.now() - 6 * 3600_000).toISOString();
    note(
      `orders completed in the 6h before toggling: ${JSON.stringify(await ordersBetween(sixHoursAgo, new Date().toISOString()))}`,
    );
    const windowStart = new Date().toISOString();
    let changed = false;
    try {
      // --- Toggle to target and save for real ---
      await cs.earnOnTipSwitch.click();
      await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(target));
      changed = true;
      note(`toggle → ${target}, Save`);
      await cs.saveToBackend();
      await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toBeVisible();
      await reveal(tipBlock(cs));
      await outline(tipBlock(cs));
      await shot(
        page,
        `VP-4812_TC0${target ? '4' : '5'}_real_${target ? 'on' : 'off'}_saved_toast`,
        [
          `REAL save: switch → ${target ? 'ON' : 'OFF'} · toast "${CheckoutMessages.SAVED_POINT}" · PUT /sys_settings/${orig.id} 2xx`,
        ],
      );

      const after = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
      expect(after.value.earn_on_tip).toBe(target);
      expect(omitTip(after.value)).toEqual(omitTip(orig.value));
      note(
        `API after save: earn_on_tip=${after.value.earn_on_tip} updatedAt=${after.updatedAt}; other keys unchanged`,
      );

      await page.reload({ waitUntil: 'domcontentloaded' });
      await cs.waitForReady();
      await reveal(tipBlock(cs));
      await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(target));
      await reveal(tipBlock(cs));
      await outline(tipBlock(cs));
      await shot(page, `VP-4812_TC06_1_persisted_${target ? 'on' : 'off'}_after_reload`, [
        `After reload: switch ${target ? 'ON' : 'OFF'} (persisted) · API earn_on_tip=${after.value.earn_on_tip} · updatedAt ${after.updatedAt}`,
      ]);
    } finally {
      // --- Restore original value through the UI ---
      if (changed) {
        const now = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
        if ((now.value.earn_on_tip === true) !== origOn) {
          await cs.goto();
          await reveal(tipBlock(cs));
          await cs.earnOnTipSwitch.click();
          await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(origOn));
          note(`restore: toggle → ${origOn}, Save`);
          await cs.saveToBackend();
          await expect(cs.toast(CheckoutMessages.SAVED_POINT)).toBeVisible();
          await reveal(tipBlock(cs));
          await outline(tipBlock(cs));
          await shot(
            page,
            `VP-4812_TC0${origOn ? '4' : '5'}_real_${origOn ? 'on' : 'off'}_saved_toast_restore`,
            [
              `REAL save (restore): switch → ${origOn ? 'ON' : 'OFF'} · toast "${CheckoutMessages.SAVED_POINT}"`,
            ],
          );
        } else {
          await cs.discardIfDirty();
        }
      }
      fs.writeFileSync(`${SCRATCH}/real-run-log.json`, JSON.stringify({ log, putBodies }, null, 2));
    }

    const windowEnd = new Date().toISOString();
    note(
      `changed-value window ${windowStart} → ${windowEnd} (UTC); orders completed inside it: ${JSON.stringify(await ordersBetween(windowStart, windowEnd))}`,
    );
    const restored = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
    fs.writeFileSync(`${SCRATCH}/flag-restored.json`, JSON.stringify(restored, null, 2));
    expect(restored.value).toEqual(orig.value);
    note(
      `API after restore: value deep-equals original; earn_on_tip=${restored.value.earn_on_tip} updatedAt=${restored.updatedAt}`,
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    await cs.waitForReady();
    await reveal(tipBlock(cs));
    await expect(cs.earnOnTipSwitch).toHaveAttribute('aria-checked', String(origOn));
    await outline(tipBlock(cs), '#16a34a');
    await shot(page, 'VP-4812_TC06_2_restored_after_reload', [
      `RESTORED: after reload switch ${origOn ? 'ON' : 'OFF'} = original · API value deep-equals original (earn_on_tip=${restored.value.earn_on_tip}) · updatedAt ${restored.updatedAt}`,
    ]);
    fs.writeFileSync(`${SCRATCH}/real-run-log.json`, JSON.stringify({ log, putBodies }, null, 2));
  });
});
