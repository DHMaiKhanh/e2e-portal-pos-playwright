import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * App switcher — since the 2026-10-13 redesign the left icon rail (logo + one
 * button per app) is gone. Switching apps goes through the sidebar's "Switch
 * app" menu button; the user menu sits at the foot of the same sidebar.
 *
 * TC-OVW-034 (FastboyPay home logo returns to `/`) was removed: the POS shell no
 * longer renders a home logo link.
 */
test.describe('App Switcher — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-033 — app switcher lists the Fastboy apps, and the user menu is present',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      const rail = dashboardPage.appRail;
      await expect(rail).toBeVisible();
      await expect(rail.getByRole('button', { name: /switch app/i })).toBeEnabled();
      await expect(rail.getByRole('button', { name: /open user menu/i })).toBeEnabled();

      await dashboardPage.appSwitcherButton.click();
      const menu = dashboardPage.appSwitcherMenu;
      await expect(menu).toBeVisible();
      for (const name of ['POS Nail Spa', 'Payment', 'Business', 'Gift Card'] as const) {
        const item = menu.getByRole('menuitem', { name, exact: true });
        // Exactly one of each — no missing or duplicated app entry.
        await expect(item).toHaveCount(1);
        await expect(item).toBeVisible();
      }

      await dashboardPage.page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
    },
  );
});
