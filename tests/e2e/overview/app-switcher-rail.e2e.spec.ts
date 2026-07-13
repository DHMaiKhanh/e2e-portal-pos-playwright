import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * App Switcher Rail — the left icon rail (complementary landmark) on the store
 * Overview: the FastboyPay home logo, the app-switcher buttons
 * (POS / Portal / Business / Gift Card), and the user-menu avatar (lean core).
 *
 * Cross-app switches (Portal / Business / Gift Card) leave the /pos/<id>/...
 * namespace for external app landings, so they are out of the lean core.
 */
test.describe('App Switcher Rail — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-033 — rail renders logo, four app buttons, and user menu',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      const rail = dashboardPage.appRail;
      await expect(rail).toBeVisible();
      await expect(rail.getByRole('link', { name: /fastboypay home/i })).toBeVisible();

      for (const name of ['POS', 'Portal', 'Business', 'Gift Card'] as const) {
        const btn = rail.getByRole('button', { name, exact: true });
        // Exactly one of each — no missing or duplicated app button.
        await expect(btn).toHaveCount(1);
        await expect(btn).toBeVisible();
        await expect(btn).toBeEnabled();
      }

      await expect(rail.getByRole('button', { name: /open user menu/i })).toBeVisible();
    },
  );

  test(
    'TC-OVW-034 — FastboyPay logo returns to /pos/<id>/overview',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      // Navigate away first (labels repeat, so match the store-scoped href).
      await dashboardPage.sidebar.navigateToHref(/^\/pos\/\d+\/orders$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/orders/);

      await dashboardPage.logoHomeLink.click();

      // Authenticated '/' redirects back to the store overview.
      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
      await expect(dashboardPage.heading).toBeVisible();
    },
  );
});
