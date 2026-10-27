import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Pagination } from '@components/Pagination';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { blockMutations } from '@helpers/writeGuard';

/**
 * `?tab=` values of the Devices sub-tabs. Renamed from `pending` / `history`
 * (docs 18-devices.md) — the old slugs now crash the page on zod validation.
 */
export const DevicesTab = {
  DEVICES: 'devices',
  PENDING: 'pending-registrations',
  HISTORY: 'device-history',
} as const;

export type DevicesTabValue = (typeof DevicesTab)[keyof typeof DevicesTab];

/**
 * Devices (Internal › Device Management) — `/pos/<seg>/admin/devices`.
 *
 * Three tabs: Devices (the fleet), Pending registrations (approve/deny), Device
 * history (assignment log). The Devices tab defaults to Status=Active /
 * Connection=Online and exposes filters Status / Version / Connection plus a
 * merchant/ID search. Each device row has a "⋯" menu (View change history /
 * Send remote action / Deactivate or Activate).
 *
 * SAFETY: approving a pending device, deactivating a device and sending a remote
 * action are all live-fleet writes. Call {@link blockWrites} before `goto()`.
 */
export class DevicesPage extends BasePage {
  protected readonly path = Urls.DEVICES;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly pagination: Pagination;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly versionFilter: Locator;
  readonly connectionFilter: Locator;
  readonly resultsFooter: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.pagination = new Pagination(page, page.getByRole('navigation', { name: 'Pagination' }));
    this.searchInput = page.getByPlaceholder(/search|merchant|device/i).first();
    this.statusFilter = page.getByRole('button', { name: /^filter by status/i });
    this.versionFilter = page.getByRole('button', { name: /filter by version|version/i }).first();
    this.connectionFilter = page
      .getByRole('button', { name: /filter by connection|connection/i })
      .first();
    this.resultsFooter = page.locator('[data-slot="pos-pagination-range"]');
  }

  async waitForReady(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.rowOrEmpty).toBeVisible({ timeout: 30_000 });
  }

  /** First data row of the active tab, or its empty state. */
  get rowOrEmpty(): Locator {
    return (
      this.table.rows
        .first()
        .or(this.emptyState.filter({ visible: true }))
        .or(this.page.locator('[data-slot="empty"]:visible'))
        // Inactive tab panels stay mounted with their own empty state; take one match.
        .first()
    );
  }

  async open(tab: DevicesTabValue): Promise<void> {
    await this.page.goto(`${this.path}?tab=${tab}`, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  get pageTitle(): Locator {
    return this.page.getByRole('heading', { level: 1, name: /devices/i });
  }

  get pageHeader(): Locator {
    return this.page.locator('[data-slot="pos-page-header"]');
  }

  get emptyState(): Locator {
    return this.page.locator('[data-slot="pos-data-table-empty"]');
  }

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  get tabs(): Locator {
    return this.page.getByRole('tab');
  }

  tab(name: string | RegExp): Locator {
    return this.page.getByRole('tab', { name });
  }

  /** The "No pending registrations." empty text on the Pending tab. */
  get pendingEmpty(): Locator {
    return this.page.getByText(/no pending registrations/i);
  }

  /** Row-level "⋯" menu trigger (defaults to first row). */
  rowMenu(rowIndex = 0): Locator {
    return this.table.rows.nth(rowIndex).getByRole('button', { name: /actions|more|open menu/i });
  }

  async totalResults(): Promise<number> {
    const text =
      (await this.resultsFooter
        .first()
        .textContent()
        .catch(() => '')) ?? '';
    return Number(text.match(/of ([\d,]+)/i)?.[1]?.replace(/,/g, '') ?? NaN);
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(1_500);
  }

  /** Abort device approve/deactivate/remote-action writes. Call BEFORE navigating. */
  async blockWrites(): Promise<string[]> {
    return blockMutations(this.page, (url) =>
      /\/(devices|device|remote[-_]?actions?|registrations?)(\/|\?|$)/i.test(
        url.pathname + url.search,
      ),
    );
  }
}
