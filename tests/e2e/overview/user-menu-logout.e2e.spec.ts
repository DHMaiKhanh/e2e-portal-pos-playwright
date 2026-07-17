import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "User Menu & Logout" area (lean core).
 *
 * The avatar user-menu opens and exposes a clearly-labeled Logout entry. The
 * actual logout click is intentionally out of the lean core: it clears — and may
 * server-side revoke — the shared authenticated session, which would poison the
 * reused storageState for every other spec. That belongs in an isolated,
 * disposable auth context/project.
 */
test.describe('User Menu & Logout — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-143 — opens the user menu and lists a clearly labeled Logout item',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await dashboardPage.openUserMenu();
      await expect(dashboardPage.logoutMenuItem).toBeVisible();
      await expect(dashboardPage.logoutMenuItem).toHaveText(/log ?out|sign out/i);
    },
  );
});
