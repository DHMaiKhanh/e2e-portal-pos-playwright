import { type Locator, type Page, type Response, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Urls } from '@constants/urls';
import { env } from '@configs/env/loadEnv';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Customers › "Customer groups" tab (`/customers?tab=groups`).
 *
 * Scanned on DEV 2026-10-29 (store #14):
 *  - header button "Create group" opens dialog "Create customer group" (Group name, Description,
 *    Cancel / Create group); a row's "Actions for <name>" menu has View customers / Edit / Delete….
 *    Edit opens "Edit customer group" (Save changes); Delete… opens alertdialog "Delete customer
 *    group" (Delete group).
 *  - a blank name shows `alert "Group name is required"` under the field.
 *  - data lives on the volt-pos host: `GET /customer_groups?page=1&name[]=<q>&status[]=active&…`,
 *    `POST /customer_groups {name, status:"active"}`, `PUT /customer_groups/<id> {name, status}`.
 *    Delete is a soft delete: `PUT … {status:"deleted"}`.
 */
export class CustomerGroupsPage extends BasePage {
  protected readonly path = `${Urls.CUSTOMERS}?tab=groups`;

  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly activePanel: Locator;
  readonly rows: Locator;
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly nameError: Locator;

  constructor(page: Page) {
    super(page);
    // The dialog's submit is also named "Create group", so the header one is scoped to the banner.
    this.createButton = page.getByRole('banner').getByRole('button', { name: 'Create group' });
    this.searchInput = page.getByRole('textbox', { name: 'Search by group name...' });
    // Both tab panels stay mounted (see CustomersPage), so the table is read from the active one.
    this.activePanel = page.locator('[role="tabpanel"][data-state="active"]');
    this.rows = this.activePanel.locator('tbody tr');
    this.dialog = page.getByRole('dialog');
    this.nameInput = this.dialog.getByRole('textbox', { name: 'Group name' });
    this.descriptionInput = this.dialog.getByRole('textbox', { name: 'Description' });
    this.nameError = this.dialog.getByRole('alert');
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible({ timeout: Timeouts.NAVIGATION });
    await expect(this.rows.first()).toBeVisible({ timeout: Timeouts.NAVIGATION });
  }

  /** Searches by name and waits for the list request of THIS term to land. */
  async search(term: string): Promise<void> {
    const settled = this.page.waitForResponse(
      (r) => isGroupList(r) && new URL(r.url()).searchParams.get('name[]') === term,
      { timeout: Timeouts.MEDIUM },
    );
    await this.searchInput.fill(term);
    await settled;
    await expect(this.rows.first()).toBeVisible();
  }

  /** Rows whose Group name cell is exactly `name` (case-sensitive). */
  rowsNamed(name: string): Locator {
    return this.rows.filter({
      has: this.page.locator('td:first-child').getByText(name, { exact: true }),
    });
  }

  /** Opens the create dialog, types `name` and submits. Returns the POST, or null if none fired. */
  async submitCreate(name: string, waitMs = 5_000): Promise<Response | null> {
    await this.createButton.click();
    await expect(this.dialog).toBeVisible();
    await this.nameInput.fill(name);
    return this.submitDialog('Create group', 'POST', waitMs);
  }

  /** Opens Edit on `row`, types `name` and saves. Returns the PUT, or null if none fired. */
  async submitEdit(row: Locator, name: string, waitMs = 5_000): Promise<Response | null> {
    await row.getByRole('button', { name: /^Actions for/ }).click();
    await this.page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(this.dialog).toBeVisible();
    await this.nameInput.fill(name);
    return this.submitDialog('Save changes', 'PUT', waitMs);
  }

  private async submitDialog(
    button: string,
    method: 'POST' | 'PUT',
    waitMs: number,
  ): Promise<Response | null> {
    const write = this.page
      .waitForResponse((r) => isGroupWrite(r, method), { timeout: waitMs })
      .catch(() => null);
    await this.dialog.getByRole('button', { name: button }).click();
    return write;
  }
}

// ------------------------------------------------------------------ API

/** A customer group as `/customer_groups` returns it. */
export interface CustomerGroup {
  id: string;
  name: string;
  status: 'active' | 'deleted' | string;
  description?: string | null;
  totalMember?: number;
  createdAt: string;
  updatedAt: string;
}

/** Data host of the Portal, e.g. `https://volt-pos.v2.dev-fastboypay.com`. */
export const dataApiUrl = `https://volt-pos.${new URL(env.BASE_URL).host}`;

const GROUPS_PATH = /\/customer_groups(\/[0-9a-f-]+)?$/i;

export function isGroupList(r: Response): boolean {
  const url = new URL(r.url());
  return (
    url.host.startsWith('volt-pos.') &&
    url.pathname === '/customer_groups' &&
    r.request().method() === 'GET'
  );
}

export function isGroupWrite(r: Response, method: 'POST' | 'PUT'): boolean {
  const url = new URL(r.url());
  return (
    url.host.startsWith('volt-pos.') &&
    GROUPS_PATH.test(url.pathname) &&
    r.request().method() === method
  );
}

/**
 * The `/customer_groups` calls the Portal makes, through the page's own cookies.
 * Load any Portal page first: the SPA is what keeps the access-token cookie fresh.
 */
export class CustomerGroupApi {
  constructor(private readonly page: Page) {}

  private headers(): Record<string, string> {
    return {
      'x-merch-id': env.STORE_ID,
      Accept: 'application/ld+json',
      'Content-Type': 'application/ld+json',
    };
  }

  async create(name: string): Promise<CustomerGroup> {
    const res = await this.page.request.post(`${dataApiUrl}/customer_groups`, {
      headers: this.headers(),
      data: { name, status: 'active' },
      failOnStatusCode: false,
    });
    expect(res.ok(), `POST /customer_groups "${name}" → ${res.status()}`).toBeTruthy();
    return (await res.json()) as CustomerGroup;
  }

  async get(id: string): Promise<CustomerGroup> {
    const res = await this.page.request.get(`${dataApiUrl}/customer_groups/${id}`, {
      headers: this.headers(),
      failOnStatusCode: false,
    });
    expect(res.ok(), `GET /customer_groups/${id} → ${res.status()}`).toBeTruthy();
    return (await res.json()) as CustomerGroup;
  }

  /** Active groups whose name is exactly `name`. */
  async activeNamed(name: string): Promise<CustomerGroup[]> {
    const qs = new URLSearchParams({ page: '1', 'name[]': name, 'status[]': 'active' });
    const res = await this.page.request.get(`${dataApiUrl}/customer_groups?${qs}`, {
      headers: this.headers(),
      failOnStatusCode: false,
    });
    expect(res.ok(), `GET /customer_groups?name=${name} → ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as { member: CustomerGroup[] };
    return body.member.filter((g) => g.name === name);
  }

  async rename(group: CustomerGroup, name: string): Promise<void> {
    const res = await this.page.request.put(`${dataApiUrl}/customer_groups/${group.id}`, {
      headers: this.headers(),
      data: { name, status: group.status },
      failOnStatusCode: false,
    });
    expect(res.ok(), `PUT /customer_groups/${group.id} → ${res.status()}`).toBeTruthy();
  }

  /** What the Portal's "Delete group" does: a soft delete. */
  async remove(id: string): Promise<void> {
    const group = await this.get(id);
    if (group.status === 'deleted') return;
    const res = await this.page.request.put(`${dataApiUrl}/customer_groups/${id}`, {
      headers: this.headers(),
      data: { name: group.name, status: 'deleted' },
      failOnStatusCode: false,
    });
    expect(res.ok(), `delete PUT /customer_groups/${id} → ${res.status()}`).toBeTruthy();
  }
}
