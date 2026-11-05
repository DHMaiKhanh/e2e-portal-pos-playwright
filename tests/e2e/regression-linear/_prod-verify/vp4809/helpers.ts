import * as fs from 'fs';
import * as path from 'path';
import { type Page, expect } from '@playwright/test';
import { env } from '@configs/env/loadEnv';

/** PROD verification helpers for VP-4809 (store #20258 only). Not part of the regular suite. */

export const PROD_STORE = '20258';
export const SHOTS_DIR =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4809/shots';

export function assertProdTestStore(): void {
  expect(env.ENV, 'ENV must be prod').toBe('prod');
  expect(env.STORE_ID, 'only store #20258 may be touched').toBe(PROD_STORE);
  expect(new URL(env.BASE_URL).host).toBe('v2.fastboypay.com');
}

export function utc7Now(): string {
  const iso = new Date(Date.now() + 7 * 3600_000).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** Fixed overlay stamp so date/time + store are visible on every screenshot. */
export async function stamp(page: Page, extra?: string): Promise<void> {
  const text =
    `Verified on PROD ${utc7Now()} (UTC+7) · store #${PROD_STORE}` + (extra ? ` · ${extra}` : '');
  await page.evaluate((t) => {
    let d = document.getElementById('__qa_stamp');
    if (!d) {
      d = document.createElement('div');
      d.id = '__qa_stamp';
      Object.assign(d.style, {
        position: 'fixed',
        left: '50%',
        top: '6px',
        transform: 'translateX(-50%)',
        zIndex: '2147483647',
        background: 'rgba(185,28,28,0.93)',
        color: '#fff',
        font: '600 14px/1.35 system-ui, Segoe UI, sans-serif',
        padding: '6px 12px',
        borderRadius: '6px',
        pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,.35)',
        whiteSpace: 'nowrap',
      });
      document.body.appendChild(d);
    }
    d.textContent = t;
  }, text);
}

export async function shot(page: Page, name: string, extra?: string): Promise<string> {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  await stamp(page, extra);
  const file = path.join(SHOTS_DIR, `${name}.png`).replace(/\\/g, '/');
  await page.screenshot({ path: file });
  return file;
}

/** Outline an element as an evidence annotation (dashed red, offset so it is clearly not product UI). */
export async function annotate(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const e = el as HTMLElement;
      e.style.outline = '3px dashed #dc2626';
      e.style.outlineOffset = '6px';
    });
  }, selector);
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Render an evidence panel (API / network data) in a page so it can be screenshotted. */
export async function renderEvidence(
  page: Page,
  title: string,
  rows: [string, string][],
  json?: unknown,
): Promise<void> {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font:15px/1.5 Consolas,Menlo,monospace;margin:56px 40px;background:#fafafa;color:#111}
h1{font:600 22px system-ui,Segoe UI,sans-serif;margin:0 0 16px}
table{border-collapse:collapse;margin-bottom:18px}td{border:1px solid #ccc;padding:6px 10px;vertical-align:top}
td:first-child{background:#eef;font-weight:600;white-space:nowrap}
pre{background:#fff;border:1px solid #ccc;padding:12px;white-space:pre-wrap;max-height:560px;overflow:hidden}</style></head>
<body><h1>${esc(title)}</h1><table>${rows
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join(
      '',
    )}</table>${json !== undefined ? `<pre>${esc(JSON.stringify(json, null, 2))}</pre>` : ''}</body></html>`;
  await page.setContent(html);
}
