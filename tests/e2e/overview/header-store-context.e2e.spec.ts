import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Header & Store Context" area (lean core).
 *
 * On-load display of the top-bar store switcher, opening its dropdown, and the
 * Active/Inactive status badge. The store id is read from the URL and asserted by
 * regex — never hardcoded. (Store *switching* needs a second/inactive store the
 * single reused session can't guarantee, so it is out of the lean core.)
 */
test.describe('Header & Store Context — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-017 — displays the current store in the top-bar store switcher',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.storeSwitcherButton).toBeVisible();
      // Label ends with the store id ("… #14"); matches the URL-addressed store.
      await expect(dashboardPage.storeSwitcherButton).toHaveText(/#\d+$/);
    },
  );

  test(
    'TC-OVW-018 — opens the store switcher dropdown listing the current store',
    { tag: [Tag.REGRESSION] },
    async ({ dashboardPage }) => {
      await dashboardPage.openStoreSwitcher();
      // The open dropdown lists the account's stores; the current store appears.
      await expect(dashboardPage.storeOption(/#\d+/).first()).toBeVisible();
    },
  );

  test(
    'TC-OVW-022 — shows the current store name with a status badge in the header',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      // The Active/Inactive badge renders next to the store name in the header.
      await expect(dashboardPage.storeStatusBadge.first()).toBeVisible();
    },
  );
});
