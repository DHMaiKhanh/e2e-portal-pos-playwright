import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Pagination } from '@components/Pagination';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';

/**
 * Column order of the merchant table, as rendered (verified 2026-08-18).
 * Used with `getByRole('cell').nth(...)` so cases can read one column.
 */
export const MerchantColumn = {
  WHMCS_ID: 0,
  MERCHANT: 1,
  PACKAGE: 2,
  STATUS: 3,
  OWNER_EMAIL: 4,
  OWNER_PHONE: 5,
  TIMEZONE: 6,
  JOINED_AT: 7,
} as const;

/** The exact header labels, in order — asserted by the table cases. */
export const MERCHANT_COLUMNS = [
  '#',
  'Merchant',
  'Package',
  'Status',
  'Owner email',
  'Owner phone',
  'Timezone',
  'Joined at',
] as const;

/** The three options the status filter offers (verified 2026-08-18). */
export const MERCHANT_STATUS_OPTIONS = ['All statuses', 'Active', 'Inactive'] as const;

/**
 * Merchants (Quản lý Merchant — Internal) list screen.
 *
 * An admin route, NOT store-scoped: it lists every merchant in the system. The
 * app injects the vertical segment and the route lives under `/admin/`, so the
 * path is `/pos/nail/admin/merchant` (singular) with no `/pos/<id>/` store
 * segment. The bare route is served unqueried — it no longer self-normalises to
 * `?tab=overview` (behaviour changed since 2026-08-18; an explicit
 * `?tab=overview` is preserved, and an unknown tab value is stripped back to the
 * bare route).
 *
 * Selecting a row does not navigate to a separate page — it swaps the table for
 * an in-place merchant detail view and records the choice as a `merchantId`
 * query param (see `MerchantDetailView`).
 */
