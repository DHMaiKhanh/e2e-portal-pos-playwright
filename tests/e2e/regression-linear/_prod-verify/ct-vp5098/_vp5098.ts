import * as fs from 'fs';
import { expect, type Locator, type Page } from '@playwright/test';
import {
  POINT_CONFIG_FLAG,
  type CheckoutSettingPage,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { LOCK_DIR, ORIGINAL_FLAG, OUT_DIR, PROD_STORE, log, nowUtc7 } from './_shared';

export const TEXT = {
  checkoutTitle: 'Checkout setting',
  checkoutDesc:
    'Choose when check-ins are checked out and how they earn points. Changes apply to check-ins checked out after you save.',
  typeStep: 'Checkout type',
  pointTitle: 'Setting point config',
  pointDesc:
    'Amount a customer must pay by each method to earn 1 point — $2.00 means 1 point per $2.00 paid. Set $0.00 to stop a method from earning points.',
  tipStep: 'Tip',
} as const;

/** Locators of the VP-5098 layout inside the shared Checkout setting form. */
export function vp(cs: CheckoutSettingPage) {
  const page = cs.page;
  const stepTitle = (t: string) =>
    page
      .locator('[data-slot="settings-card-step-title"]')
      .filter({ hasText: new RegExp(`^${t}$`) });
  const step = (t: string): Locator =>
    cs.form.locator('[data-slot="settings-card-step"]').filter({ has: stepTitle(t) });
  const pointStep = step(TEXT.pointTitle);
  return {
    page,
    tabPanel: page.locator('[role="tabpanel"]:visible'),
    checkoutCard: cs.form.locator('[data-slot="settings-card"]').first(),
    typeStep: step(TEXT.typeStep),
    pointStep,
    pointStepTitle: pointStep.locator('[data-slot="settings-card-step-title"]'),
    pointStepDesc: pointStep.locator('p').first(),
    tipStep: step(TEXT.tipStep),
    tiles: pointStep.locator('[data-slot="point-conversion-tile"]'),
    tile: (label: string) =>
      pointStep
        .locator('[data-slot="point-conversion-tile"]')
        .filter({ has: page.locator('label', { hasText: new RegExp(`^${label}$`) }) }),
    pill: (label: string) =>
      pointStep
        .locator('[data-slot="point-conversion-tile"]')
        .filter({ has: page.locator('label', { hasText: new RegExp(`^${label}$`) }) })
        .locator('[data-slot="pos-status-pill-label"]'),
  };
}

export type Vp = ReturnType<typeof vp>;

/** Rect of a locator in page coordinates (the shell scrolls an inner div, so viewport Y is fine for ordering). */
export async function rect(
  l: Locator,
): Promise<{ top: number; bottom: number; left: number; right: number }> {
  const b = await l.boundingBox();
  expect(b, 'element has a box').toBeTruthy();
  return { top: b!.y, bottom: b!.y + b!.height, left: b!.x, right: b!.x + b!.width };
}

const SESSION_CHECK = /\/\/sys\.[^/]+\/sessions\/current(\?|$)/;
const AUTH_HOST = /\/\/sys\./;

/**
 * Collect console errors + page errors for the whole test. The array also gets an `http` list of
 * failed responses, and `appErrors()` drops the "Failed to load resource: 401" console lines when
 * the ONLY failed responses are `GET sys.*\/sessions/current` 401 — the expired-access-token
 * handshake of the stored session (the app refreshes and carries on), not a page error.
 */
export function watchConsole(page: Page): string[] & { http: string[]; appErrors: () => string[] } {
  const errors = [] as unknown as string[] & { http: string[]; appErrors: () => string[] };
  errors.http = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400) errors.http.push(`${r.status()} ${r.request().method()} ${u}`);
    if (AUTH_HOST.test(u))
      log(`AUTH ${r.status()} ${r.request().method()} ${u.replace(/\?.*/, '')}`);
  });
  errors.appErrors = () => {
    const onlySessionCheck = errors.http.every(
      (h) => h.startsWith('401 GET') && SESSION_CHECK.test(h.split(' ')[2]),
    );
    return onlySessionCheck ? errors.filter((e) => !/status of 401/.test(e)) : [...errors];
  };
  return errors;
}

