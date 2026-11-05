import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import {
  FONT_SIZE_FLAG,
  type FontSize,
  FontSizeSettingPage,
  FontSizeText,
  FontSizes,
} from '@pages/settings/FontSizeSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import { annotate, assertProdTestStore, renderEvidence, shot, utc7Now } from './helpers';

/**
 * VP-4809 PROD verification (store #20258) — read-only + mocked writes.
 * Every write to the data host is answered by FontSizeSettingPage.mockWrites(); nothing is saved.
 */

const CARD = '[data-slot="settings-card"]:has([role="radiogroup"][aria-label="Font size"])';
let fs: FontSizeSettingPage;

test.describe.configure({ mode: 'serial' });

test.describe('VP-4809 PROD — Font size (mocked writes)', () => {
  test.beforeAll(() => assertProdTestStore());

  test.beforeEach(async ({ page }) => {
    fs = new FontSizeSettingPage(page);
    await fs.mockWrites();
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('TC01 — location + 3 options', async ({ page }) => {
    const consoleErrors: string[] = [];
    const failed: string[] = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 300)));
    page.on('response', (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url()}`);
    });

    await fs.goto();
    await expect(page).toHaveURL(
      new RegExp(`/pos/nail/${env.STORE_ID}/setting\\?tab=configuration`),
    );
    await page.waitForLoadState('load').catch(() => undefined);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, 'VP-4809_TC01_location_configuration_tab', 'Store Settings › Configuration');

    await fs.card.scrollIntoViewIfNeeded();
    await fs.card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await annotate(page, CARD);
    await expect(fs.cardTitle).toHaveText('Font size');
    await expect(fs.description).toHaveText('Text size on every POS terminal of this merchant.');
    await expect(fs.group.getByRole('radio')).toHaveCount(3);
    await expect(fs.group.locator('[data-slot="merchant-option-card"]')).toHaveText(
      FontSizes.map(
        (s) => new RegExp(`${FontSizeText[s].label}\\s*${FontSizeText[s].description}`),
      ),
    );
    await expect(fs.checkedRadio).toHaveCount(1);
    const texts = await fs.group.locator('[data-slot="merchant-option-card"]').allInnerTexts();
    const values = await fs.group
      .getByRole('radio')
      .evaluateAll((els) =>
        els.map(
          (e) => `${e.id}=${e.getAttribute('value')} checked=${e.getAttribute('aria-checked')}`,
        ),
      );
    console.log('[TC01] option texts:', JSON.stringify(texts));
    console.log('[TC01] radios:', JSON.stringify(values));
    await shot(page, 'VP-4809_TC01_card_3_options', 'card Font size: Small / Medium / Large');
    console.log('[TC01] console errors:', JSON.stringify(consoleErrors));
    console.log('[TC01] failed responses:', JSON.stringify(failed));
  });

  test('TC02 + TC03 — selected matches saved value; default medium', async ({ page }) => {
    await fs.goto();
    const flag = await readSysSetting<{ font_size: FontSize }>(page, FONT_SIZE_FLAG);
    console.log('[TC02] flag:', JSON.stringify(flag));
    await expect(fs.checkedRadio).toHaveAttribute('value', flag.value.font_size);
    await fs.card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await annotate(page, CARD);
    await shot(
      page,
      'VP-4809_TC02_selected_matches_saved',
      `API value.font_size = "${flag.value.font_size}" · UI checked = "${await fs.selected()}"`,
    );

    const config = flag.config as {
      default_value?: { font_size?: string };
      selections?: { key: string; default_value?: string; selections?: string[] }[];
    };
    expect(config.default_value?.font_size).toBe('medium');
    const field = config.selections?.find((s) => s.key === 'font_size');
    expect(field?.default_value).toBe('medium');
    expect(field?.selections).toEqual([...FontSizes]);

    const ev = await page.context().newPage();
    await renderEvidence(
      ev,
      `VP-4809 · GET ${dataApiUrl}/sys_settings?key=${FONT_SIZE_FLAG} (x-merch-id: ${env.STORE_ID})`,
      [
        ['Checked at (UTC+7)', utc7Now()],
        ['Store', `#${env.STORE_ID}`],
        ['flag key / id', `${flag.key} / ${flag.id}`],
        ['value.font_size (saved)', String(flag.value.font_size)],
        ['UI checked radio', String(await fs.selected())],
        ['config.default_value.font_size', String(config.default_value?.font_size)],
        ['config.selections[font_size].default_value', String(field?.default_value)],
        ['config.selections[font_size].selections', JSON.stringify(field?.selections)],
        ['updatedAt', String(flag.updatedAt)],
      ],
      flag,
    );
    await shot(ev, 'VP-4809_TC02_TC03_api_flag_default_medium', 'API evidence');
    await ev.close();
  });

  for (const [id, size] of [
    ['04', 'small'],
    ['05', 'medium'],
    ['06', 'large'],
  ] as const) {
    test(`TC${id} — choose ${size} (mocked PUT)`, async ({ page }) => {
      await fs.goto();
      if ((await fs.selected()) === size) {
        await fs.choose(FontSizes.find((s) => s !== size)!);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await fs.waitForReady();
      }
      const before = fs.writes.length;
      await fs.choose(size);
      const write = fs.writes[before];
      console.log(`[TC${id}] write:`, JSON.stringify(write));
      expect(write.url).toMatch(/\/sys_settings\/[^/?]+$/);
      expect(write.body).toEqual({ value: { font_size: size } });
      await expect(fs.radio(size)).toHaveAttribute('aria-checked', 'true');
      await expect(fs.toast('Font size updated').last()).toBeVisible();
      await expect(fs.toast('Something went wrong. Please try again.')).toHaveCount(0);
      await fs.card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await annotate(page, CARD);
      await shot(
        page,
        `VP-4809_TC${id}_choose_${size}_toast`,
        `PUT body ${JSON.stringify(write.body)} (mocked, not saved)`,
      );
    });
  }

  test('TC09 — re-clicking the selected option sends no request', async ({ page }) => {
    await fs.goto();
    const current = await fs.selected();
    const before = fs.writes.length;
    await fs.radio(current).click();
    await page.waitForTimeout(1500);
    expect(fs.writes).toHaveLength(before);
    await expect(fs.toast('Font size updated')).toHaveCount(0);
    await fs.card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await annotate(page, CARD);
    await shot(
      page,
      'VP-4809_TC09_reclick_selected_no_request',
      `re-click "${current}" → 0 requests`,
    );
  });

  test('TC08 — save error (mocked 500) shows error + reverts', async ({ page }) => {
    await fs.goto();
    const before = await fs.selected();
    fs.failWrites(500);
    const target = FontSizes.find((s) => s !== before)!;
    await fs.choose(target);
    await expect(fs.toast(/Server Error/).first()).toBeVisible();
    await expect(fs.toast(/Mocked failure/).first()).toBeVisible();
    await expect(fs.checkedRadio).toHaveAttribute('value', before);
    const errToasts = await page.locator('[data-sonner-toast]').allInnerTexts();
    console.log('[TC08] toasts:', JSON.stringify(errToasts));
    await fs.card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await annotate(page, CARD);
    await shot(
      page,
      'VP-4809_TC08_save_error_revert',
      `mocked PUT 500 when choosing "${target}" → reverted to "${before}"`,
    );
  });
});
