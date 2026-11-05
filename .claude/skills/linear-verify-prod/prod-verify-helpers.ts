import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { blockMutations } from '@helpers/writeGuard';

/**
 * Shared helpers for the ad-hoc PROD verify specs written by the `linear-verify-prod` skill.
 * Copy to tests/e2e/regression-linear/_prod-verify/_shared.ts (not committed).
 *
 * Screenshots go under /reports (git-ignored, and unlike test-results/ not wiped at run start):
 * reports/prod-verify/<YYYY-MM-DD>/<vp-id>-TCxx-<name>.png. Override with VERIFY_SHOTS.
 */

export const STORE = process.env.STORE_ID ?? '';

/** "YYYY-MM-DD HH:mm" in the store's timezone (UTC+7). */
export const nowUtc7 = (): string => {
  const d = new Date(Date.now() + 7 * 3600_000).toISOString();
  return `${d.slice(0, 10)} ${d.slice(11, 16)}`;
};

/** Calendar day in UTC+7, `offsetDays` back from today — for the multi-day screenshots. */
export const dayUtc7 = (offsetDays = 0): string =>
  new Date(Date.now() + 7 * 3600_000 - offsetDays * 86_400_000).toISOString().slice(0, 10);

export const SHOTS = process.env.VERIFY_SHOTS ?? path.join('reports', 'prod-verify', dayUtc7());
fs.mkdirSync(SHOTS, { recursive: true });

/** Requests a read-only verify may still send: token refresh and report queries (POST …/run). */
const allowed = (u: URL): boolean =>
  /\/v4\/report_queries\/[^/]+\/run$/.test(u.pathname) || /refresh_token/.test(u.pathname);

/** Block every other mutating request. Call before `goto`; assert the returned array is empty. */
export const guardProd = (page: Page): Promise<string[]> =>
  blockMutations(page, (u) => !allowed(u));

/** Red overlay with PROD + date/time + store, then a viewport screenshot. Returns the file path. */
export async function shot(page: Page, name: string, caption = ''): Promise<string> {
  const text = `Verified on PROD ${nowUtc7()} (UTC+7)${STORE ? ` · store #${STORE}` : ''}`;
  await page.evaluate(
    ([t, c]) => {
      let el = document.getElementById('__qa_overlay');
      if (!el) {
        el = document.createElement('div');
        el.id = '__qa_overlay';
        document.body.appendChild(el);
      }
      el.innerHTML = '';
      for (const [line, weight] of [
        [t, '600'],
        [c, '500'],
      ]) {
        if (!line) continue;
        const div = document.createElement('div');
        div.textContent = line;
        div.style.fontWeight = weight;
        el.appendChild(div);
      }
      Object.assign(el.style, {
        position: 'fixed',
        right: '36px',
        top: '62px',
        zIndex: '2147483647',
        background: 'rgba(185,28,28,0.93)',
        color: '#fff',
        font: '14px/1.45 system-ui, Segoe UI, sans-serif',
        padding: '6px 12px',
        borderRadius: '6px',
        pointerEvents: 'none',
        maxWidth: '900px',
        textAlign: 'right',
        boxShadow: '0 2px 8px rgba(0,0,0,.35)',
      });
    },
    [text, caption] as const,
  );
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file });
  return file;
}

/** Outline elements (e.g. the rows a TC is about) so the screenshot points at the evidence. */
export async function highlight(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    for (const el of Array.from(document.querySelectorAll(sel)) as HTMLElement[]) {
      el.style.outline = '3px solid #f59e0b';
      el.style.outlineOffset = '-3px';
      el.style.background = '#fef3c7';
    }
  }, selector);
}
