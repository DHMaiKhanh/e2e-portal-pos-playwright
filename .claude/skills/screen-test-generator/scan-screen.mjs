/**
 * Generic screen scanner for the Portal POS app.
 *
 * Logs in with the captured session (STORAGE_STATE) and dumps a structured
 * feature inventory of a screen: headings, buttons, links, inputs, tables,
 * tabs, dialogs, test-ids, visible text and a trimmed accessibility tree.
 * Feeds the "screen-test-generator" skill so test cases can be derived from
 * real DOM instead of guesswork.
 *
 * Usage:
 *   node .claude/skills/screen-test-generator/scan-screen.mjs <route> [outFile]
 *   node .claude/skills/screen-test-generator/scan-screen.mjs /pos/14/overview docs/test-cases/_scan/overview.json
 *
 * <route> defaults to "/" (redirects to the store overview).
 */
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENV = process.env.ENV ?? 'local';
const envDir = path.resolve('configs/env');
for (const file of [`.env.${ENV}`, '.env.example']) {
  const full = path.join(envDir, file);
  if (fs.existsSync(full)) dotenv.config({ path: full, override: false });
}
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const STORAGE_STATE = process.env.STORAGE_STATE ?? 'src/data/dynamic/auth/admin.json';

const route = process.argv[2] ?? '/';
const outFile = process.argv[3];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: path.resolve(STORAGE_STATE),
  ignoreHTTPSErrors: true,
  viewport: { width: 1920, height: 1080 },
});
const page = await context.newPage();

await page.goto(new URL(route, BASE_URL).toString(), { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(2500);

const dom = await page.evaluate(() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const name = (el) => clean(el.getAttribute('aria-label') || el.textContent).slice(0, 80);
  const uniq = (arr) => [...new Set(arr)];

  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .map((h) => ({ level: h.tagName, text: name(h) }))
    .filter((h) => h.text);

  const buttons = uniq(
    [...document.querySelectorAll('button,[role="button"]')].map(name).filter(Boolean),
  );

  const links = [];
  const seen = new Set();
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    const key = `${name(a)}|${href}`;
    if (!seen.has(key)) {
      seen.add(key);
      links.push({ name: name(a), href });
    }
  }

  const inputs = [...document.querySelectorAll('input,textarea,select')].map((el) => ({
    tag: el.tagName.toLowerCase(),
    type: el.getAttribute('type') || '',
    placeholder: el.getAttribute('placeholder') || '',
    label: el.getAttribute('aria-label') || el.getAttribute('name') || el.id || '',
  }));

  const tables = [...document.querySelectorAll('table,[role="table"]')].map((t) => {
    const headers = [...t.querySelectorAll('th,[role="columnheader"]')].map(name).filter(Boolean);
    const rows = [...t.querySelectorAll('tbody tr,[role="row"]')];
    const sample = rows.slice(0, 3).map((r) =>
      [...r.querySelectorAll('td,[role="cell"],[role="gridcell"]')].map(name),
    );
    return { headers, rowCount: rows.length, sample };
  });

  const tabs = uniq([...document.querySelectorAll('[role="tab"]')].map(name).filter(Boolean));
  const dialogs = document.querySelectorAll('[role="dialog"],[role="alertdialog"]').length;
  const testIds = uniq(
    [...document.querySelectorAll('[data-testid]')].map((el) => el.getAttribute('data-testid')),
  ).slice(0, 60);

  const main = document.querySelector('main') || document.body;
  const mainText = clean(main.innerText).slice(0, 6000);

  return { title: document.title, headings, buttons, links, inputs, tables, tabs, dialogs, testIds, mainText };
});

// Accessibility (ARIA) tree — the modern, roles+names view of the page.
const axTree = (await page.locator('body').ariaSnapshot().catch(() => '')).slice(0, 14000);

const result = {
  route,
  finalUrl: page.url(),
  scannedAt: new Date().toISOString(),
  ...dom,
  axTree,
};

const json = JSON.stringify(result, null, 2);
if (outFile) {
  const p = path.resolve(outFile);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, json, 'utf8');
  const shot = p.replace(/\.json$/, '.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log(`✓ Inventory  -> ${outFile}`);
  console.log(`✓ Screenshot -> ${path.relative(process.cwd(), shot)}`);
}

console.log('\n===== SCAN SUMMARY =====');
console.log('route        :', result.route, '->', result.finalUrl);
console.log('headings     :', result.headings.length);
console.log('buttons      :', result.buttons.length);
console.log('links        :', result.links.length);
console.log('inputs       :', result.inputs.length);
console.log('tables       :', result.tables.length, '| tabs:', result.tabs.length, '| dialogs:', result.dialogs);
console.log('testIds      :', result.testIds.length);
if (!outFile) console.log('\n===== FULL JSON =====\n' + json);

await context.close();
await browser.close();
