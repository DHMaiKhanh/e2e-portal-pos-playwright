import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Generate Token" area (lean core).
 *
 * The "Generate Token" action and its token modal happy path: the button is
 * present/enabled/focusable and clicking it opens the token modal without
 * navigating away. (Clipboard-content, regenerate-diff, and failure paths need
 * setup the reused session can't reproduce and are out of the lean core.)
 */
test.describe('Generate Token — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-127 — Generate Token button is visible, enabled, and keyboard-focusable',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.generateTokenButton).toBeVisible();
      await expect(dashboardPage.generateTokenButton).toBeEnabled();
      await dashboardPage.generateTokenButton.focus();
      await expect(dashboardPage.generateTokenButton).toBeFocused();
    },
  );

  test(
    'TC-OVW-128 — Generate Token opens a token modal without navigating away',
    { tag: [Tag.REGRESSION] },
    async ({ dashboardPage, page }) => {
      await dashboardPage.clickGenerateToken();
      await expect(dashboardPage.tokenDialog).toBeVisible();
      // A copy affordance implies a token value is present to copy.
      await expect(dashboardPage.copyTokenButton).toBeVisible();
      // The Overview behind the modal stays put.
      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
    },
  );
});
