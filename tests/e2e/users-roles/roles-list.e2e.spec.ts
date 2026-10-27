import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { UsersRolesScope } from '@pages/users-roles/UsersRolesPage';

/**
 * The Roles scope of Users & Roles (`/pos/nail/admin/roles`): a roles table with
 * an "Add (employee) role" action. Creating a role changes who can sign in, so
 * every spec blocks writes first and the create form is never clicked through —
 * presence of the action is asserted, nothing more.
 */
test.describe('Danh sách Roles (Roles list) — Users & Roles', () => {
  test.beforeEach(async ({ usersRolesPage }) => {
    await usersRolesPage.blockWrites();
    await usersRolesPage.open(UsersRolesScope.ROLES);
  });

  /**
   * TC-USR-010 — the Roles scope renders a roles table, no login redirect.
   */
  test(
    'TC-USR-010 — Roles scope renders a roles table at /roles',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ usersRolesPage, page }) => {
      await usersRolesPage.waitForReady();

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/roles/);
      await expect(usersRolesPage.pageHeader.first()).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  /**
   * TC-USR-011 — the "Add role" action is present and enabled. Opening it is a
   * create flow, so this only asserts presence — it is never clicked through.
   * Skips if the action is absent on this scope.
   */
  test(
    'TC-USR-011 — toolbar exposes an enabled Add role action',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ usersRolesPage }) => {
      await usersRolesPage.waitForReady();
      const addRole = usersRolesPage.addRoleButton;
      test.skip((await addRole.count()) === 0, 'no Add role action on this roles scope');

      await expect(addRole.first()).toBeVisible();
      await expect(addRole.first()).toBeEnabled();
    },
  );

  /**
   * TC-USR-012 — the roles table shows rows or an explicit empty state.
   */
  test(
    'TC-USR-012 — roles table shows rows or an empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ usersRolesPage, page }) => {
      await usersRolesPage.waitForReady();
      const rowCount = await usersRolesPage.table.rows.count();

      if (rowCount === 0) {
        await expect(
          page.locator('[data-slot="pos-data-table-empty"], [data-slot="empty"]').first(),
        ).toBeVisible();
      } else {
        await expect(usersRolesPage.table.rows.first()).toBeVisible();
      }
    },
  );

  /**
   * TC-USR-013 — browsing the roles list issues no mutating request.
   */
  test(
    'TC-USR-013 — browsing the roles list issues no mutating request',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ usersRolesPage }) => {
      const blocked = await usersRolesPage.blockWrites();
      await usersRolesPage.open(UsersRolesScope.ROLES);
      await usersRolesPage.waitForReady();

      expect(blocked, 'roles list made a write while only browsing').toEqual([]);
    },
  );
});
