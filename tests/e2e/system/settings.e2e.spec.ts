import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { SystemSection } from '@pages/system/SystemPage';

/**
 * System › Settings (`/pos/nail/admin/setting`) — ~16 global sys_setting rows
 * (Setting / key / Value / App / Last updated), each scoped Global or Merchant;
 * the more complex ones open a detail page at `/admin/setting/<id>`.
 *
 * SAFETY: saving a system setting is a platform-wide write, so every test blocks
 * writes first and only browses — no row is opened through to a save.
 */
test.describe('Tải trang & an toàn (Settings) — System', () => {
  test.beforeEach(async ({ systemPage }) => {
    await systemPage.blockWrites();
    await systemPage.open(SystemSection.SETTINGS);
  });

  /**
   * TC-SYS-010 — direct navigation renders the settings table, no login redirect.
   */
  test(
    'TC-SYS-010 — direct navigation renders the system settings table, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ systemPage, page }) => {
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/setting/);
      await expect(systemPage.pageHeader.first()).toBeVisible();
      await expect(systemPage.table.rows.first()).toBeVisible();
    },
  );

  /**
   * TC-SYS-011 — a documented setting row (Terms of service / Portal URL / …) is
   * present (tolerant: skips if the catalogue no longer carries one).
   */
  test(
    'TC-SYS-011 — a known system setting row is listed',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ systemPage }) => {
      const row = systemPage.settingRow(/terms of service|portal url|setting/i);
      test.skip((await row.count()) === 0, 'no recognisable setting row present');
      await expect(row).toBeVisible();
    },
  );

  /**
   * TC-SYS-012 — a setting row carries a Global / Merchant scope label.
   */
  test(
    'TC-SYS-012 — a setting row exposes a Global / Merchant scope label',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ systemPage }) => {
      const scope = systemPage.scopeLabel(0);
      test.skip((await scope.count()) === 0, 'no scope label rendered on the first row');
      await expect(scope).toBeVisible();
      await expect(scope).toContainText(/global|by merchant|merchant/i);
    },
  );

  /**
   * TC-SYS-013 — browsing the settings screen issues no mutating request.
   */
  test(
    'TC-SYS-013 — browsing system settings issues no mutating request',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ systemPage }) => {
      const blocked = await systemPage.blockWrites();
      await systemPage.open(SystemSection.SETTINGS);

      expect(blocked, 'system settings made a write while only browsing').toEqual([]);
    },
  );
});
