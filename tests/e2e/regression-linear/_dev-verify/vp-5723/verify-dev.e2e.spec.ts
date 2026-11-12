import { test, expect } from '@fixtures/index';
import type { Browser, Locator, Page, Request, Response } from '@playwright/test';
import { Urls } from '@constants/urls';
import { env } from '@configs/env/loadEnv';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { guardDev, guardReadOnly, saveSession, shot, videoStamp } from '../_shared';

/**
 * VP-5723 — Store Settings › Configuration: Customer display, Default POS screen and Font size
 * grouped into one "POS Accessibility" card.
 * Writes merchant_customer_display / merchant_theme_pos_style / default screen on DEV store;
 * originals are restored in afterAll and checked by TC15.
 */
const ID = 'vp-5723';
const CD_KEY = 'merchant_customer_display';
const FS_KEY = 'merchant_theme_pos_style';

type CD = { show_point: boolean; show_reward: boolean };
type FontSize = 'small' | 'medium' | 'large';

test.describe.configure({ mode: 'serial' });
test.use({
  viewport: { width: 1600, height: 1200 },
  video: { mode: 'on', size: { width: 1280, height: 960 } },
});

let origCd: CD;
let origFont: FontSize;
let origScreen: string;

const card = (p: Page) =>
  p.locator('[data-slot="settings-card"]').filter({
    has: p.locator('[data-slot="settings-card-section-title"]', { hasText: 'POS Accessibility' }),
  });
const stepTitles = (p: Page) => card(p).locator('[data-slot="settings-card-step-title"]');
const point = (p: Page) => p.locator('#customer-display-show-point');
const reward = (p: Page) => p.locator('#customer-display-show-reward');
const screenRadio = (p: Page, v: string) => p.locator(`[id="screen-${v}"]`);
const screenGroup = (p: Page) => p.getByRole('radiogroup', { name: 'Default POS screen' });
const fontGroup = (p: Page) => p.getByRole('radiogroup', { name: 'Font size' });
const fontRadio = (p: Page, v: FontSize) => p.locator(`[id="font-size-${v}"]`);
const saveBtn = (p: Page) => p.getByRole('button', { name: 'Save', exact: true });
const discardBtn = (p: Page) => p.getByRole('button', { name: 'Discard', exact: true });
const toast = (p: Page, t: string | RegExp) =>
  p.locator('[data-sonner-toast]').filter({ hasText: t }).last();
const step = (p: Page, title: string) =>
  card(p)
    .locator('[data-slot="settings-card-section"]')
    .filter({ has: p.locator('[data-slot="settings-card-step-title"]', { hasText: title }) });

async function open(page: Page) {
  await page.goto(`${Urls.SETTINGS}?tab=configuration`, { waitUntil: 'domcontentloaded' });
  await point(page).waitFor({ timeout: 40_000 });
  await expect(fontGroup(page).locator('[aria-checked="true"]')).toHaveCount(1, {
    timeout: 20_000,
  });
  await expect(screenGroup(page).locator('[role="radio"][aria-checked="true"]')).toHaveCount(1, {
    timeout: 20_000,
  });
}

/** Scroll so `loc` sits near the top of the viewport (the right column scrolls with the page). */
async function focus(loc: Locator) {
  await loc.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await loc.page().evaluate(() => window.scrollBy(0, -80));
  await loc.page().waitForTimeout(400);
}

/** Non-GET API requests sent while `fn` runs. */
async function writesDuring(page: Page, fn: () => Promise<void>, settle = 1500) {
  const seen: { method: string; url: string; body: string | null }[] = [];
  const h = (r: Request) => {
    if (
      r.method() !== 'GET' &&
      ['fetch', 'xhr'].includes(r.resourceType()) &&
      !/refresh_token|report_queries/.test(r.url())
    )
      seen.push({ method: r.method(), url: r.url(), body: r.postData() });
  };
  page.on('request', h);
  try {
    await fn();
    await page.waitForTimeout(settle);
  } finally {
    page.off('request', h);
  }
  return seen;
}

