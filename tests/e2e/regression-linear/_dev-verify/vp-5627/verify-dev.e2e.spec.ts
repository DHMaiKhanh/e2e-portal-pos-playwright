import { test, expect } from '@fixtures/index';
import type { Browser, Page, Request } from '@playwright/test';
import { Urls } from '@constants/urls';
import { env } from '@configs/env/loadEnv';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { guardDev, guardReadOnly, shot } from '../_shared';

/**
 * VP-5627 — Discount setting: default Owner/Staff split for Custom promotion (Portal part).
 * Writes merchant_custom_promotion_discount on the DEV store; the original value is restored in
 * afterAll and checked by TC17.
 */
const ID = 'vp-5627';
const CUSTOM_KEY = 'merchant_custom_promotion_discount';
const AVAIL_KEY = 'merchant_promotion_discount';

test.describe.configure({ mode: 'serial' });
// The Discount setting card sits at the bottom of a sticky right column; a taller viewport keeps
// its inputs and error messages in the screenshot.
test.use({ viewport: { width: 1920, height: 1500 } });

let origCustom: number;
let origAvail: number;

const owner = (p: Page) => p.locator('[id="custom.ownerPercent"]');
const staff = (p: Page) => p.locator('[id="custom.staffPercent"]');
const availOwner = (p: Page) => p.locator('[id="available.ownerPercent"]');
const availStaff = (p: Page) => p.locator('[id="available.staffPercent"]');
const customCard = (p: Page) => p.locator(`[data-setting-key="${CUSTOM_KEY}"]`);
const discountCard = (p: Page) =>
  p
    .locator('[data-slot="settings-card-section"]')
    .filter({ has: p.getByRole('heading', { name: 'Discount setting' }) });
const saveBtn = (p: Page) => p.getByRole('button', { name: 'Save', exact: true });
const discardBtn = (p: Page) => p.getByRole('button', { name: 'Discard', exact: true });
const toast = (p: Page) => p.locator('[data-sonner-toast]').first();

/** Scroll every container back to the top: with the tall viewport the whole card is then in view. */
const centre = (p: Page) =>
  p.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('*').forEach((e) => {
      if (e.scrollTop) e.scrollTop = 0;
    });
  });

async function open(page: Page) {
  await page.goto(Urls.SETTINGS_PAYMENT_TRANSACTIONS, { waitUntil: 'domcontentloaded' });
  await owner(page).waitFor({ timeout: 30_000 });
  await discountCard(page).scrollIntoViewIfNeeded();
}

/** Non-GET API requests sent while `fn` runs. */
async function writesDuring(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const seen: string[] = [];
  const h = (r: Request) => {
    if (
      r.method() !== 'GET' &&
      r.resourceType() === 'fetch' &&
      !/refresh_token|report_queries/.test(r.url())
    )
      seen.push(`${r.method()} ${r.url()}`);
  };
  page.on('request', h);
  try {
    await fn();
    await page.waitForTimeout(1500);
  } finally {
    page.off('request', h);
  }
  return seen;
}

async function setCustom(page: Page, o: string, s: string) {
  await owner(page).fill(o);
  await staff(page).fill(s);
  await staff(page).blur();
}

async function saveOk(page: Page) {
  await saveBtn(page).click();
  await expect(toast(page), 'Phải có toast báo lưu').toBeVisible({ timeout: 15_000 });
  await expect(toast(page), 'Toast không báo lỗi').not.toContainText(/error|fail|lỗi/i);
  await expect(saveBtn(page), 'Nút Save ẩn sau khi lưu xong').toBeHidden({ timeout: 15_000 });
}

/** Put the custom setting back through the UI (owner = v, staff = 100 - v). */
async function restoreCustom(page: Page, v: number) {
  await open(page);
  if ((await owner(page).inputValue()) === String(v)) return;
  await setCustom(page, String(v), String(100 - v));
  await saveOk(page);
}

async function withPage<T>(browser: Browser, fn: (p: Page) => Promise<T>): Promise<T> {
  const ctx = await browser.newContext({ storageState: env.STORAGE_STATE });
  try {
    return await fn(await ctx.newPage());
  } finally {
    await ctx.close();
  }
}

test.beforeAll(async ({ browser }) => {
  await withPage(browser, async (page) => {
    await open(page);
    origCustom = Number((await readSysSetting<number>(page, CUSTOM_KEY)).value);
    origAvail = Number((await readSysSetting<number>(page, AVAIL_KEY)).value);
  });
});

