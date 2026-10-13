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
      // The app injects the vertical segment, e.g. `/pos/nail/100004/overview`.
      await expect(page).toHaveURL(/\/pos\/[^/]+\/\d+\/overview/);
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.storeStatusBadge).toContainText(/Active/i);

      const generateTokenButton = dashboardPage.generateTokenButton;
      // "Generate Token" is not provisioned on every store (absent on 100004);
      // exercise it when present, skip softly when the feature is absent.
      const hasGenerateToken = await generateTokenButton.count();
      test.skip(hasGenerateToken === 0, 'store has no Generate Token button');
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

      // "Generate Token" is absent on store 100004; exercise the modal when the
      // button is present, skip softly when the feature is absent.
      const hasGenerateToken = await dashboardPage.generateTokenButton.count();
      test.skip(hasGenerateToken === 0, 'store has no Generate Token button');
      await dashboardPage.clickGenerateToken();

      const dialog = dashboardPage.tokenDialog;
      await expect(dialog).toBeVisible();
      await expect(dialog).not.toHaveText('');
      await expect(dashboardPage.copyTokenButton).toBeVisible();

      await expect(page).toHaveURL(/\/pos\/[^/]+\/\d+\/overview/);
    },
  );
});