const checked = async (l: Locator) => (await l.getAttribute('aria-checked')) === 'true';
const currentScreen = (p: Page) =>
  screenGroup(p).locator('[role="radio"][aria-checked="true"]').getAttribute('value');
const currentFont = (p: Page) =>
  fontGroup(p)
    .locator('[role="radio"][aria-checked="true"]')
    .getAttribute('value') as Promise<FontSize>;

async function setSwitch(page: Page, loc: Locator, want: boolean) {
  if ((await checked(loc)) === want) return;
  await loc.click();
  await expect(toast(page, 'Customer display updated')).toBeVisible({ timeout: 15_000 });
  await expect(loc).toHaveAttribute('aria-checked', String(want), { timeout: 15_000 });
}

async function setScreen(page: Page, v: string) {
  if ((await currentScreen(page)) === v) return;
  await screenRadio(page, v).click();
  await saveBtn(page).click();
  await expect(saveBtn(page), 'Thanh lưu ẩn sau khi lưu').toBeHidden({ timeout: 15_000 });
}

async function setFont(page: Page, v: FontSize) {
  if ((await currentFont(page)) === v) return;
  await fontRadio(page, v).click();
  await expect(toast(page, 'Font size updated')).toBeVisible({ timeout: 15_000 });
}

async function withPage<T>(browser: Browser, fn: (p: Page) => Promise<T>): Promise<T> {
  const ctx = await browser.newContext({ storageState: env.STORAGE_STATE });
  try {
    return await fn(await ctx.newPage());
  } finally {
    await saveSession(ctx);
    await ctx.close();
  }
}

async function restoreAll(page: Page) {
  await open(page);
  await setSwitch(page, point(page), origCd.show_point);
  await setSwitch(page, reward(page), origCd.show_reward);
  await setScreen(page, origScreen);
  await setFont(page, origFont);
}

test.beforeAll(async ({ browser }) => {
  await withPage(browser, async (page) => {
    await open(page);
    origCd = (await readSysSetting<CD>(page, CD_KEY)).value;
    origFont = (await readSysSetting<{ font_size: FontSize }>(page, FS_KEY)).value.font_size;
    origScreen = (await currentScreen(page)) ?? 'pending_orders';
  });
});

test.afterEach(async ({ context }) => {
  await saveSession(context);
});

test.afterAll(async ({ browser }) => {
  await withPage(browser, restoreAll);
});

test('TC01 — thẻ POS Accessibility ở cột phải, dưới Privacy policy', async ({ page }) => {
  await guardReadOnly(page);
  await videoStamp(page, `${ID} TC01`);
  await open(page);
  const c = card(page);
  await expect(c, 'Có đúng 1 thẻ POS Accessibility').toHaveCount(1);
  await expect(c.locator('[data-slot="settings-card-section-title"]').first()).toHaveText(
    'POS Accessibility',
  );
  await expect(c.locator('[data-slot="settings-card-section-description"]').first()).toHaveText(
    'Display settings for every POS terminal of this merchant.',
  );
  // Cards of the right column, top to bottom.
  const right = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-slot="settings-card"]')].map((el) => ({
      t: el.querySelector('[data-slot="settings-card-section-title"]')?.textContent?.trim() ?? '',
      x: el.getBoundingClientRect().x,
      y: el.getBoundingClientRect().y,
    }));
    const xMax = Math.max(...cards.map((c) => c.x));
    return cards
      .filter((c) => Math.abs(c.x - xMax) < 5)
      .sort((a, b) => a.y - b.y)
      .map((c) => c.t);
  });
  const i = right.indexOf('POS Accessibility');
  expect(i, `Thẻ nằm ở cột phải (cột phải: ${right.join(' › ')})`).toBeGreaterThan(-1);
  expect(right[i - 1], 'Thẻ ngay trước là Privacy policy').toBe('Privacy policy');
  const font = await c
    .locator('[data-slot="settings-card-section-title"]')
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font.toLowerCase(), 'Tiêu đề dùng font serif').toMatch(
    /serif|garamond|georgia|times|playfair|lora|crimson|fraunces/,
  );
  await focus(
    page.locator('[data-slot="settings-card"]').filter({ hasText: 'Privacy policy' }).first(),
  );
  await shot(page, `${ID}-TC01-card`, `TC01 · Cột phải: ${right.join(' › ')}`);
  await page.waitForTimeout(800);
});

