import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Thanh App Switcher — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-033 — app rail renders logo, four app-switcher buttons, and user menu in order',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.appRail).toBeVisible();
      await expect(dashboardPage.logoHomeLink).toBeVisible();
      await expect(dashboardPage.logoHomeLink).toBeEnabled();

      await expect(dashboardPage.posAppButton).toBeVisible();
      await expect(dashboardPage.posAppButton).toBeEnabled();
      await expect(dashboardPage.portalAppButton).toBeVisible();
      await expect(dashboardPage.portalAppButton).toBeEnabled();
      await expect(dashboardPage.businessAppButton).toBeVisible();
      await expect(dashboardPage.businessAppButton).toBeEnabled();
      await expect(dashboardPage.giftCardAppButton).toBeVisible();
      await expect(dashboardPage.giftCardAppButton).toBeEnabled();

      await expect(dashboardPage.userMenu).toBeVisible();
      await expect(dashboardPage.userMenu).toBeEnabled();
    },
  );

  test(
    'TC-OVW-034 — clicking FastboyPay home logo returns user to store overview',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, ordersPage, page }) => {
      await ordersPage.goto();

      await dashboardPage.logoHomeLink.click();

      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
      await expect(dashboardPage.heading).toBeVisible();
    },
  );
});
