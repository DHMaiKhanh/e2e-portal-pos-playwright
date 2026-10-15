/**
 * One-time interactive auth capture.
 *
 * The Portal signs in via Google OAuth + 2-Step Verification, which can't be
 * driven headlessly. This opens a real browser, lets you sign in BY HAND, then
 * saves the authenticated session (cookies + localStorage) to STORAGE_STATE.
 * Every UI test project reuses that snapshot via `storageState`, so you only run
 * this again when the session is missing or has expired.
 *
 *     npm run auth:stage    # → https://v2.dev-fastboypay.com
 *     npm run auth:prod     # → https://v2.fastboypay.com
 */
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

// Mirror loadEnv.ts precedence: real OS env wins, then .env.<ENV>, then .env.example.
const ENV = process.env.ENV;
const envDir = path.resolve('configs/env');
if (!ENV || !fs.existsSync(path.join(envDir, `.env.${ENV}`))) {
  console.error(
    `\x1b[31mUnknown ENV "${ENV ?? ''}". Use:  npm run auth:stage  or  npm run auth:prod\x1b[0m`,
  );
  process.exit(1);
}
for (const file of [`.env.${ENV}`, '.env.example']) {
  const full = path.join(envDir, file);
  if (fs.existsSync(full)) dotenv.config({ path: full, override: false });
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const STORAGE_STATE = process.env.STORAGE_STATE ?? 'src/data/dynamic/auth/admin.json';
const LOGIN_URL = new URL('/login', BASE_URL).toString();

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

const ask = (q) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

// Prefer real Chrome (Google is less likely to flag it as an insecure browser);
// fall back to the bundled Chromium if Chrome isn't installed.
async function launch() {
  try {
    return await chromium.launch({ headless: false, channel: 'chrome' });
  } catch {
    return await chromium.launch({ headless: false });
  }
}

const browser = await launch();
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 },
  locale: 'en-US',
});
const page = await context.newPage();

console.log(yellow(`\nOpening ${LOGIN_URL} …`));
await page.goto(LOGIN_URL);

console.log(
  yellow(
    [
      '',
      '────────────────────────────────────────────────────────────',
      '  Sign in with Google in the browser window that just opened.',
      '  Complete the password + 2-Step Verification (tap "Yes" on',
      '  your phone) and wait until the Portal has fully loaded.',
      '',
      '  Tip: tick "Don\'t ask again on this device" at the 2FA step',
      '  so future logins skip the phone prompt.',
      '────────────────────────────────────────────────────────────',
    ].join('\n'),
  ),
);

await ask('\nWhen you are fully logged in, press ENTER here to save the session… ');

const statePath = path.resolve(STORAGE_STATE);
fs.mkdirSync(path.dirname(statePath), { recursive: true });
await context.storageState({ path: statePath });

const saved = JSON.parse(fs.readFileSync(statePath, 'utf8'));
console.log(
  green(
    `\n✓ Session saved to ${STORAGE_STATE} ` +
      `(${saved.cookies?.length ?? 0} cookies, ${saved.origins?.length ?? 0} origins).`,
  ),
);
// Envs that point at the same Portal (e.g. local + stage → dev Portal) share one
// login, so mirror the session to their STORAGE_STATE too. Otherwise picking a
// different ENV in the runner silently reuses a stale, expired snapshot.
for (const file of fs.readdirSync(envDir)) {
  if (!/^\.env\.\w+$/.test(file) || file === `.env.${ENV}` || file === '.env.example') continue;
  const other = dotenv.parse(fs.readFileSync(path.join(envDir, file)));
  if (!other.BASE_URL || !other.STORAGE_STATE) continue;
  if (new URL(other.BASE_URL).origin !== new URL(BASE_URL).origin) continue;
  const otherPath = path.resolve(other.STORAGE_STATE);
  if (otherPath === statePath) continue;
  fs.mkdirSync(path.dirname(otherPath), { recursive: true });
  fs.copyFileSync(statePath, otherPath);
  console.log(green(`  Also copied to ${other.STORAGE_STATE} (${file.slice(5)} uses the same Portal).`));
}

console.log(green('  UI tests will now reuse it — run: npm test\n'));

await context.close();
await browser.close();