test.afterAll(async ({ browser }) => {
  await withPage(browser, (page) => restoreCustom(page, origCustom));
});

test('TC01 — thẻ Discount setting chia 2 phần Available / Custom', async ({ page }) => {
  await guardReadOnly(page);
  await open(page);
  const card = discountCard(page);
  await expect(
    card.getByText('Split of a promotion discount between the owner and the staff.', {
      exact: true,
    }),
    'Dòng phụ thẻ đúng spec',
  ).toBeVisible();
  await expect(
    card.getByRole('heading', { name: 'Available promotions' }),
    'Có phần Available',
  ).toBeVisible();
  await expect(
    card.getByRole('heading', { name: 'Custom promotion' }),
    'Có phần Custom',
  ).toBeVisible();
  for (const loc of [availOwner(page), availStaff(page), owner(page), staff(page)])
    await expect(loc, 'Đủ 4 ô Owner/Staff').toBeVisible();
  await expect(card.getByLabel('Owner share (%)'), '2 ô Owner share').toHaveCount(2);
  await expect(card.getByLabel('Staff share (%)'), '2 ô Staff share').toHaveCount(2);
  await centre(page);
  await shot(
    page,
    `${ID}-TC01-card`,
    'TC01 · Thẻ Discount setting: Available promotions + Custom promotion',
  );
});

test('TC02 — Custom mặc định 100/0, không chép Available', async ({ page }) => {
  await guardReadOnly(page);
  await open(page);
  const flag = await readSysSetting<number>(page, CUSTOM_KEY);
  expect(flag.config?.default_value, 'default_value của setting Custom = 100').toBe(100);
  expect(Number(flag.value), 'Store chưa chỉnh Custom → 100').toBe(100);
  await expect(owner(page), 'Owner Custom = 100').toHaveValue('100');
  await expect(staff(page), 'Staff Custom = 0').toHaveValue('0');
  await expect(
    availOwner(page),
    'Store đang để Available khác 100 → chứng minh Custom không chép',
  ).not.toHaveValue('100');
  const avail = await availOwner(page).inputValue();
  await centre(page);
  await shot(
    page,
    `${ID}-TC02-default`,
    `TC02 · Custom mặc định 100/0; Available của tiệm ${avail}/${100 - Number(avail)} không bị chép`,
  );
});

test('TC03 — tổng khác 100 không lưu được', async ({ page }) => {
  await guardDev(page);
  await open(page);
  await setCustom(page, '60', '30');
  await expect(
    customCard(page).getByText('Owner and Staff shares must total 100%'),
    'Báo lỗi tổng phải 100',
  ).toBeVisible();
  await centre(page);
  await shot(
    page,
    `${ID}-TC03-sum-not-100`,
    'TC03 · 60/30 → "Owner and Staff shares must total 100%"',
  );
  const writes = await writesDuring(page, () => saveBtn(page).click());
  expect(writes, 'Bấm Save không gửi request lưu').toEqual([]);
  expect(Number((await readSysSetting<number>(page, CUSTOM_KEY)).value), 'Server không đổi').toBe(
    origCustom,
  );
});

test('TC04 — ô > 100 hoặc số âm báo lỗi, không lưu', async ({ page }) => {
  await guardDev(page);
  await open(page);
  await setCustom(page, '150', '-50');
  await expect(
    customCard(page).getByText('Must be at most 100'),
    '150 → báo tối đa 100',
  ).toBeVisible();
  await expect(
    customCard(page)
      .getByText(/at least 0|must be.*(0|positive)|negative/i)
      .first(),
    '-50 → báo lỗi số âm',
  ).toBeVisible();
  await centre(page);
  await shot(page, `${ID}-TC04-out-of-range`, 'TC04 · 150 / -50 → báo lỗi từng ô, không lưu');
  const writes = await writesDuring(page, () => saveBtn(page).click());
  expect(writes, 'Bấm Save không gửi request lưu').toEqual([]);
  expect(Number((await readSysSetting<number>(page, CUSTOM_KEY)).value), 'Server không đổi').toBe(
    origCustom,
  );
});

