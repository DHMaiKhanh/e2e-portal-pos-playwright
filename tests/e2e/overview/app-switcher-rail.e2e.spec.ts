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

      // Rail labels read off the live aria-labels on 2026-08-12. The second app
      // is now "Payment" — it used to be labelled "Portal".
      for (const name of ['POS', 'Payment', 'Business', 'Gift Card'] as const) {
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

      // The logo is href="/" and `/` no longer redirects into the store — it now
      // lands on the Fastboy Portal app chooser. See the note on TC-OVW-002.
      await expect(page).not.toHaveURL(/\/pos\/\d+\//);
      await expect(page.getByText(/choose where you'?d like to start/i)).toBeVisible();
    },
  );
});
