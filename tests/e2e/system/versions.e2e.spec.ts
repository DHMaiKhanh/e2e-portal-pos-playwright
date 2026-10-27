import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { SystemSection, VersionPlatform } from '@pages/system/SystemPage';

/**
 * System › App Versions (`/pos/nail/admin/versions`) — the cross-platform build
 * catalogue. Windows carries ~46 releases (1.1.x — Version / Status / Published
 * at, Published / Deprecated); Android lists builds (0.1.x-bxxx) that sit at
 * "Waiting for KPP" until an Upload KPP action promotes them. A "Fetch versions"
 * toolbar action and a per-row "⋯" menu (Pause / Download / View change history /
 * Deprecate) round out the screen.
 *
 * SAFETY: publishing, pausing and deprecating a build are all platform-wide
 * writes, so every test blocks writes first (beforeEach) and only asserts
 * presence — a menu is opened and dismissed, never confirmed.
 */
test.describe('Tải trang & an toàn (App Versions) — System', () => {
  test.beforeEach(async ({ systemPage }) => {
    await systemPage.blockWrites();
    await systemPage.open(SystemSection.VERSIONS);
  });

  /**
   * TC-SYS-001 — direct navigation renders the versions list, no login redirect.
   */
  test(
    'TC-SYS-001 — direct navigation renders the App Versions list, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ systemPage, page }) => {
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/versions/);
      await expect(systemPage.pageHeader.first()).toBeVisible();
      await expect(systemPage.table.rows.first()).toBeVisible();
    },
  );

  /**
   * TC-SYS-002 — the Windows and Android platform tabs are both present.
   */
  test(
    'TC-SYS-002 — Windows and Android platform tabs are visible',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ systemPage }) => {
      await expect(systemPage.tab(/windows/i)).toBeVisible();
      await expect(systemPage.tab(/android/i)).toBeVisible();
      expect(await systemPage.tabs.count()).toBeGreaterThanOrEqual(2);
    },
  );

  /**
   * TC-SYS-003 — the Android tab lists builds and, when one is waiting for KPP,
   * exposes the Upload KPP action (asserted present only — never clicked).
   */
  test(
    'TC-SYS-003 — Android tab shows builds with an Upload KPP action when one is waiting',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ systemPage }) => {
      await systemPage.open(SystemSection.VERSIONS, VersionPlatform.ANDROID);
      await expect(systemPage.table.rows.first()).toBeVisible();

      const uploadKpp = systemPage.uploadKppButton;
      test.skip((await uploadKpp.count()) === 0, 'no Android build is waiting for KPP');
      await expect(uploadKpp.first()).toBeVisible();
    },
  );

  /**
   * TC-SYS-004 — the "Fetch versions" toolbar action is present.
   */
  test(
    'TC-SYS-004 — the Fetch versions action is visible',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ systemPage }) => {
      await expect(systemPage.fetchVersionsButton.first()).toBeVisible();
    },
  );

  /**
   * TC-SYS-005 — a row's "⋯" menu exposes Pause / Download / View change history /
   * Deprecate, and opening then dismissing it fires no write.
   */
  test(
    'TC-SYS-005 — row actions menu offers Pause / Download / change history / Deprecate, no write',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ systemPage, page }) => {
      const blocked = await systemPage.blockWrites();
      const trigger = systemPage.rowMenu(0);
      test.skip((await trigger.count()) === 0, 'rows expose no actions menu');

      await trigger.first().click();
      await expect(
        page.getByRole('menuitem', { name: /pause|download|change history|deprecate/i }).first(),
      ).toBeVisible();
      await page.keyboard.press('Escape');

      expect(blocked, 'a write escaped while only opening the menu').toEqual([]);
    },
  );

  /**
   * TC-SYS-006 — browsing the versions screen issues no mutating request (nothing
   * published, paused or deprecated).
   */
  test(
    'TC-SYS-006 — browsing App Versions issues no mutating request',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ systemPage }) => {
      const blocked = await systemPage.blockWrites();
      await systemPage.open(SystemSection.VERSIONS, VersionPlatform.ANDROID);
      await systemPage.open(SystemSection.VERSIONS);

      expect(blocked, 'App Versions made a write while only browsing').toEqual([]);
    },
  );
});
