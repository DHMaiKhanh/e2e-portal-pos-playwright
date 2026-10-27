import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { UsersRolesScope } from '@pages/users-roles/UsersRolesPage';

/**
 * Users & Roles (Internal RBAC) is an admin screen and is NOT store-scoped: the
 * route is `/pos/nail/admin/users`, so nothing here may hardcode or expect
 * `/pos/<id>/`.
 *
 * The screen has an Employees / Merchants split; under each is a Users list and
 * a Roles list, each tab carrying a count badge. This file covers only the
 * read-only Users-scope page load — rendering, the tab strip, reload and the
 * clean-console contract. Every spec blocks writes first, so an accidental
 * role-assign or user-lock never reaches the backend.
 */
test.describe('Tải trang & tabs (Page load / Tabs) — Users & Roles', () => {
  test.beforeEach(async ({ usersRolesPage }) => {
    await usersRolesPage.blockWrites();
    await usersRolesPage.open(UsersRolesScope.USERS);
  });

  /**
   * TC-USR-001 — direct navigation renders the Users list, no login redirect.
   */
  test(
    'TC-USR-001 — direct navigation renders the Users list, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ usersRolesPage, page }) => {
      await usersRolesPage.waitForReady();

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/users/);
      await expect(usersRolesPage.pageHeader.first()).toBeVisible();
    },
  );

  /**
   * TC-USR-002 — the RBAC scope tab strip renders (Employees / Merchants and/or
   * Users / Roles). Tolerant by label: the exact wording can shift, so this only
   * asserts the tab role exists and at least one known scope label is present.
   */
  test(
    'TC-USR-002 — the RBAC scope tab strip renders',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ usersRolesPage }) => {
      await usersRolesPage.waitForReady();

      expect(await usersRolesPage.tabs.count()).toBeGreaterThan(0);
      await expect(usersRolesPage.tabs.first()).toBeVisible();
      await expect(usersRolesPage.tab(/employees|merchants|users|roles/i).first()).toBeVisible();
    },
  );

  /**
   * TC-USR-003 — a tab exposes its count badge.
   *
   * Presence only: there is a known app bug where the Users tab badge reads 1
   * while the list shows 30, so the badge text is deliberately NOT asserted —
   * only that the badge renders. Skips if the Users sub-tab is absent.
   */
  test(
    'TC-USR-003 — a tab exposes its count badge',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ usersRolesPage }) => {
      await usersRolesPage.waitForReady();
      const usersTab = usersRolesPage.tab(/users/i);
      test.skip((await usersTab.count()) === 0, 'no Users sub-tab to read a badge from');

      await expect(usersRolesPage.tabBadge(/users/i)).toBeVisible();
    },
  );

  /**
   * TC-USR-004 — reload keeps the URL, the session and the page header.
   */
  test(
    'TC-USR-004 — reload keeps the URL, the session and the page header',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ usersRolesPage, page }) => {
      await usersRolesPage.waitForReady();
      const urlBefore = page.url();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await usersRolesPage.waitForReady();

      await expect(page).toHaveURL(urlBefore);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(usersRolesPage.pageHeader.first()).toBeVisible();
    },
  );

  /**
   * TC-USR-005 — page load produces no uncaught errors and no unexpected 4xx/5xx.
   * The cold session-refresh 401 is excluded, as on every other admin screen.
   */
  test(
    'TC-USR-005 — page load produces no uncaught errors and no unexpected 4xx/5xx',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ usersRolesPage, page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const badResponses: string[] = [];
      const isSessionRefresh = (url: string): boolean =>
        /\/sessions\/current|\/refresh_token/.test(url);

      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        if (/status of 401/.test(message.text())) return;
        consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('response', (response) => {
        if (response.status() < 400) return;
        if (response.status() === 401 && isSessionRefresh(response.url())) return;
        badResponses.push(`${response.status()} ${response.url()}`);
      });

      await page.goto(Urls.USERS, { waitUntil: 'domcontentloaded' });
      await usersRolesPage.waitForReady();

      expect(pageErrors, 'uncaught exceptions').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
      expect(badResponses, 'failed requests').toEqual([]);
    },
  );
});
