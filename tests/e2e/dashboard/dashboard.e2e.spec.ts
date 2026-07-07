import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

// Relies on the storageState produced by global.setup.ts — already signed in.
test.describe(`Dashboard ${Tag.REGRESSION} ${Tag.UI}`, () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test('renders the dashboard for an authenticated user', async ({ dashboardPage }) => {
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('navigates to Orders via the sidebar', async ({ dashboardPage, page }) => {
    await dashboardPage.sidebar.navigateTo(/orders/i);
    await expect(page).toHaveURL(/\/orders/);
  });
});