/** Read-only check that the shared flag still equals the original value. */
export async function checkFlag(
  page: Page,
  when: string,
): Promise<{ equal: boolean; value: PointPaymentConfigValue }> {
  const s = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
  const v = (
    typeof s.value === 'string' ? JSON.parse(s.value) : s.value
  ) as PointPaymentConfigValue;
  const pick = {
    selected_type: v.selected_type,
    point_bonus: v.point_bonus,
    cash: v.cash,
    card: v.card,
    gift_card: v.gift_card,
    other: v.other,
    earn_on_tip: v.earn_on_tip,
  };
  const equal = JSON.stringify(pick) === JSON.stringify(ORIGINAL_FLAG);
  const locked = fs.existsSync(LOCK_DIR);
  log(
    `FLAG ${when}: equal=${equal} lockPresent=${locked} updatedAt=${s.updatedAt} value=${JSON.stringify(v)}`,
  );
  fs.writeFileSync(
    `${OUT_DIR}/flag-${when}.json`,
    JSON.stringify({ equal, locked, setting: s }, null, 2),
  );
  return { equal, value: v };
}

/** Embed a local image as a data URI (for side-by-side comparisons). */
export function dataUri(path: string): string {
  const ext = path.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
  return `data:image/${ext};base64,${fs.readFileSync(path).toString('base64')}`;
}

export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Panel {
  title: string;
  img: string;
  /** Region of the source image to show, in source pixels. */
  crop?: Crop;
}

/**
 * Render "expected (ticket) | actual (PROD)" side by side on a blank page and screenshot it
 * (1920x1080). Runs in a separate page so the app page is untouched.
 */
export async function sideBySide(
  page: Page,
  out: string,
  left: Panel,
  right: Panel,
  footer: string,
): Promise<void> {
  const caption = `<span style="background:#dc2626;padding:2px 6px;border-radius:4px">Verified on PROD ${nowUtc7()} (UTC+7) · store #${PROD_STORE}</span> ${footer}`;
  const p = await page.context().newPage();
  await p.setViewportSize({ width: 1920, height: 1080 });
  const panel = (
    c: Panel,
    i: number,
  ) => `<div style="flex:1;display:flex;flex-direction:column;min-width:0">
      <div style="padding:8px 10px;background:${i === 0 ? '#2563eb' : '#dc2626'};border-radius:6px 6px 0 0">${c.title}</div>
      <div style="background:#fff;border-radius:0 0 6px 6px;overflow:hidden">
        <div class="crop" data-crop='${JSON.stringify(c.crop ?? null)}' style="position:relative;overflow:hidden;width:100%">
          <img src="${dataUri(c.img)}" style="position:absolute;left:0;top:0"/></div></div></div>`;
  await p.setContent(`<!doctype html><html><body style="margin:0;background:#111827;font:600 16px system-ui,Segoe UI,Arial;color:#fff">
  <div style="display:flex;gap:12px;padding:12px;box-sizing:border-box;align-items:flex-start">${panel(left, 0)}${panel(right, 1)}</div>
  <div style="position:fixed;bottom:12px;left:12px;right:12px;background:rgba(0,0,0,.8);padding:8px 10px;border-radius:6px;line-height:1.5">${caption}</div>
  <script>
    function layout() {
      document.querySelectorAll('.crop').forEach((box) => {
        const img = box.querySelector('img');
        const c = JSON.parse(box.dataset.crop) || { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
        const k = Math.min(box.clientWidth / c.w, 930 / c.h);
        box.style.height = c.h * k + 'px';
        box.style.width = c.w * k + 'px';
        img.style.width = img.naturalWidth * k + 'px';
        img.style.left = -c.x * k + 'px';
        img.style.top = -c.y * k + 'px';
      });
    }
  </script></body></html>`);
  await p.waitForFunction(() =>
    Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
  );
  await p.evaluate(() => (window as unknown as { layout: () => void }).layout());
  await p.waitForTimeout(200);
  await p.screenshot({ path: out });
  await p.close();
  log(`SHOT ${out} :: ${footer}`);
}

/** Crop around a locator (in the current viewport screenshot), padded for the annotation labels. */
export async function cropOf(l: Locator, pad = { x: 12, top: 34, bottom: 12 }): Promise<Crop> {
  const b = await l.boundingBox();
  expect(b).toBeTruthy();
  const vs = l.page().viewportSize()!;
  const x = Math.max(0, Math.round(b!.x - pad.x));
  const y = Math.max(0, Math.round(b!.y - pad.top));
  return {
    x,
    y,
    w: Math.min(vs.width - x, Math.round(b!.width + 2 * pad.x)),
    h: Math.min(vs.height - y, Math.round(b!.height + pad.top + pad.bottom)),
  };
}

/** Checkout card region inside the QC DEV screenshots (1568x726). */
export const DEV_CARD_CROP: Crop = { x: 205, y: 112, w: 1010, h: 535 };