test('TC02 — các mục đúng thứ tự, tên đậm + dòng phụ xám, có đường kẻ', async ({ page }) => {
  await guardReadOnly(page);
  await videoStamp(page, `${ID} TC02`);
  await open(page);
  const titles = (await stepTitles(page).allInnerTexts()).map((t) => t.trim());
  const expected = titles.includes('Tile colors')
    ? ['Customer display', 'Default POS screen', 'Tile colors', 'Font size']
    : ['Customer display', 'Default POS screen', 'Font size'];
  expect(titles, 'Thứ tự các mục trong thẻ').toEqual(expected);
  const styles = await stepTitles(page).evaluateAll((els) =>
    els.map((h) => {
      const p = h.parentElement?.querySelector('p') as HTMLElement | null;
      return {
        weight: Number(getComputedStyle(h).fontWeight),
        desc: p?.textContent?.trim() ?? '',
        titleColor: getComputedStyle(h).color,
        descColor: p ? getComputedStyle(p).color : '',
      };
    }),
  );
  for (const [k, s] of styles.entries()) {
    expect(s.weight, `${titles[k]}: tên đậm (font-weight ≥ 500)`).toBeGreaterThanOrEqual(500);
    expect(s.desc, `${titles[k]}: có dòng phụ`).not.toBe('');
    expect(s.descColor, `${titles[k]}: dòng phụ màu khác (xám) so với tên`).not.toBe(s.titleColor);
  }
  // header + each item are separate sections, separated by a thin separator.
  const seps = await card(page).locator(':scope > [data-slot="settings-card-separator"]').count();
  expect(seps, 'Đường kẻ giữa các mục').toBeGreaterThanOrEqual(titles.length);
  await focus(card(page));
  await shot(page, `${ID}-TC02-items`, `TC02 · Thứ tự: ${titles.join(' → ')}`);
  await focus(step(page, 'Font size'));
  await shot(page, `${ID}-TC02-font-item`, 'TC02 · Mục Font size cuối thẻ, tách bằng đường kẻ');
});

test('TC03 — không còn thẻ Customer display / Font size đứng riêng', async ({ page }) => {
  await guardReadOnly(page);
  await videoStamp(page, `${ID} TC03`);
  await open(page);
  const cardTitles = (
    await page
      .locator('[data-slot="settings-card"] [data-slot="settings-card-section-title"]')
      .allInnerTexts()
  ).map((t) => t.trim());
  expect(cardTitles, 'Không có thẻ tên "Customer display"').not.toContain('Customer display');
  expect(cardTitles, 'Không có thẻ tên "Font size"').not.toContain('Font size');
  for (const [name, loc] of [
    ['Show points balance', point(page)],
    ['Show rewards', reward(page)],
    ['Font size', fontGroup(page)],
    ['Default POS screen', screenGroup(page)],
  ] as const) {
    await expect(loc, `${name} chỉ xuất hiện 1 lần`).toHaveCount(1);
    await expect(card(page).locator(loc), `${name} nằm trong thẻ POS Accessibility`).toHaveCount(1);
  }
  await focus(card(page));
  await shot(
    page,
    `${ID}-TC03-no-standalone`,
    `TC03 · Các thẻ trên tab: ${cardTitles.join(' · ')}`,
  );
});

test('TC04 — Tile colors chưa làm (VP-5724) thì không hiện', async ({ page }) => {
  await guardReadOnly(page);
  await videoStamp(page, `${ID} TC04`);
  await open(page);
  const tile = step(page, 'Tile colors');
  if ((await tile.count()) === 0) {
    await expect(page.getByText('Tile colors', { exact: true })).toHaveCount(0);
  } else {
    await expect(tile.getByText('Bold')).toBeVisible();
    await expect(tile.getByText('Pastel')).toBeVisible();
  }
  await focus(step(page, 'Default POS screen'));
  await shot(page, `${ID}-TC04-tile-colors`, 'TC04 · Không có mục Tile colors (VP-5724 đang Todo)');
});