test('TC05 — biên 0/100 lưu được', async ({ page }) => {
  await guardDev(page);
  await open(page);
  await setCustom(page, '0', '100');
  await saveOk(page);
  await open(page);
  await expect(owner(page), 'Reload: Owner 0').toHaveValue('0');
  await expect(staff(page), 'Reload: Staff 100').toHaveValue('100');
  expect(Number((await readSysSetting<number>(page, CUSTOM_KEY)).value), 'Server = 0').toBe(0);
  await centre(page);
  await shot(page, `${ID}-TC05-0-100`, 'TC05 · Lưu biên 0 / 100, reload vẫn giữ');
});

test('TC06 — số lẻ 33.5/66.5 lưu được', async ({ page }) => {
  await guardDev(page);
  await open(page);
  await setCustom(page, '33.5', '66.5');
  await saveOk(page);
  await open(page);
  await expect(owner(page), 'Reload: Owner 33.5').toHaveValue('33.5');
  await expect(staff(page), 'Reload: Staff 66.5').toHaveValue('66.5');
  expect(Number((await readSysSetting<number>(page, CUSTOM_KEY)).value), 'Server = 33.5').toBe(
    33.5,
  );
  await centre(page);
  await shot(page, `${ID}-TC06-decimal`, 'TC06 · Lưu số lẻ 33.5 / 66.5, reload giữ đúng');
});

test('TC07 — lưu 60/40, reload + server = 60', async ({ page }) => {
  await guardDev(page);
  await open(page);
  await setCustom(page, '60', '40');
  await centre(page);
  await shot(page, `${ID}-TC07a-before-save`, 'TC07 · Nhập Custom 60 / 40 trước khi Save');
  await saveOk(page);
  await open(page);
  await expect(owner(page), 'Reload: Owner 60').toHaveValue('60');
  await expect(staff(page), 'Reload: Staff 40').toHaveValue('40');
  expect(Number((await readSysSetting<number>(page, CUSTOM_KEY)).value), 'Server = 60').toBe(60);
  await centre(page);
  await shot(
    page,
    `${ID}-TC07b-after-reload`,
    'TC07 · Sau Save + reload: Custom 60 / 40 (server = 60)',
  );
});

test('TC08 — Discard trả về giá trị đã lưu, không lưu', async ({ page }) => {
  await guardDev(page);
  await open(page);
  const saved = await owner(page).inputValue();
  await setCustom(page, '20', '80');
  await expect(discardBtn(page), 'Có nút Discard khi sửa').toBeVisible();
  const writes = await writesDuring(page, () => discardBtn(page).click());
  expect(writes, 'Discard không gửi request lưu').toEqual([]);
  await expect(owner(page), 'Owner về giá trị đã lưu').toHaveValue(saved);
  await expect(staff(page), 'Staff về giá trị đã lưu').toHaveValue(String(100 - Number(saved)));
  await centre(page);
  await shot(
    page,
    `${ID}-TC08-discard`,
    `TC08 · Sửa 20/80 → Discard → về ${saved}/${100 - Number(saved)}`,
  );
});

test('TC09 — đổi Custom không đổi Available', async ({ page }) => {
  await guardDev(page);
  await open(page);
  // TC05–TC07 changed Custom; Available must still be what beforeAll read.
  await expect(availOwner(page), 'Available Owner không đổi').toHaveValue(String(origAvail));
  await expect(availStaff(page), 'Available Staff không đổi').toHaveValue(String(100 - origAvail));
  expect(
    Number((await readSysSetting<number>(page, AVAIL_KEY)).value),
    'Server Available không đổi',
  ).toBe(origAvail);
  await centre(page);
  await shot(
    page,
    `${ID}-TC09-available-unchanged`,
    `TC09 · Custom đã đổi nhiều lần, Available vẫn ${origAvail}/${100 - origAvail}`,
  );
});

test('TC17 — khôi phục Custom về giá trị gốc', async ({ page }) => {
  await guardDev(page);
  await restoreCustom(page, origCustom);
  await open(page);
  expect(Number((await readSysSetting<number>(page, CUSTOM_KEY)).value), 'Custom về gốc').toBe(
    origCustom,
  );
  expect(Number((await readSysSetting<number>(page, AVAIL_KEY)).value), 'Available không đổi').toBe(
    origAvail,
  );
  await expect(owner(page), 'UI Custom về gốc').toHaveValue(String(origCustom));
  await centre(page);
  await shot(
    page,
    `${ID}-TC17-restored`,
    `TC17 · Đã khôi phục Custom ${origCustom}/${100 - origCustom}, Available ${origAvail}/${100 - origAvail}`,
  );
});
