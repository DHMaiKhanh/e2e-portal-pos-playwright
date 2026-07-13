import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

// Relies on the storageState produced by global.setup.ts — already signed in.
test.describe(`Dashboard ${Tag.REGRESSION} ${Tag.UI}`, () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test('renders the overview for an authenticated user', async ({ dashboardPage, page }) => {
    await expect(dashboardPage.heading).toBeVisible();
    await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
  });

  test('navigates to Orders via the sidebar', async ({ dashboardPage, page }) => {
    // Labels repeat in the sidebar (store "Orders" vs admin "Orders"), so match
    // the store-scoped destination by href.
    await dashboardPage.sidebar.navigateToHref(/^\/pos\/\d+\/orders$/);
    await expect(page).toHaveURL(/\/pos\/\d+\/orders/);
  });
});