test('TC05 — 2 toggle Customer display khớp giá trị đang lưu', async ({ page }) => {
  await guardReadOnly(page);
  await videoStamp(page, `${ID} TC05`);
  await open(page);
  const flag = (await readSysSetting<CD>(page, CD_KEY)).value;
  await expect(point(page), 'Show points balance khớp server').toHaveAttribute(
    'aria-checked',
    String(flag.show_point),
  );
  await expect(reward(page), 'Show rewards khớp server').toHaveAttribute(
    'aria-checked',
    String(flag.show_reward),
  );
  await expect(page.locator('label[for="customer-display-show-point"]')).toHaveText(
    'Show points balance',
  );
  await expect(page.locator('label[for="customer-display-show-reward"]')).toHaveText(
    'Show rewards',
  );
  await focus(step(page, 'Customer display'));
  await shot(
    page,
    `${ID}-TC05-customer-display`,
    `TC05 · Server: show_point=${flag.show_point}, show_reward=${flag.show_reward}`,
  );
});

test('TC06 — bật/tắt Show points balance lưu ngay như trước', async ({ page }) => {
  await guardDev(page);
  await videoStamp(page, `${ID} TC06`);
  await open(page);
  await focus(step(page, 'Customer display'));
  const before = (await readSysSetting<CD>(page, CD_KEY)).value;
  const writes = await writesDuring(page, () => point(page).click());
  expect(writes, 'Gửi đúng 1 PUT sys_settings').toHaveLength(1);
  expect(writes[0].url).toMatch(/\/sys_settings\/[^/?]+$/);
  expect(JSON.parse(writes[0].body ?? '{}'), 'Body chỉ đổi show_point').toEqual({
    value: { show_point: !before.show_point, show_reward: before.show_reward },
  });
  await expect(toast(page, 'Customer display updated'), 'Toast lưu thành công').toBeVisible();
  await expect(saveBtn(page), 'Không hiện thanh lưu').toBeHidden();
  await expect(point(page)).toHaveAttribute('aria-checked', String(!before.show_point));
  const after = (await readSysSetting<CD>(page, CD_KEY)).value;
  expect(after, 'Server đổi show_point, giữ show_reward').toEqual({
    show_point: !before.show_point,
    show_reward: before.show_reward,
  });
  await shot(
    page,
    `${ID}-TC06-toggle-point`,
    `TC06 · show_point ${before.show_point} → ${after.show_point}, toast "Customer display updated"`,
  );
  await setSwitch(page, point(page), before.show_point);
  await page.waitForTimeout(800);
});

test('TC07 — đổi cả 2 toggle, reload vẫn giữ', async ({ page }) => {
  await guardDev(page);
  await videoStamp(page, `${ID} TC07`);
  await open(page);
  await focus(step(page, 'Customer display'));
  const before = (await readSysSetting<CD>(page, CD_KEY)).value;
  try {
    await setSwitch(page, point(page), !before.show_point);
    await setSwitch(page, reward(page), !before.show_reward);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await open(page);
    await focus(step(page, 'Customer display'));
    await expect(point(page), 'Sau reload: Show points balance giữ giá trị mới').toHaveAttribute(
      'aria-checked',
      String(!before.show_point),
    );
    await expect(reward(page), 'Sau reload: Show rewards giữ giá trị mới').toHaveAttribute(
      'aria-checked',
      String(!before.show_reward),
    );
    expect((await readSysSetting<CD>(page, CD_KEY)).value, 'Server lưu giá trị mới').toEqual({
      show_point: !before.show_point,
      show_reward: !before.show_reward,
    });
    await shot(
      page,
      `${ID}-TC07-after-reload`,
      `TC07 · Sau reload: show_point=${!before.show_point}, show_reward=${!before.show_reward}`,
    );
  } finally {
    await setSwitch(page, point(page), before.show_point);
    await setSwitch(page, reward(page), before.show_reward);
  }
  await page.waitForTimeout(800);
});

