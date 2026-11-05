import * as fs from 'fs';
import * as path from 'path';
import type { Page, Route, Request } from '@playwright/test';
import { expect } from '@playwright/test';
import { env } from '@configs/env/loadEnv';

/**
 * Shared helpers for the PROD evidence run of VP-4566 / VP-5214 / VP-5215 / VP-5216.
 * Not a spec (no `.spec.ts`), so Playwright never collects it on its own.
 */

export const SHOTS_DIR =
  process.env.SHOTS_DIR ??
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4566/shots';

/** Hard stop unless we are on the PROD Portal and the internal test store #20258. */
export function assertProdTestStore(): void {
  expect(env.BASE_URL, 'must run against PROD Portal').toBe('https://v2.fastboypay.com');
  expect(env.STORE_ID, 'must only touch internal test store #20258').toBe('20258');
}

/** "2026-11-03 15:04" in UTC+7, whatever the machine TZ is. */
export function nowUtc7(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 16).replace('T', ' ');
}

/** Injects (or refreshes) a fixed timestamp/store banner, then saves a 1920x1080 (or full page) PNG. */
export async function shot(
  page: Page,
  file: string,
  details: string[] = [],
  opts: { fullPage?: boolean } = {},
): Promise<string> {
  const lines = [
    `Verified on PROD ${nowUtc7()} (UTC+7) · Store #20258 "VOLT POS"`,
    `URL: ${decodeURI(page.url())}`,
    ...details.filter(Boolean),
  ];
  await page.evaluate((text: string[]) => {
    document.getElementById('__qa_stamp__')?.remove();
    const d = document.createElement('div');
    d.id = '__qa_stamp__';
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = [
      'position:fixed',
      'left:50%',
      'top:4px',
      'transform:translateX(-50%)',
      'z-index:2147483647',
      'max-width:1100px',
      'padding:8px 12px',
      'border-radius:6px',
      'background:rgba(17,24,39,.88)',
      'color:#fde047',
      'font:600 13px/1.45 Consolas,monospace',
      'white-space:pre-wrap',
      'pointer-events:none',
      'box-shadow:0 2px 8px rgba(0,0,0,.35)',
    ].join(';');
    d.textContent = text.join('\n');
    document.body.appendChild(d);
  }, lines);
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const full = path.join(SHOTS_DIR, file).replace(/\\/g, '/');
  await page.screenshot({ path: full, fullPage: opts.fullPage ?? false });
  return full;
}

/** JSON-quoted string plus a count of leading/trailing whitespace. */
export function visible(s: string): string {
  const lead = s.length - s.trimStart().length;
  const trail = s.length - s.trimEnd().length;
  const extra =
    lead || trail ? ` [${lead} đầu/${trail} cuối là khoảng trắng, len ${s.length}]` : '';
  return `${JSON.stringify(s)}${extra}`;
}

/**
 * Write guard: while armed, any POST/PUT to /customer_groups is ABORTED before it reaches the
 * server and recorded. Used for whitespace-only inputs so a client-side regression can never
 * create a nameless group on PROD.
 */
export async function armWriteGuard(
  page: Page,
): Promise<{ blocked: { method: string; body: unknown }[] }> {
  const state = { blocked: [] as { method: string; body: unknown }[] };
  await page.route(
    (url) => url.host.startsWith('volt-pos.') && /^\/customer_groups(\/|$)/.test(url.pathname),
    async (route: Route, req: Request) => {
      if (req.method() === 'POST' || req.method() === 'PUT') {
        state.blocked.push({ method: req.method(), body: req.postDataJSON() });
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    },
  );
  return state;
}
