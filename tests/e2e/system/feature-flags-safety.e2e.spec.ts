import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { SystemSection } from '@pages/system/SystemPage';

/**
 * System › Feature Flags (`/pos/nail/admin/features`) — ~9 flags, each
 * Enabled/Disabled, with a Version (v1 / side_by_side) and a Scope (Global / By
 * merchant), fronted by a toggle switch.
 *
 * SAFETY: flipping a flag is a platform-wide write. Every test blocks writes
 * first and the switch is only ever asserted present — NEVER clicked.
 */
test.describe('Danh sách & an toàn (Feature Flags) — System', () => {
  test.beforeEach(async ({ systemPage }) => {
    await systemPage.blockWrites();
    await systemPage.open(SystemSection.FEATURES);
  });

  /**
   * TC-SYS-020 — direct navigation renders the feature-flag list, no login redirect.
   */
  test(
    'TC-SYS-020 — direct navigation renders the feature-flag list, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ systemPage, page }) => {
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/features/);
      await expect(systemPage.pageHeader.first()).toBeVisible();
      await expect(systemPage.table.rows.first()).toBeVisible();
    },
  );

  /**
   * TC-SYS-021 — the first flag row fronts its state control. The 2026-10 redesign
   * replaced the inline switch with an "Enabled/Disabled" status plus a row Actions
   * (⋯) menu that changes the flag. Presence only — nothing is toggled here.
   */
  test(
    'TC-SYS-021 — a feature-flag row exposes its state control (never toggled)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ systemPage }) => {
      const toggle = systemPage.featureToggle(0);
      expect(await toggle.count()).toBeGreaterThanOrEqual(1);
      await expect(toggle.first()).toBeVisible();
      // The flag is changed from the row's Actions (⋯) menu, not an inline switch.
      await expect(systemPage.rowMenu(0)).toBeVisible();
    },
  );

  /**
   * TC-SYS-022 — browsing the feature-flag list issues no mutating request (no
   * flag is toggled).
   */
  test(
    'TC-SYS-022 — browsing feature flags toggles nothing and issues no write',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ systemPage }) => {
      const blocked = await systemPage.blockWrites();
      await systemPage.open(SystemSection.FEATURES);

      expect(blocked, 'feature flags made a write while only browsing').toEqual([]);
    },
  );
});
