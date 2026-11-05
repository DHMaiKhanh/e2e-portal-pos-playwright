import * as fs from 'fs';
import type { Locator, Page } from '@playwright/test';

/** Ad-hoc PROD verification helpers for VP-5098 (store #20258). Not part of the regular suite. */
export const OUT_DIR =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/ct-vp5098';
export const SHOTS_DIR = `${OUT_DIR}/shots`;
export const LOCK_DIR =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/checkout-flag.lock';

export const PROD_STORE = '20258';

/** Original value of `merchant_point_payment_config` on #20258 (must never change). */
export const ORIGINAL_FLAG = {
  selected_type: 'payment_method',
  point_bonus: 0,
  cash: { enabled: true, point: 50 },
  card: { enabled: true, point: 1 },
  gift_card: { enabled: true, point: 200 },
  other: { enabled: true, point: 100 },
  earn_on_tip: true,
} as const;

/** "2026-11-03 15:52" in UTC+7. */
export function nowUtc7(): string {
  const d = new Date(Date.now() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Append a line to the run log (captions, findings) so the report can be rebuilt. */
export function log(line: string): void {
  fs.appendFileSync(`${OUT_DIR}/run-log.txt`, `[${nowUtc7()}] ${line}\n`);
}

/** Fixed stamp (top-right) + caption (bottom-left), re-injected before every screenshot. */
export async function stamp(page: Page, caption = ''): Promise<void> {
  const text = `Verified on PROD ${nowUtc7()} (UTC+7) · store #${PROD_STORE}`;
  await page.evaluate(
    ([t, c]) => {
      const mk = (id: string, css: string[]): HTMLElement => {
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement('div');
          el.id = id;
          el.setAttribute('style', css.join(';'));
          document.body.appendChild(el);
        }
        return el;
      };
      const base = [
        'position:fixed',
        'z-index:2147483647',
        'color:#fff',
        'font:600 14px/1.35 system-ui,Segoe UI,Arial',
        'padding:6px 10px',
        'border-radius:6px',
        'pointer-events:none',
        'box-shadow:0 2px 6px rgba(0,0,0,.3)',
      ];
      mk('__qc_stamp', [
        ...base,
        'top:8px',
        'right:8px',
        'background:rgba(220,38,38,0.92)',
      ]).textContent = t;
      const cap = mk('__qc_caption', [
        ...base,
        'bottom:10px',
        'left:256px',
        'max-width:calc(100vw - 280px)',
        'font-size:15px',
        'background:rgba(17,24,39,0.9)',
      ]);
      cap.textContent = c;
      cap.style.display = c ? 'block' : 'none';
      const narrow = window.innerWidth < 900;
      cap.style.left = narrow ? '8px' : '256px';
      cap.style.maxWidth = narrow ? 'calc(100vw - 16px)' : 'calc(100vw - 280px)';
      const st = document.getElementById('__qc_stamp');
      if (st) st.style.fontSize = narrow ? '11px' : '14px';
    },
    [text, caption] as const,
  );
}

/**
 * Dashed outline + small label over an element (absolute overlay on <body>, positioned from the
 * element's viewport rect at call time — call right before the screenshot, after scrolling).
 */
export async function annotate(target: Locator, label: string, color = '#e11d48'): Promise<void> {
  await resetShell(target.page(), `annotate "${label}"`);
  const box = await target.boundingBox();
  if (!box) return;
  await target.page().evaluate(
    ([b, l, c]) => {
      const host = document.getElementById('__qc_marks') ?? document.createElement('div');
      host.id = '__qc_marks';
      host.setAttribute('style', 'position:fixed;inset:0;pointer-events:none;z-index:2147483646');
      if (!host.parentElement) document.body.appendChild(host);
      const r = document.createElement('div');
      r.setAttribute(
        'style',
        `position:fixed;left:${b.x - 4}px;top:${b.y - 4}px;width:${b.width + 8}px;height:${b.height + 8}px;` +
          `border:3px dashed ${c};border-radius:8px;box-sizing:border-box`,
      );
      const t = document.createElement('div');
      t.textContent = l;
      t.setAttribute(
        'style',
        `position:fixed;left:${b.x - 4}px;top:${Math.max(0, b.y - 26)}px;background:${c};color:#fff;` +
          'font:700 12px/1.2 system-ui,Segoe UI,Arial;padding:4px 8px;border-radius:4px;white-space:nowrap',
      );
      host.append(r, t);
    },
    [box, label, color] as const,
  );
}

export async function clearMarks(page: Page): Promise<void> {
  await page.evaluate(() => document.getElementById('__qc_marks')?.remove());
}

/**
 * Playwright's actionability auto-scroll can shift the overflow:hidden app shell (`pos-shell`);
 * a real mouse click never does (verified with raw mouse clicks). Log it and undo it.
 */
export async function resetShell(page: Page, where: string): Promise<void> {
  const shellTop = await page
    .locator('[data-slot="pos-shell"]')
    .evaluate((e) => {
      const t = e.scrollTop;
      e.scrollTop = 0;
      return t;
    })
    .catch(() => 0);
  if (shellTop)
    log(
      `WARN ${where}: pos-shell was scrolled by ${shellTop}px (Playwright auto-scroll) — reset to 0`,
    );
}

/** Screenshot with stamp + caption; marks are cleared afterwards. */
export async function shot(
  page: Page,
  name: string,
  caption: string,
  fullPage = false,
): Promise<string> {
  // Playwright's actionability auto-scroll can shift the overflow:hidden app shell (never happens
  // with a real mouse click — verified with raw mouse clicks). Log it and undo it before the shot.
  await resetShell(page, name);
  await stamp(page, caption);
  const path = `${SHOTS_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage });
  await clearMarks(page);
  log(`SHOT ${path} :: ${caption}`);
  return path;
}

/** Scroll `el` near the top of its own scrolling container (never shifts the app shell). */
export async function scrollToTop(el: Locator, offset = 40): Promise<void> {
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
  await el.page().waitForTimeout(350);
}
