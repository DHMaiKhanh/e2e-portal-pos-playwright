import type { Page } from '@playwright/test';

/** Ad-hoc PROD verification helpers for VP-4489 (store #20258). Not part of the regular suite. */
export const SHOTS_DIR =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4489/shots';

export const PROD_STORE = '20258';

/** "2026-11-03 15:52" in UTC+7. */
export function nowUtc7(): string {
  const d = new Date(Date.now() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Fixed overlay with the verification stamp (re-injected before every screenshot). */
export async function stamp(page: Page, extra = ''): Promise<void> {
  const text = `Verified on PROD ${nowUtc7()} (UTC+7) · store #${PROD_STORE}${extra ? ` · ${extra}` : ''}`;
  await page.evaluate((t) => {
    let el = document.getElementById('__qc_stamp');
    if (!el) {
      el = document.createElement('div');
      el.id = '__qc_stamp';
      el.setAttribute(
        'style',
        [
          'position:fixed',
          'top:8px',
          'right:8px',
          'z-index:2147483647',
          'background:rgba(220,38,38,0.92)',
          'color:#fff',
          'font:600 14px/1.3 system-ui,Segoe UI,Arial',
          'padding:6px 10px',
          'border-radius:6px',
          'pointer-events:none',
          'box-shadow:0 2px 6px rgba(0,0,0,.3)',
        ].join(';'),
      );
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

export async function shot(
  page: Page,
  name: string,
  extra = '',
  fullPage = false,
): Promise<string> {
  await stamp(page, extra);
  const path = `${SHOTS_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage });
  return path;
}

/** Scroll `el` near the top of its own scrolling container (never shifts the app shell). */
export async function scrollToTop(
  el: import('@playwright/test').Locator,
  offset = 12,
): Promise<void> {
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
