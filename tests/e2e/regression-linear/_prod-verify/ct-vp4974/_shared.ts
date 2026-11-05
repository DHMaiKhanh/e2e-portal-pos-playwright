import * as fs from 'fs';
import { type Locator, type Page, expect } from '@playwright/test';
import {
  CheckoutType,
  POINT_CONFIG_FLAG,
  PointMethods,
  type CheckoutSettingPage,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';

/** Ad-hoc PROD verification helpers for VP-4974 (store #20258). Not part of the regular suite. */
export const SCRATCH =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad';
export const OUT_DIR = `${SCRATCH}/ct-vp4974`;
export const SHOTS_DIR = `${OUT_DIR}/shots`;
export const LOCK_DIR = `${SCRATCH}/checkout-flag.lock`;

export const PROD_STORE = '20258';

/** Original value of `merchant_point_payment_config` on #20258 — must be restored exactly. */
export const ORIGINAL: PointPaymentConfigValue = {
  selected_type: CheckoutType.MANUAL,
  point_bonus: 0,
  cash: { enabled: true, point: 50 },
  card: { enabled: true, point: 1 },
  gift_card: { enabled: true, point: 200 },
  other: { enabled: true, point: 100 },
  earn_on_tip: true,
};

/** Key-order-independent JSON. */
export const canon = (v: unknown): string => {
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

export const isOriginal = (v: unknown): boolean => canon(v) === canon(ORIGINAL);

export const lockHeld = (): boolean => fs.existsSync(LOCK_DIR);

/** "2026-11-03 15:52" in UTC+7. */
export function nowUtc7(): string {
  const d = new Date(Date.now() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Fixed overlay with the verification stamp + caption (re-injected before every screenshot). */
export async function stamp(page: Page, caption = ''): Promise<void> {
  const head = `Verified on PROD ${nowUtc7()} (UTC+7) · store #${PROD_STORE}`;
  await page.evaluate(
    ({ h, c }) => {
      let el = document.getElementById('__qc_stamp');
      if (!el) {
        el = document.createElement('div');
        el.id = '__qc_stamp';
        el.setAttribute(
          'style',
          [
            'position:fixed',
            'top:6px',
            'left:50%',
            'transform:translateX(-50%)',
            'max-width:1000px',
            'text-align:center',
            'z-index:2147483647',
            'background:rgba(220,38,38,0.93)',
            'color:#fff',
            'font:600 14px/1.35 system-ui,Segoe UI,Arial',
            'padding:6px 10px',
            'border-radius:6px',
            'pointer-events:none',
            'box-shadow:0 2px 6px rgba(0,0,0,.3)',
            'white-space:pre-wrap',
          ].join(';'),
        );
        document.body.appendChild(el);
      }
      el.textContent = c ? `${h}\nVP-4974 · ${c}` : h;
    },
    { h: head, c: caption },
  );
}

export const shotLog: { file: string; caption: string }[] = [];

export async function shot(
  page: Page,
  name: string,
  caption = '',
  fullPage = false,
): Promise<string> {
  await stamp(page, caption);
  const path = `${SHOTS_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage });
  fs.appendFileSync(`${OUT_DIR}/shots-index.tsv`, `${path}\t${caption}\n`);
  return path;
}

/** Scroll `el` near the top of its own scrolling container (never shifts the app shell). */
export async function scrollToTop(el: Locator, offset = 12): Promise<void> {
  await el.evaluate((node, off) => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    let p: HTMLElement | null = node.parentElement;
    while (
      p &&
      !(p.scrollHeight > p.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))
    ) {
      p = p.parentElement;
    }
    if (!p || p === document.body || p === document.documentElement) {
      window.scrollBy(0, node.getBoundingClientRect().top - off);
      return;
    }
    p.scrollTop += node.getBoundingClientRect().top - p.getBoundingClientRect().top - off;
  }, offset);
  await el.page().waitForTimeout(300);
}

export async function focusCard(cs: CheckoutSettingPage): Promise<void> {
  await scrollToTop(cs.checkoutTitle);
}

export async function readFlag(page: Page) {
  return readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
}

/** Point-rate tiles shown in the UI (cents). */
export async function uiRates(cs: CheckoutSettingPage): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const { label } of PointMethods) {
    out[label] = Number((await cs.pointInput(label).inputValue()).replace(/\D/g, '') || '0');
  }
  return out;
}

/** UI shows the stored state `v` (type checked + rates); bonus checked separately. */
export async function expectUiShows(
  cs: CheckoutSettingPage,
  v: PointPaymentConfigValue,
): Promise<void> {
  await expect(cs.radio(v.selected_type)).toBeChecked();
  const rates = await uiRates(cs);
  for (const { label, key } of PointMethods) {
    expect(rates[label], `${label} rate shown = stored`).toBe(v[key].enabled ? v[key].point : 0);
  }
}

/** Save-bar text such as "1 unsaved change" (empty when hidden). */
export async function saveBarText(cs: CheckoutSettingPage): Promise<string> {
  if (!(await cs.saveBar.isVisible())) return '';
  return (await cs.saveBar.innerText()).replace(/\s+/g, ' ').trim();
}

/** Bottom-left evidence panel (e.g. the flag value read from the API). Pass null to remove. */
export async function panel(page: Page, title: string | null, body = ''): Promise<void> {
  await page.evaluate(
    ({ t, b }) => {
      document.getElementById('__qc_panel')?.remove();
      if (t === null) return;
      const el = document.createElement('div');
      el.id = '__qc_panel';
      el.setAttribute(
        'style',
        [
          'position:fixed',
          'right:12px',
          'top:70px',
          'width:420px',
          'z-index:2147483646',
          'background:rgba(17,24,39,0.94)',
          'color:#e5e7eb',
          'font:13px/1.4 Consolas,monospace',
          'padding:10px 12px',
          'border-radius:8px',
          'pointer-events:none',
          'white-space:pre-wrap',
          'box-shadow:0 2px 8px rgba(0,0,0,.35)',
        ].join(';'),
      );
      const h = document.createElement('div');
      h.setAttribute(
        'style',
        'font:700 13px system-ui,Segoe UI,Arial;color:#fca5a5;margin-bottom:4px',
      );
      h.textContent = t;
      const pre = document.createElement('div');
      pre.textContent = b;
      el.append(h, pre);
      document.body.appendChild(el);
    },
    { t: title, b: body },
  );
}

/** Compact one-key-per-line JSON of the flag value for the evidence panel. */
export function fmtFlag(v: object): string {
  return Object.entries(v)
    .map(([k, x]) => `${k}: ${JSON.stringify(x)}`)
    .join(String.fromCharCode(10));
}

export function record(row: Record<string, unknown>): void {
  fs.appendFileSync(`${OUT_DIR}/results.jsonl`, `${JSON.stringify({ at: nowUtc7(), ...row })}\n`);
}
