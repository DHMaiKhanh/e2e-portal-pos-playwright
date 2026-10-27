import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { blockMutations } from '@helpers/writeGuard';

/** The two RBAC scopes, each a top tab with its own Users / Roles sub-tab. */
export const UsersRolesScope = {
  USERS: Urls.USERS,
  ROLES: Urls.ROLES,
} as const;

export type UsersRolesScopeValue = (typeof UsersRolesScope)[keyof typeof UsersRolesScope];

/**
 * Users & Roles (Internal RBAC) — `/pos/<seg>/admin/users` and `/roles`.
 *
 * The screen has an Employees / Merchants split; under each, a Users list and a
 * Roles list, with a count badge per tab. A user row opens a detail with Role /
 * Super user / Permission overrides; a role row opens its permission matrix.
 * "Add employee role" opens a form (Name / Description / Active + a 0/67
 * permission matrix) whose empty submit is blocked by native validation.
 *
 * SAFETY: creating/editing a role, assigning a role or locking a user changes
 * who can sign in. Call {@link blockWrites} before `open()`.
 */
export class UsersRolesPage extends BasePage {
  protected readonly path = Urls.USERS;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.searchInput = page.getByPlaceholder(/search/i).first();
  }

  async waitForReady(): Promise<void> {
    await expect(this.pageHeader.first()).toBeVisible();
    await expect(
      this.table.rows
        .first()
        .or(this.page.locator('[data-slot="pos-data-table-empty"]'))
        .or(this.page.locator('[data-slot="empty"]:visible')),
    ).toBeVisible({ timeout: 30_000 });
  }

  async open(scope: UsersRolesScopeValue): Promise<void> {
    await this.page.goto(scope, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  get pageHeader(): Locator {
    return this.page.locator('[data-slot="pos-page-header"]');
  }

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  // The 2026-10 design-system refactor replaced the ARIA `role="tab"` strip with
  // link-based triggers (`<a data-slot="pos-tabs-trigger">`): Users / Roles at the
  // top and Employees / Merchants below, each carrying its count badge.
  get tabs(): Locator {
    return this.page.locator('[data-slot="pos-tabs-trigger"]');
  }

  tab(name: string | RegExp): Locator {
    return this.page.locator('[data-slot="pos-tabs-trigger"]').filter({ hasText: name });
  }

  /** The count badge inside a tab, e.g. the "Users" / "Roles" number. */
  tabBadge(name: string | RegExp): Locator {
    return this.tab(name).locator('[data-slot="pos-badge"], .badge, span').last();
  }

  get addRoleButton(): Locator {
    return this.page.getByRole('button', { name: /add (employee )?role/i });
  }

  /** Open a user/role detail by row position. */
  async openRow(index = 0): Promise<void> {
    await this.table.rows.nth(index).click();
  }

  /** Abort any user/role create/update/assign/lock write. Call BEFORE `open()`. */
  async blockWrites(): Promise<string[]> {
    return blockMutations(this.page, (url) =>
      /\/(users?|roles?|permissions?|sys_user|sys_role)(\/|\?|$)/i.test(url.pathname + url.search),
    );
  }
}
