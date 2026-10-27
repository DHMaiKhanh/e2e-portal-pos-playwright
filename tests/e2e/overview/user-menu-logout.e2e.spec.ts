import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * User menu (sidebar foot, "Open user menu"). Logging out is NOT exercised: it
 * would invalidate the shared session every other test relies on.
 */
test.describe('User Menu & Logout — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-143 — opens the user menu and lists a clearly labeled Logout item',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await dashboardPage.openUserMenu();

      await expect(dashboardPage.logoutMenuItem).toBeVisible();
      await expect(dashboardPage.logoutMenuItem).toBeEnabled();
      await expect(dashboardPage.logoutMenuItem).toHaveAccessibleName(/log ?out|sign ?out/i);

      // Every menu entry carries a non-empty label.
      const items = page.getByRole('menu').getByRole('menuitem');
      const count = await items.count();
      expect(count).toBeGreaterThan(1);
      for (let i = 0; i < count; i++) {
        expect(((await items.nth(i).textContent()) ?? '').trim().length).toBeGreaterThan(0);
      }

      await page.keyboard.press('Escape');
      await expect(dashboardPage.logoutMenuItem).toBeHidden();
    },
  );
});
