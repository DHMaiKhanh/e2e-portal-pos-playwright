import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Menu người dùng & Đăng xuất — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-143 — user menu shows Logout item clearly labelled',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await dashboardPage.openUserMenu();

      const logoutItem = dashboardPage.logoutMenuItem;
      await expect(logoutItem).toBeVisible();
      await expect(logoutItem).toHaveAccessibleName(/log ?out|sign ?out/i);

      const menuItems = dashboardPage.page.getByRole('menuitem');
      const count = await menuItems.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const item = menuItems.nth(i);
        await expect(item).toBeVisible();
        const name = await item.textContent();
        expect(name?.trim().length ?? 0).toBeGreaterThan(0);
      }
    },
  );
});
