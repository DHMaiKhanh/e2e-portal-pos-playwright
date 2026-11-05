import * as fs from 'fs';
import type { Locator, Page } from '@playwright/test';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import type { PointPaymentConfigValue } from '@pages/settings/CheckoutSettingPage';

/** Ad-hoc PROD verification helpers for VP-4590 (store #20258). Not part of the regular suite. */
export const SCRATCH =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad';
export const OUT_DIR = `${SCRATCH}/ct-vp4590`;
export const SHOTS_DIR = `${OUT_DIR}/shots`;
export const LOCK_DIR = `${SCRATCH}/checkout-flag.lock`;

export const PROD_STORE = '20258';

/** The flag value that must be on store #20258 before and after this run. */
export const ORIGINAL: PointPaymentConfigValue = {
  selected_type: 'payment_method',
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
  const text = `Verified on PROD ${nowUtc7()} (UTC+7) · store #${PROD_STORE}`;
  await page.evaluate(
    ([t, c]) => {
      // Playwright's click-time scrollIntoView can scroll the overflow:hidden app shell; a user
      // cannot, so reset it before capturing.
      const shell = document.querySelector<HTMLElement>('[data-slot="pos-shell"]');
      if (shell) shell.scrollTop = 0;
      const mk = (id: string, top: number, bg: string, size: number) => {
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement('div');
          el.id = id;
          document.body.appendChild(el);
        }
        el.setAttribute(
          'style',
          [
            'position:fixed',
            `top:${top}px`,
            'right:8px',
            'z-index:2147483647',
            `background:${bg}`,
            'color:#fff',
            `font:600 ${size}px/1.3 system-ui,Segoe UI,Arial`,
            'padding:6px 10px',
            'border-radius:6px',
            'pointer-events:none',
            'max-width:900px',
            'box-shadow:0 2px 6px rgba(0,0,0,.3)',
          ].join(';'),
        );
        return el;
      };
      mk('__qc_stamp', 8, 'rgba(220,38,38,0.92)', 14).textContent = t;
      const cap = mk('__qc_caption', 44, 'rgba(17,24,39,0.88)', 13);
      cap.textContent = c;
      cap.style.display = c ? 'block' : 'none';
    },
    [text, caption] as const,
  );
}

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

/** Abort every non-GET to the POS API (except token refresh): read-only pages. */
export async function readOnlyGuard(page: Page): Promise<void> {
  await page.route(/volt-pos\./, async (route) => {
    const m = route.request().method().toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(m) || /refresh_token/.test(route.request().url()))
      return route.fallback();
    console.log('BLOCKED write', m, route.request().url());
    return route.abort();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type J = Record<string, any>;

export async function apiGet(page: Page, path: string): Promise<J> {
  const r = await page.request.get(`${dataApiUrl}${path}`, {
    headers: { 'x-merch-id': PROD_STORE, Accept: 'application/ld+json' },
    failOnStatusCode: false,
  });
  if (!r.ok()) return { __status: r.status(), __body: (await r.text()).slice(0, 300) };
  return (await r.json()) as J;
}
