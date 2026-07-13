import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '@configs/env/loadEnv';

/**
 * Runs once before the UI projects (declared as their `dependencies`).
 *
 * The Portal signs in via Google OAuth + 2-Step Verification, which cannot be
 * driven headlessly. So instead of logging in here, we capture the session ONCE
 * by hand and reuse it:
 *
 *     npm run auth        # opens a browser, you sign in, session is saved
 *
 * That writes STORAGE_STATE (a cookies + localStorage snapshot) which every UI
 * project consumes via `storageState`. This step only verifies that snapshot
 * still exists and is still valid, and fails fast with instructions if not.
 */
setup('reuse captured session', async ({ browser }) => {
  const statePath = path.resolve(env.STORAGE_STATE);

  if (!fs.existsSync(statePath) || fs.statSync(statePath).size === 0) {
    throw new Error(
      `No saved session at "${env.STORAGE_STATE}".\n` +
        `Sign in once and capture it:  npm run auth`,
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
  const bouncedToLogin = new URL(page.url()).pathname.startsWith('/login');
  await context.close();

  if (bouncedToLogin) {
    throw new Error(
      `Saved session at "${env.STORAGE_STATE}" has expired.\n` + `Refresh it:  npm run auth`,
    );
  }
});
