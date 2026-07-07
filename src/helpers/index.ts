/**
 * Cross-cutting test helpers (composed flows that don't belong to a single page).
 * Keep page-specific logic in page objects; put multi-page orchestration here.
 */

import type { Page } from '@playwright/test';
import { LoginPage } from '@pages/auth/LoginPage';
import { USERS } from '@data/static/users';

/** Log in through the UI as a known user. Used by global setup and ad-hoc flows. */
export const loginAs = async (page: Page, user = USERS.ADMIN): Promise<void> => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAndWait(user.username, user.password);
};
