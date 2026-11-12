import type { BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { blockMutations } from '@helpers/writeGuard';
import { env } from '@configs/env/loadEnv';

/**
 * Shared helpers for the ad-hoc DEV verify specs written by the `linear-verify-dev` skill.
 * Copy to tests/e2e/regression-linear/_dev-verify/_shared.ts (not committed).
 *
 * Screenshots go under /reports (git-ignored, and unlike test-results/ not wiped at run start):
 * reports/dev-verify/<YYYY-MM-DD>/<vp-id>-TCxx-<name>.png. Override with VERIFY_SHOTS.
 */

export const STORE = process.env.STORE_ID ?? '';

/** "YYYY-MM-DD HH:mm" in the store's timezone (UTC+7). */
export const nowUtc7 = (): string => {
  const d = new Date(Date.now() + 7 * 3600_000).toISOString();
  return `${d.slice(0, 10)} ${d.slice(11, 16)}`;
};

/** Calendar day in UTC+7, `offsetDays` back from today. */
export const dayUtc7 = (offsetDays = 0): string =>
  new Date(Date.now() + 7 * 3600_000 - offsetDays * 86_400_000).toISOString().slice(0, 10);

/**
 * DEV's refresh token rotates and the access token lives 5 minutes. With REUSE_CONTEXT=0 (needed
 * for video) every test gets a fresh context from STORAGE_STATE; once one of them refreshes, the
 * token left in the file is dead and the next test lands on /login. Write the refreshed session
 * back after every test (`test.afterEach(({ context }) => saveSession(context))`) and before
 * closing any hand-made context. Keep verify specs serial (`mode: 'serial'`) so no two contexts
 * refresh at once.
 */
export async function saveSession(context: BrowserContext): Promise<void> {
  const file = env.STORAGE_STATE;
  const pages = context.pages();
  if (pages.some((p) => !p.isClosed() && new URL(p.url()).pathname.startsWith('/login'))) return;
  await context.storageState({ path: file }).catch(() => {});
}

export const SHOTS = process.env.VERIFY_SHOTS ?? path.join('reports', 'dev-verify', dayUtc7());
fs.mkdirSync(SHOTS, { recursive: true });

/**
 * Requests that must never fire even on DEV: they reach real devices/people or cannot be undone.
 * A TC that has to prove one of these buttons is wired asserts the blocked call instead.
 */
const DANGEROUS =
  /remote_action|send_(sms|email)|\/refund|\/void|\/charge|\/payout|\/publish|\/logout|\/import/i;

/** Block only the dangerous calls; normal DEV writes (save a setting, edit a record) go through. */
export const guardDev = (page: Page): Promise<string[]> =>
  blockMutations(page, (u) => DANGEROUS.test(u.pathname));

/** Block every mutating request except token refresh / report queries — for read-only TCs. */
export const guardReadOnly = (page: Page): Promise<string[]> =>
  blockMutations(
    page,
    (u) =>
      !/\/v4\/report_queries\/[^/]+\/run$/.test(u.pathname) && !/refresh_token/.test(u.pathname),
  );

/** Blue overlay with DEV + date/time + store, then a viewport screenshot. Returns the file path. */
export async function shot(page: Page, name: string, caption = ''): Promise<string> {
  const text = `Verified on DEV ${nowUtc7()} (UTC+7)${STORE ? ` · store #${STORE}` : ''}`;
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
        background: 'rgba(29,78,216,0.93)',
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

/**
 * Pin a small "DEV · <TC> · time · store" badge in the bottom-left corner of every page load,
 * so the per-TC video (VIDEO=on) shows which TC/env/store it is from. Call at the start of the
 * test, BEFORE the first page.goto (it uses addInitScript). Bottom-left so it never covers the
 * `shot()` overlay (top-right) or the Portal header.
 */
export async function videoStamp(page: Page, label: string): Promise<void> {
  const text = `DEV · ${label} · ${nowUtc7()} (UTC+7)${STORE ? ` · store #${STORE}` : ''}`;
  await page.addInitScript((t) => {
    const put = () => {
      if (!document.body || document.getElementById('__qa_video_stamp')) return;
      const el = document.createElement('div');
      el.id = '__qa_video_stamp';
      el.textContent = t;
      Object.assign(el.style, {
        position: 'fixed',
        left: '8px',
        bottom: '8px',
        zIndex: '2147483647',
        background: 'rgba(29,78,216,0.85)',
        color: '#fff',
        font: '12px/1.4 system-ui, Segoe UI, sans-serif',
        padding: '3px 8px',
        borderRadius: '4px',
        pointerEvents: 'none',
      });
      document.body.appendChild(el);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', put);
    else put();
  }, text);
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
