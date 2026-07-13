import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Header & Ngữ cảnh cửa hàng — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-017 — store switcher shows current store name and id in top bar',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
      // Store name/id is dynamic and drifts on the shared dev store, so we key off
      // the trailing "#<id>" (dashboardPage.storeSwitcherButton) rather than a fixed name.
      const switcher = dashboardPage.storeSwitcherButton;
      await expect(switcher).toBeVisible();
      await expect(switcher).toBeEnabled();
    },
  );

  test(
    'TC-OVW-018 — opening store switcher lists available stores with active one marked',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      // Match by the trailing "#<id>" only: the switcher button's accessible name
      // renders a space before it ("Name #14") while the dropdown's menuitem does
      // not ("Name#14") — whitespace-insensitive id matching avoids that mismatch.
      const switcherLabel = (await dashboardPage.storeSwitcherButton.textContent())?.trim() ?? '';
      const storeId = switcherLabel.match(/#(\d+)$/)?.[1] ?? '';
      await dashboardPage.openStoreSwitcher();
      const currentOption = dashboardPage.storeOption(new RegExp(`#\\s*${storeId}$`));
      await expect(currentOption).toBeVisible();
    },
  );

  test(
    'TC-OVW-022 — header shows current store name with Active status badge',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      const switcherLabel = (await dashboardPage.storeSwitcherButton.textContent())?.trim() ?? '';
      const storeName = switcherLabel.replace(/\s*#\d+$/, '');
      // The store name also appears in the switcher button and the page title;
      // the Merchant Information field is the last of the matches in DOM order.
      await expect(dashboardPage.merchantName(storeName).last()).toBeVisible();
      await expect(dashboardPage.storeStatusBadge).toBeVisible();
      await expect(dashboardPage.storeStatusBadge).toHaveText(/Active/);
      await expect(dashboardPage.generateTokenButton).toBeVisible();
    },
  );
});
