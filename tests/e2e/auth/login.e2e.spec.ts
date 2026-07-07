import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { USERS } from '@data/static/users';
import { ErrorMessages } from '@constants/errorMessages';

// This suite tests the login flow itself, so it must start signed OUT —
// override the project-level storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe(`Auth — login ${Tag.SMOKE} ${Tag.AUTH}`, () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('logs in with valid admin credentials', async ({ loginPage, dashboardPage }) => {
    await test.step('Submit credentials', async () => {
      await loginPage.loginAndWait(USERS.ADMIN.username, USERS.ADMIN.password);
    });

    await test.step('Lands on dashboard', async () => {
      await dashboardPage.waitForReady();
      await expect(dashboardPage.heading).toBeVisible();
    });
  });

  test('shows an error for invalid credentials', async ({ loginPage }) => {
    await loginPage.login('wrong.user', 'wrong-password');
    await expect(loginPage.errorMessage).toContainText(ErrorMessages.INVALID_CREDENTIALS);
  });
});
