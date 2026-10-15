import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '@configs/env/loadEnv';

const AUTH_CMD = `npm run auth:${env.ENV === 'prod' ? 'prod' : 'stage'}`;

/**
 * Runs once before the UI projects (declared as their `dependencies`).
 *
 * The Portal signs in via Google OAuth + 2-Step Verification, which cannot be
 * driven headlessly. So instead of logging in here, we capture the session ONCE
 * by hand and reuse it:
 *
 *     npm run auth:stage   # or auth:prod — opens a browser, you sign in, session is saved
 *
 * That writes STORAGE_STATE (a cookies + localStorage snapshot) which every UI
 * project consumes via `storageState`. This step only verifies that snapshot
 * still exists and is still valid, and fails fast with instructions if not.
 */
setup('reuse captured session', async ({ browser }) => {
  const statePath = path.resolve(env.STORAGE_STATE);

  if (!fs.existsSync(statePath) || fs.statSync(statePath).size === 0) {
    throw new Error(
      `No saved session at "${env.STORAGE_STATE}".\n` + `Sign in once and capture it:  ${AUTH_CMD}`,
    );
  }

  // Validate the snapshot: a protected route must NOT bounce us to /login.
  const context = await browser.newContext({
    storageState: statePath,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForLoadState('load').catch(() => {});
  // An expired session is NOT bounced on 'load': the SPA first tries to refresh
  // the token and only then client-side redirects to /login (~4s later). Wait
  // until the page settles on either /login or the authenticated app shell.
  await Promise.race([
    page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 20_000 }),
    page.getByRole('link', { name: 'Overview' }).first().waitFor({ timeout: 20_000 }),
  ]).catch(() => {});
  const bouncedToLogin = new URL(page.url()).pathname.startsWith('/login');
  await context.close();

  if (bouncedToLogin) {
    throw new Error(
      `Saved session at "${env.STORAGE_STATE}" has expired.\n` + `Refresh it:  ${AUTH_CMD}`,
    );
  }
});
