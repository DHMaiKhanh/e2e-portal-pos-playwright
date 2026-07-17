import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tạo Token (Generate Token) — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-127 — Generate Token button visible, enabled, focusable',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.storeStatusBadge).toContainText(/Active/i);

      const generateTokenButton = dashboardPage.generateTokenButton;
      await expect(generateTokenButton).toBeVisible();
      await expect(generateTokenButton).toBeEnabled();

      await generateTokenButton.focus();
      await expect(generateTokenButton).toBeFocused();
    },
  );

  test(
    'TC-OVW-128 — Generate token opens modal with created token',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await dashboardPage.clickGenerateToken();

      const dialog = dashboardPage.tokenDialog;
      await expect(dialog).toBeVisible();
      await expect(dialog).not.toHaveText('');
      await expect(dashboardPage.copyTokenButton).toBeVisible();

      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
    },
  );
});