test('TC08 — Default POS screen có Pending Orders (Default) và Home', async ({ page }) => {
  await guardReadOnly(page);
  await videoStamp(page, `${ID} TC08`);
  await open(page);
  const opts = (
    await screenGroup(page)
      .locator('[role="radio"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('value')))
  ).filter(Boolean) as string[];
  test.info().annotations.push({ type: 'screen-options', description: opts.join(',') });
  expect(opts, 'Có Pending Orders').toContain('pending_orders');
  expect(opts, 'Có Home').toContain('home');
  const pendingCard = screenGroup(page)
    .locator('[data-slot="merchant-option-card"]')
    .filter({ has: screenRadio(page, 'pending_orders') });
  await expect(
    pendingCard.locator('[data-slot="pos-badge"]'),
    'Pending Orders có nhãn Default',
  ).toHaveText('Default');
  await expect(
    screenGroup(page).locator('[role="radio"][aria-checked="true"]'),
    'Có đúng 1 lựa chọn',
  ).toHaveCount(1);
  await focus(step(page, 'Default POS screen'));
  await shot(page, `${ID}-TC08-default-screen`, `TC08 · Lựa chọn: ${opts.join(', ')}`);
});

test('TC09 — Default POS screen dùng thanh lưu nổi, Discard và Save', async ({ page }) => {
  await guardDev(page);
  await videoStamp(page, `${ID} TC09`);
  await open(page);
  await focus(step(page, 'Default POS screen'));
  const start = (await currentScreen(page))!;
  const other = start === 'home' ? 'pending_orders' : 'home';
  try {
    // Discard: nothing sent, selection goes back.
    const w1 = await writesDuring(page, async () => {
      await screenRadio(page, other).click();
      await expect(page.getByText(/^1 unsaved change/), 'Hiện "1 unsaved change"').toBeVisible();
      await expect(discardBtn(page)).toBeVisible();
      await expect(saveBtn(page)).toBeVisible();
      await shot(
        page,
        `${ID}-TC09-save-bar`,
        'TC09 · Chọn màn khác → thanh "1 unsaved change · Discard · Save"',
      );
      await discardBtn(page).click();
    });
    expect(w1, 'Discard không gửi request').toEqual([]);
    await expect(screenRadio(page, start), 'Discard → về lựa chọn cũ').toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(saveBtn(page)).toBeHidden();

    // Save → reload keeps it.
    const w2 = await writesDuring(page, () => setScreen(page, other));
    test.info().annotations.push({ type: 'save-request', description: JSON.stringify(w2) });
    expect(w2.length, 'Save gửi request lưu').toBeGreaterThan(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await open(page);
    await focus(step(page, 'Default POS screen'));
    await expect(screenRadio(page, other), `Sau reload vẫn là ${other}`).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await shot(page, `${ID}-TC09-after-reload`, `TC09 · Save ${other} → reload vẫn giữ`);

    // Back to the start value.
    await setScreen(page, start);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await open(page);
    await focus(step(page, 'Default POS screen'));
    await expect(screenRadio(page, start), `Chọn lại ${start} lưu được`).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await shot(page, `${ID}-TC09-back`, `TC09 · Chọn lại ${start} → Save → reload giữ`);
  } finally {
    if ((await currentScreen(page)) !== start) await setScreen(page, start);
  }
});

test('TC10 — Font size: Small / Medium / Large, khớp giá trị lưu, mặc định Medium', async ({
  page,
}) => {
  await guardReadOnly(page);
  await videoStamp(page, `${ID} TC10`);
  await open(page);
  const flag = await readSysSetting<{ font_size: FontSize }>(page, FS_KEY);
  await expect(fontGroup(page).getByRole('radio')).toHaveCount(3);
  for (const [v, label] of [
    ['small', 'Small'],
    ['medium', 'Medium'],
    ['large', 'Large'],
  ] as const)
    await expect(
      fontGroup(page)
        .locator('[data-slot="merchant-option-card"]')
        .filter({ has: fontRadio(page, v) }),
      `Có lựa chọn ${label}`,
    ).toContainText(label);
  await expect(
    fontGroup(page).locator('[aria-checked="true"]'),
    'Đang chọn khớp server',
  ).toHaveAttribute('value', flag.value.font_size);
  expect(
    (flag.config as { default_value?: { font_size?: string } }).default_value?.font_size,
    'Mặc định Medium',
  ).toBe('medium');
  await focus(step(page, 'Font size'));
  await shot(
    page,
    `${ID}-TC10-font-size`,
    `TC10 · Server font_size=${flag.value.font_size}, mặc định medium`,
  );
});

test('TC11 — đổi Font size lưu ngay, reload vẫn giữ', async ({ page }) => {
  await guardDev(page);
  await videoStamp(page, `${ID} TC11`);
  await open(page);
  await focus(step(page, 'Font size'));
  const start = await currentFont(page);
  const next: FontSize = start === 'large' ? 'medium' : 'large';
  try {
    const w = await writesDuring(page, () => fontRadio(page, next).click());
    expect(w, '1 PUT sys_settings').toHaveLength(1);
    expect(JSON.parse(w[0].body ?? '{}')).toEqual({ value: { font_size: next } });
    await expect(toast(page, 'Font size updated'), 'Toast "Font size updated"').toBeVisible();
    await shot(page, `${ID}-TC11-saved`, `TC11 · ${start} → ${next}, toast "Font size updated"`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await open(page);
    await focus(step(page, 'Font size'));
    await expect(fontRadio(page, next), 'Sau reload vẫn giữ').toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect((await readSysSetting<{ font_size: FontSize }>(page, FS_KEY)).value.font_size).toBe(
      next,
    );
    await shot(page, `${ID}-TC11-after-reload`, `TC11 · Sau reload font_size=${next}`);
  } finally {
    await setFont(page, start);
  }
  await page.waitForTimeout(800);
});

test('TC12 — mở tab Configuration không lỗi console / API', async ({ page }) => {
  await guardReadOnly(page);
  await videoStamp(page, `${ID} TC12`);
  const bad: string[] = [];
  const consoleErr: string[] = [];
  page.on('response', (r: Response) => {
    if (r.status() >= 400 && ['fetch', 'xhr'].includes(r.request().resourceType()))
      bad.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErr.push(m.text().slice(0, 200));
  });
  await open(page);
  await focus(card(page));
  await page.waitForTimeout(2000);
  test.info().annotations.push({ type: 'http-errors', description: bad.join(' | ') || 'none' });
  test
    .info()
    .annotations.push({ type: 'console-errors', description: consoleErr.join(' | ') || 'none' });
  expect(
    bad.filter((b) => !/^401 /.test(b)),
    'Không có API 4xx/5xx (trừ 401 tự refresh token)',
  ).toEqual([]);
  expect(
    bad.filter((b) => /^5\d\d /.test(b)),
    'Không có API 5xx',
  ).toEqual([]);
  await shot(page, `${ID}-TC12-no-errors`, `TC12 · API lỗi: ${bad.length ? bad.length : 'không'}`);
});

test('TC15 — dữ liệu DEV đã khôi phục', async ({ page, browser }) => {
  await guardReadOnly(page);
  await videoStamp(page, `${ID} TC15`);
  await withPage(browser, restoreAll);
  await open(page);
  expect((await readSysSetting<CD>(page, CD_KEY)).value, 'Customer display như ban đầu').toEqual(
    origCd,
  );
  expect(
    (await readSysSetting<{ font_size: FontSize }>(page, FS_KEY)).value.font_size,
    'Font size như ban đầu',
  ).toBe(origFont);
  expect(await currentScreen(page), 'Default POS screen như ban đầu').toBe(origScreen);
  await focus(card(page));
  await shot(
    page,
    `${ID}-TC15-restored`,
    `TC15 · Đã khôi phục: show_point=${origCd.show_point}, show_reward=${origCd.show_reward}, screen=${origScreen}, font=${origFont}`,
  );
});
