import { type Page, type Route } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import {
  FONT_SIZE_FLAG,
  type FontSize,
  FontSizeSettingPage,
  FontSizes,
} from '@pages/settings/FontSizeSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { annotate, assertProdTestStore, renderEvidence, shot, utc7Now } from './helpers';

/**
 * VP-4809 PROD verification (store #20258) — REAL save + persistence + restore.
 * Guard: only `PUT /sys_settings/<id of store 20258's merchant_theme_pos_style>` may leave the
 * browser; every other non-GET request to the data host is aborted. The original value is
 * restored in `finally` and confirmed via API + reload.
 */

const CARD = '[data-slot="settings-card"]:has([role="radiogroup"][aria-label="Font size"])';

interface PutLog {
  at: string;
  url: string;
  merchHeader: string | undefined;
  body: string | null;
  allowed: boolean;
  status?: number;
  response?: string;
}

async function installGuard(page: Page, flagId: string, log: PutLog[]): Promise<void> {
  await page.route(/\/\/volt-pos\.v2\.fastboypay\.com\//, async (route: Route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    const url = req.url();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method) || /\/refresh_token(\?|$)/.test(url)) {
      await route.fallback();
      return;
    }
    const merch = req.headers()['x-merch-id'];
    const id = url.match(/\/sys_settings\/([^/?]+)$/)?.[1];
    const allowed =
      method === 'PUT' && id === flagId && (merch === undefined || merch === env.STORE_ID);
    log.push({
      at: utc7Now(),
      url: `${method} ${url}`,
      merchHeader: merch,
      body: req.postData(),
      allowed,
    });
    if (!allowed) {
      await route.abort('blockedbyclient');
      return;
    }
    await route.fallback();
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('VP-4809 PROD — Font size real save + restore', () => {
  test.beforeAll(() => assertProdTestStore());

  test('TC07 — real save persists after reload (all 3 values), then restore original', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const fs = new FontSizeSettingPage(page);
    const log: PutLog[] = [];

    await fs.goto();
    await expect(page).toHaveURL(new RegExp(`/pos/nail/${env.STORE_ID}/setting`));
    const orig = await readSysSetting<{ font_size: FontSize }>(page, FONT_SIZE_FLAG);
    const original = orig.value.font_size;
    console.log(
      '[TC07] ORIGINAL:',
      JSON.stringify({ id: orig.id, value: orig.value, updatedAt: orig.updatedAt }),
    );
    const merchantId = (orig as unknown as { merchant?: { id: number } }).merchant?.id;
    expect(String(merchantId), 'flag belongs to store #20258').toBe(env.STORE_ID);
    expect(FontSizes).toContain(original);
    await installGuard(page, orig.id, log);

    await fs.card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await annotate(page, CARD);
    await shot(page, 'VP-4809_TC07_0_original_before_test', `ORIGINAL saved value = "${original}"`);

    const others = FontSizes.filter((s) => s !== original);
    const sequence: FontSize[] = [...others, original];
    let step = 1;

    const saveAndVerify = async (target: FontSize, label: string): Promise<void> => {
      const respP = page.waitForResponse(
        (r) => r.request().method() === 'PUT' && /\/sys_settings\/[^/?]+$/.test(r.url()),
        { timeout: 15_000 },
      );
      await fs.radio(target).click();
      const resp = await respP;
      const entry = log[log.length - 1];
      entry.status = resp.status();
      entry.response = (await resp.text().catch(() => '')).slice(0, 600);
      console.log(`[TC07] PUT → ${resp.status()} ${entry.body} :: ${entry.response.slice(0, 200)}`);
      expect(resp.status()).toBe(200);
      expect(JSON.parse(entry.body ?? '{}')).toEqual({ value: { font_size: target } });
      await expect(fs.toast('Font size updated').last()).toBeVisible();
      await expect(fs.radio(target)).toHaveAttribute('aria-checked', 'true');
      await fs.card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await annotate(page, CARD);
      await shot(
        page,
        `VP-4809_TC07_${step++}_${label}_save_${target}_toast`,
        `REAL PUT ${resp.status()} ${entry.body}`,
      );

      await page.reload({ waitUntil: 'domcontentloaded' });
      await fs.waitForReady();
      await expect(fs.checkedRadio).toHaveAttribute('value', target);
      const api = await readSysSetting<{ font_size: FontSize }>(page, FONT_SIZE_FLAG);
      console.log(
        `[TC07] after reload: UI=${await fs.selected()} API=${api.value.font_size} updatedAt=${api.updatedAt}`,
      );
      expect(api.value.font_size).toBe(target);
      await fs.card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await annotate(page, CARD);
      await shot(
        page,
        `VP-4809_TC07_${step++}_${label}_${target}_after_reload`,
        `after F5: UI checked = "${await fs.selected()}" · API font_size = "${api.value.font_size}"`,
      );
    };

    let restored = false;
    try {
      for (const target of sequence) {
        await saveAndVerify(target, target === original ? 'RESTORE' : 'persist');
      }
      restored = true;
    } finally {
      const now = await readSysSetting<{ font_size: FontSize }>(page, FONT_SIZE_FLAG).catch(
        () => null,
      );
      if (!restored || now?.value.font_size !== original) {
        console.log(
          `[TC07] RESTORE FALLBACK: current=${now?.value.font_size} original=${original}`,
        );
        await page.reload({ waitUntil: 'domcontentloaded' });
        await fs.waitForReady();
        if ((await fs.selected()) !== original) {
          const respP = page.waitForResponse(
            (r) => r.request().method() === 'PUT' && /\/sys_settings\/[^/?]+$/.test(r.url()),
          );
          await fs.radio(original).click();
          console.log('[TC07] fallback PUT status', (await respP).status());
        }
      }
      const final = await readSysSetting<{ font_size: FontSize }>(page, FONT_SIZE_FLAG);
      console.log(
        '[TC07] FINAL:',
        JSON.stringify({ value: final.value, updatedAt: final.updatedAt }),
      );
      expect(final.value.font_size, 'store #20258 font size restored').toBe(original);

      const ev = await page.context().newPage();
      await renderEvidence(
        ev,
        `VP-4809 · real PUT log on PROD store #${env.STORE_ID} (flag ${FONT_SIZE_FLAG} / ${orig.id})`,
        [
          ['Original value (before test)', `${original} (updatedAt ${orig.updatedAt})`],
          ...log.map(
            (l, i) =>
              [
                `#${i + 1} ${l.at}`,
                `${l.url} · x-merch-id=${l.merchHeader ?? '-'} · body=${l.body} · allowed=${l.allowed} · → ${l.status ?? 'n/a'} ${l.response?.slice(0, 160) ?? ''}`,
              ] as [string, string],
          ),
          [
            'Final value (after restore)',
            `${final.value.font_size} (updatedAt ${final.updatedAt})`,
          ],
          ['Restored = original?', String(final.value.font_size === original)],
        ],
      );
      await shot(ev, 'VP-4809_TC07_network_PUT_log_and_restore', 'network + restore evidence');
      await ev.close();
    }
  });

  test('TC08b — real 500 shape: how many PUTs / toasts on a failed save (mocked, no write)', async ({
    page,
  }) => {
    const fs = new FontSizeSettingPage(page);
    await fs.mockWrites();
    await fs.goto();
    const before = await fs.selected();
    fs.failWrites(500);
    await fs.radio(FontSizes.find((s) => s !== before)!).click();
    await expect(fs.toast(/Server Error/).first()).toBeVisible();
    await page.waitForTimeout(2500);
    const toasts = await page.locator('[data-sonner-toast]').allInnerTexts();
    console.log(
      `[TC08b] PUT requests sent: ${fs.writes.length}; toasts: ${JSON.stringify(toasts)}`,
    );
    await expect(fs.checkedRadio).toHaveAttribute('value', before);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});
