import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { UsersRolesScope } from '@pages/users-roles/UsersRolesPage';

/**
 * Opening a user row reveals a detail with Role / Super user / Permission
 * overrides. Assigning a role or locking a user changes who can sign in, so
 * every spec blocks writes first; the detail is only opened and read, never
 * acted on. Tolerant: skips when the list has no rows.
 */
test.describe('Chi tiết người dùng & an toàn (User detail / Safety) — Users & Roles', () => {
  test.beforeEach(async ({ usersRolesPage }) => {
    await usersRolesPage.blockWrites();
    await usersRolesPage.open(UsersRolesScope.USERS);
  });

  /**
   * TC-USR-020 — opening a user row reveals its role / permission detail.
   */
  test(
    'TC-USR-020 — opening a user row reveals its role / permission detail',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ usersRolesPage, page }) => {
      await usersRolesPage.waitForReady();
      const rowCount = await usersRolesPage.table.rows.count();
      test.skip(rowCount === 0, 'no users to open');

      await usersRolesPage.openRow(0);

      await expect(page.getByText(/role|permission|super user/i).first()).toBeVisible();
    },
  );

  /**
   * TC-USR-021 — opening and reading a user detail assigns no role and locks no
   * user (the blocked-writes recorder stays empty).
   */
  test(
    'TC-USR-021 — viewing a user detail issues no mutating request',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ usersRolesPage }) => {
      const blocked = await usersRolesPage.blockWrites();
      await usersRolesPage.open(UsersRolesScope.USERS);
      await usersRolesPage.waitForReady();
      const rowCount = await usersRolesPage.table.rows.count();
      test.skip(rowCount === 0, 'no users to open');

      await usersRolesPage.openRow(0);

      expect(blocked, 'viewing a user detail attempted a write').toEqual([]);
    },
  );
});
