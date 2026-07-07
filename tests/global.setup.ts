import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '@configs/env/loadEnv';
import { loginAs } from '@helpers/index';
import { USERS } from '@data/static/users';

/**
 * Runs once before the UI projects (declared as their `dependencies`).
 * Logs in through the UI and persists the authenticated session to
 * STORAGE_STATE so every UI spec starts already signed in — no per-test login.
 */
setup('authenticate as admin', async ({ page }) => {
  await loginAs(page, USERS.ADMIN);

  const statePath = path.resolve(env.STORAGE_STATE);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  await page.context().storageState({ path: statePath });
});
