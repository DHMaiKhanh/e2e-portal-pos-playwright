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
      const switcher = dashboardPage.storeSwitcherLabelled('Volt POS 14 Dev - Update #14');
      await expect(switcher).toBeVisible();
      await expect(switcher).toBeEnabled();
    },
  );

  test(
    'TC-OVW-018 — opening store switcher lists available stores with active one marked',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await dashboardPage.openStoreSwitcher();
      const currentOption = dashboardPage.storeOption('Volt POS 14 Dev - Update #14');
      await expect(currentOption).toBeVisible();
    },
  );

  test(
    'TC-OVW-022 — header shows current store name with Active status badge',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.merchantName(/Volt POS 14 Dev - Update/)).toBeVisible();
      await expect(dashboardPage.storeStatusBadge).toBeVisible();
      await expect(dashboardPage.storeStatusBadge).toHaveText(/Active/);
      await expect(dashboardPage.generateTokenButton).toBeVisible();
    },
  );
});
