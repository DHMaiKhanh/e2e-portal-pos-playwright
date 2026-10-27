import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Pagination } from '@components/Pagination';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { blockMutations } from '@helpers/writeGuard';

/**
 * Column order of the All Orders table, as rendered (from docs 17-all-orders.md).
 */
export const AllOrdersColumn = {
  ORDER_ID: 0,
  MERCHANT: 1,
  STATUS: 2,
  AMOUNT: 3,
  DATE: 4,
} as const;

export const ALL_ORDERS_COLUMNS = ['Order ID', 'Merchant', 'Status', 'Amount', 'Date'] as const;

/**
 * All Orders (Internal) list screen — `/pos/<seg>/admin/orders`.
 *
 * The cross-merchant order list: an admin can see orders of every merchant the
 * account is scoped to. Toolbar: a Merchant combobox (searchable), plus Staff /
 * Payment method / Status filters and a search box (order id / phone / name).
 * Clicking a row does NOT open a modal — it navigates to the store-scoped Order
 * detail at `/pos/<seg>/<merchantId>/orders/<id>`, the same screen the merchant
 * Orders list uses. There is no Export button here (a documented gap).
 *
 * SAFETY: once a row is opened, the Order detail exposes money actions
 * (refund / cancel / adjust tip). Call {@link blockWrites} before navigating so
 * any such request is aborted. The list itself is read-only.
 */
export class AllOrdersPage extends BasePage {
  protected readonly path = Urls.ALL_ORDERS;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly pagination: Pagination;
  readonly searchInput: Locator;
  readonly merchantFilter: Locator;
  readonly statusFilter: Locator;
  readonly resultsFooter: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.pagination = new Pagination(page, page.getByRole('navigation', { name: 'Pagination' }));
    this.searchInput = page.getByPlaceholder(/search orders|order id|search/i);
    this.merchantFilter = page
      .getByRole('button', { name: /filter by merchant|merchant/i })
      .first();
    // Filter chips are now named plainly ("Status"); older builds said "Filter by status".
    this.statusFilter = page.getByRole('button', { name: /^(filter by status|status)\b/i });
    this.resultsFooter = page.locator('[data-slot="pos-pagination-range"]');
  }

  async waitForReady(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.table.rows.first().or(this.emptyState)).toBeVisible();
  }

  get pageTitle(): Locator {
    return this.page.getByRole('heading', { level: 1, name: /orders/i });
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

  /** Merchant cell of a row — rendered as `#id · name`. */
  rowMerchant(rowIndex = 0): Locator {
    return this.table.rows.nth(rowIndex).getByRole('cell').nth(AllOrdersColumn.MERCHANT);
  }

  /** Status pill of a row. */
  statusBadge(rowIndex = 0): Locator {
    return this.table.rows
      .nth(rowIndex)
      .getByRole('cell')
      .nth(AllOrdersColumn.STATUS)
      .locator('[data-slot="pos-status-pill"]');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(1_500);
  }

  async clearSearch(): Promise<void> {
    await this.search('');
  }

  /** Total result count parsed out of "X of Y orders" / the range label. */
  async totalResults(): Promise<number> {
    const footer =
      (await this.resultsFooter
        .first()
        .textContent()
        .catch(() => '')) ?? '';
    const header =
      (await this.pageHeader
        .first()
        .textContent()
        .catch(() => '')) ?? '';
    const text = `${footer} ${header}`;
    return Number(text.match(/of ([\d,]+)/i)?.[1]?.replace(/,/g, '') ?? NaN);
  }

  /** Open an order detail by row position (navigates to the store-scoped page). */
  async openOrderRow(index = 0): Promise<void> {
    await this.table.rows.nth(index).click();
    await expect(this.page).toHaveURL(/\/orders\/[^/]+$/);
  }

  async gotoWithQuery(query: Record<string, string>): Promise<void> {
    const search = new URLSearchParams(query).toString();
    await this.page.goto(`${this.path}?${search}`, { waitUntil: 'domcontentloaded' });
  }

  /** Abort order/customer money mutations. Call BEFORE navigating. */
  async blockWrites(): Promise<string[]> {
    return blockMutations(this.page, (url) =>
      /\/(orders|customers)(\/|\?|$)|split_tip|refund|cancel|void|adjust/i.test(
        url.pathname + url.search,
      ),
    );
  }
}
