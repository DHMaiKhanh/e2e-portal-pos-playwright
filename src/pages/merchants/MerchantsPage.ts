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
  'MERCHANT',
  'PACKAGE',
  'STATUS',
  'OWNER EMAIL',
  'OWNER PHONE',
  'TIMEZONE',
  'JOINED AT',
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
    this.pagination = new Pagination(page);
    this.searchInput = page.getByPlaceholder('Search merchants by name or WHMCS ID...');
    // The trigger is a <button role="combobox"> whose only accessible name is
    // its aria-label; its text content is the selected value ("All statuses").
    // While the listbox is open Radix marks the page aria-hidden, so this
    // locator cannot be resolved by role until the popup closes — read state
    // from `statusFilterValue` in that window instead.
    this.statusFilter = page.getByRole('combobox', { name: /filter by status/i });
    this.resultsFooter = page.getByText(/showing \d+ to \d+ of \d+ results/i);
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    await expect(this.resultsFooter).toBeVisible();
    // Rows or the empty placeholder — whichever the current filter produces.
    await expect(this.table.rows.first().or(this.emptyState)).toBeVisible();
  }

  /** The page header. Rendered as a `data-slot="page-title"` div, not a heading.
   *  Renamed from "Merchant Management" to "Merchants" (verified 2026-10-10). */
  get pageTitle(): Locator {
    return this.page.locator('[data-slot="page-title"]').filter({ hasText: 'Merchants' });
  }

  get pageHeader(): Locator {
    return this.page.locator('[data-slot="page-header"]');
  }

  /** Placeholder row shown when nothing matches — text "No merchants found." */
  get emptyState(): Locator {
    return this.page.locator('[data-slot="empty"]');
  }

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  columnHeader(name: string | RegExp): Locator {
    return this.page.getByRole('table').getByRole('columnheader', { name });
  }

  /** Pagination position, e.g. "1 / 1". */
  get pageIndicator(): Locator {
    return this.page.getByText(/^\d+\s*\/\s*\d+$/);
  }

  /** Status badge in a given row (defaults to the first). */
  statusBadge(rowIndex = 0): Locator {
    return this.table.rows
      .nth(rowIndex)
      .getByRole('cell')
      .nth(MerchantColumn.STATUS)
      .locator('span');
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
    await this.page.getByRole('option', { name: option }).first().click();
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
   * The selected value shown on the trigger, read from the DOM.
   *
   * `statusFilter.textContent()` is unavailable while the listbox is open
   * (the trigger sits inside an aria-hidden subtree then), so go through the
   * attribute selector, which is not role-based.
   */
  async statusFilterValue(): Promise<string> {
    return (
      (
        await this.page
          .locator('[aria-label="Filter by status"]')
          .first()
          .textContent()
          .catch(() => '')
      )?.trim() ?? ''
    );
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

  /** Total result count parsed out of "Showing X to Y of Z results". */
  async totalResults(): Promise<number> {
    const text = (await this.resultsFooter.first().textContent()) ?? '';
    return Number(text.match(/of (\d+) results/i)?.[1] ?? NaN);
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

  get generateTokenButton(): Locator {
    return this.page.getByRole('button', { name: /generate token/i });
  }

  get openInPortalLink(): Locator {
    return this.page.getByRole('link', { name: /open in portal/i });
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
