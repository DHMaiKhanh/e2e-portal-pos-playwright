import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { env } from '@configs/env/loadEnv';

/**
 * Overview screen — "Header & Store Context".
 *
 * The store switcher (sidebar button "<store name> #<id>"), its "Merchant"
 * popover, and the Active/Inactive pill beside the h1 (merchant name). The store
 * id comes from env — store *switching* needs a second store the shared session
 * cannot guarantee, so it is out of scope.
 */
test.describe('Header & Store Context — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-017 — displays the current store in the store switcher',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(page).toHaveURL(new RegExp(`/pos/nail/${env.STORE_ID}/overview`));
      await expect(dashboardPage.storeSwitcherButton).toBeVisible();
      await expect(dashboardPage.storeSwitcherButton).toBeEnabled();
      // Label ends with the URL-addressed store id ("… #100004").
      await expect(dashboardPage.storeSwitcherButton).toHaveAccessibleName(
        new RegExp(`#${env.STORE_ID}$`),
      );
    },
  );

  test(
    'TC-OVW-018 — opens the store switcher listing stores with the current one marked',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await dashboardPage.openStoreSwitcher();
      await expect(dashboardPage.storeOption(/#\d+/).first()).toBeVisible();

      const current = dashboardPage.storeOption(new RegExp(`#\\s*${env.STORE_ID}$`));
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute('aria-checked', 'true');
      // Only the current store is checked.
      await expect(dashboardPage.page.locator('[role="option"][aria-checked="true"]')).toHaveCount(
        1,
      );
    },
  );

  test(
    'TC-OVW-022 — shows the current store name with a status badge in the header',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      // The h1 is the merchant's business name, repeated as the first Merchant
      // information line.
      const name = (await dashboardPage.heading.innerText()).trim();
      expect(name.length).toBeGreaterThan(0);
      await expect(dashboardPage.merchantInfoSection).toContainText(name);

      await expect(dashboardPage.storeStatusBadge).toBeVisible();
      await expect(dashboardPage.storeStatusBadge).toHaveText(/^(Active|Inactive)$/);
    },
  );
});
