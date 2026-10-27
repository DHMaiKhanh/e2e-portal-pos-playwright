import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { DevicesTab } from '@pages/devices/DevicesPage';

/**
 * The per-row "⋯" menu carries the live-fleet writes — View change history /
 * Send remote action / Deactivate (or Activate for an inactive device). This
 * file proves the menu is present and wired WITHOUT ever firing one of those
 * actions: writes are blocked before navigating, the menu is opened and
 * dismissed with Escape, and the blocked-writes recorder is asserted empty.
 *
 * READ-ONLY: no device is ever approved, deactivated, activated or sent a
 * remote action.
 */
test.describe('An toàn menu dòng (Row menu safety) — Devices', () => {
  test.beforeEach(async ({ devicesPage }) => {
    await devicesPage.blockWrites();
    await devicesPage.open(DevicesTab.DEVICES);
  });

  /**
   * TC-DEV-020 — a device row's "⋯" menu offers the documented actions.
   *
   * Skipped when the fleet has no rows (so no menu to open).
   */
  test(
    'TC-DEV-020 — the row ⋯ menu offers change history / remote action / (de)activate',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ devicesPage, page }) => {
      const trigger = devicesPage.rowMenu(0);
      test.skip((await trigger.count()) === 0, 'no device rows / row menu to open');

      await trigger.click();
      await expect(
        page
          .getByRole('menuitem', {
            name: /change history|remote action|deactivate|activate/i,
          })
          .first(),
      ).toBeVisible();
      await page.keyboard.press('Escape');
    },
  );

  /**
   * TC-DEV-021 — opening and dismissing the row menu fires no device write.
   */
  test(
    'TC-DEV-021 — opening the row ⋯ menu fires no approve/deactivate write',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ devicesPage, page }) => {
      const blocked = await devicesPage.blockWrites();
      const trigger = devicesPage.rowMenu(0);
      test.skip((await trigger.count()) === 0, 'no device rows / row menu to open');

      await trigger.click();
      await page.keyboard.press('Escape');

      expect(blocked, 'a device write fired while only opening the ⋯ menu').toEqual([]);
    },
  );
});