export class MerchantsPage extends BasePage {
  protected readonly path = Urls.MERCHANTS;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly pagination: Pagination;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly resultsFooter: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
    // Since the 2026-10-13 design-system refactor (VP-4569) pagination is a
    // `<nav aria-label="Pagination">` with "Previous page"/"Next page" icon buttons.
    this.pagination = new Pagination(page, page.getByRole('navigation', { name: 'Pagination' }));
    this.searchInput = page.getByPlaceholder('Search merchants...');
    // Since VP-4569 the status filter is a "filter chip" <button
    // aria-haspopup="dialog">: aria-label "Filter by status" when unset, and
    // "Filter by status: <Value>" once a status is picked. It opens a popover
    // with a cmdk listbox ("All statuses" / "Active" / "Inactive").
    this.statusFilter = page.getByRole('button', { name: /^filter by status/i });
    // Range label inside the pagination nav, e.g. "1–16 of 16".
    this.resultsFooter = page.locator('[data-slot="pos-pagination-range"]');
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    // Rows or the empty placeholder — whichever the current filter produces.
    await expect(this.table.rows.first().or(this.emptyState)).toBeVisible();
    // VP-4569: the pagination nav (and its range label) is only rendered when
    // there is at least one row; the empty state has no footer.
    if (await this.table.rows.first().isVisible()) {
      await expect(this.resultsFooter).toBeVisible();
    }
  }

  /** The page title — an `<h1>` since VP-4569 (verified 2026-10-20). */
  get pageTitle(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Merchants' });
  }

  get pageHeader(): Locator {
    return this.page.locator('[data-slot="pos-page-header"]');
  }

  /** Placeholder row shown when nothing matches — text "No merchants found." */
  get emptyState(): Locator {
    // VP-4569: the visible "No merchants found." block is rendered OUTSIDE the
    // <table> (`pos-data-table-empty`); the in-table `[data-slot="empty"]` row
    // is a zero-size placeholder and is never visible.
    return this.page.locator('[data-slot="pos-data-table-empty"]');
  }

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  columnHeader(name: string | RegExp): Locator {
    return this.page.getByRole('table').getByRole('columnheader', { name });
  }

  /** Pagination position, e.g. "1 / 1". */
  get pageIndicator(): Locator {
    return this.page.locator('[data-slot="pos-pagination-page"]');
  }

  /** Status badge in a given row (defaults to the first). */
  statusBadge(rowIndex = 0): Locator {
    return this.table.rows
      .nth(rowIndex)
      .getByRole('cell')
      .nth(MerchantColumn.STATUS)
      .locator('[data-slot="pos-status-pill"]');
  }

  /**
   * Type into the search box and let the debounce settle.
   *
   * The screen debounces: typing 8 characters fires a single
   * `GET /merchant_settings?search=…` (verified 2026-08-18), so a fixed wait
   * past the debounce window is what "results have updated" means here.
   */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(1_500);
  }

  async clearSearch(): Promise<void> {
    await this.search('');
  }

  /** Open the status listbox and pick an option by its visible label. */
  async selectStatus(option: string | RegExp): Promise<void> {
    await this.statusFilter.click();
    // Exact match by default — "Active" would otherwise also hit "Inactive".
    const name = typeof option === 'string' ? new RegExp(`^${option}$`, 'i') : option;
    await this.page.getByRole('option', { name }).first().click();
    await this.page.waitForTimeout(1_500);
  }

  async openStatusFilter(): Promise<void> {
    await this.statusFilter.click();
    await expect(this.page.getByRole('option').first()).toBeVisible();
  }

  get statusOptions(): Locator {
    return this.page.getByRole('option');
  }

  /**
   * The selected status shown on the filter chip, read from the DOM.
   *
   * Since VP-4569 an unset chip shows only its name ("Status") and no value;
   * that state is reported as "All statuses" (the option that clears it).
   * Read through `data-slot` (not role) so it also works while the popover is
   * open and the rest of the page is aria-hidden.
   */
  async statusFilterValue(): Promise<string> {
    const value = this.page
      .locator('[data-slot="pos-filter-chip"][aria-label^="Filter by status"]')
      .first()
      .locator('[data-slot="pos-filter-text"]');
    if ((await value.count()) === 0) return 'All statuses';
    return ((await value.first().textContent()) ?? '').trim();
  }

  /**
   * Every visible value of one column, top to bottom.
   *
   * Uses CSS `nth-child`, which is evaluated per matched row — a chained
   * `nth=` would instead index the flattened set of every cell in the table.
   */
  async columnValues(column: number): Promise<string[]> {
    const cells = this.table.rows.locator(`td:nth-child(${column + 1})`);
    return (await cells.allTextContents()).map((t) => t.trim());
  }

  /**
   * Read a column by walking rows, so ragged rows cannot silently shift values.
   * Slower than `columnValues` but exact about which row a value came from.
   */
  async columnValuesByRow(column: number): Promise<string[]> {
    const rows = await this.table.rows.all();
    const values: string[] = [];
    for (const row of rows) {
      values.push(((await row.getByRole('cell').nth(column).textContent()) ?? '').trim());
    }
    return values;
  }

  /** Open a merchant's detail view by row position. */
  async openMerchantRow(index = 0): Promise<MerchantDetailView> {
    await this.table.rows.nth(index).click();
    const detail = new MerchantDetailView(this.page);
    await detail.waitForReady();
    return detail;
  }

  /** Total result count parsed out of the range label "X–Y of Z". */
  async totalResults(): Promise<number> {
    const text = (await this.resultsFooter.first().textContent()) ?? '';
    return Number(text.match(/of (\d+)/i)?.[1] ?? NaN);
  }

  /** Navigate with explicit query params, e.g. `{ q: 'Bleu', status: 'active' }`. */
  async gotoWithQuery(query: Record<string, string>): Promise<void> {
    const search = new URLSearchParams(query).toString();
    await this.page.goto(`${this.path}?${search}`, { waitUntil: 'domcontentloaded' });
  }
}

/**
 * The merchant detail view the list swaps in when a row is clicked.
 *
 * Not a modal and not a separate route: the URL keeps `/pos/merchants` and gains
 * `merchantId="<whmcsId>"` (JSON-quoted by the app), the table unmounts, and a
 * per-merchant dashboard renders with its own tab strip. Browser Back returns
 * to the list.
 *
 * Selecting a merchant is state the Portal remembers, so specs that open this
 * view should run on `isolatedPage` rather than the worker-shared context.
 */
export class MerchantDetailView {
  constructor(private readonly page: Page) {}

  async waitForReady(): Promise<void> {
    await expect(this.generateTokenButton).toBeVisible();
  }

  /** Renamed from "Generate token" to "Sign-in token" by VP-4569. */
  get generateTokenButton(): Locator {
    return this.page.getByRole('button', { name: /sign-in token/i });
  }

  /** Tab strip: Overview, Staff, Services, Orders, Devices, Payroll, Income, … */
  get tabs(): Locator {
    return this.page.getByRole('tab');
  }

  tab(name: string | RegExp): Locator {
    return this.page.getByRole('tab', { name });
  }

  /** The `#<whmcsId>` label shown beside the merchant name. */
  whmcsIdLabel(whmcsId: string): Locator {
    return this.page.getByText(`#${whmcsId}`).first();
  }
}
