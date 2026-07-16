import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';

/**
 * Batch History — read-only ledger screen (`/pos/<id>/batch`). No search, sort,
 * bulk actions, or row/detail view; only a date-range filter, a status filter,
 * and pagination.
 */
export class BatchHistoryPage extends BasePage {
  protected readonly path = Urls.BATCH_HISTORY;

  readonly sidebar: Sidebar;
  readonly heading: Locator;

  // Filter bar
  /** Button whose label is the currently selected date range, e.g. "Jul 8, 2026 - Jul 15, 2026". */
  readonly dateRangeButton: Locator;
  /** Status combobox; default label "All status". */
  readonly statusCombobox: Locator;
  readonly clearFiltersButton: Locator;

  // Table
  readonly table: DataTable;
  readonly tableRoot: Locator;
  readonly emptyState: Locator;

  // Pagination
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  /** Text like "Showing 1 to 30 of 88 results". */
  readonly paginationSummary: Locator;
  /** Text like "1 / 3" between the Previous/Next buttons. */
  readonly pageIndicator: Locator;

  // Table column headers (order: BATCH DATE, BATCH NUMBER, STATUS, TOTAL PAYMENT, AMOUNT)
  readonly batchDateHeader: Locator;
  readonly batchNumberHeader: Locator;
  readonly statusHeader: Locator;
  readonly totalPaymentHeader: Locator;
  readonly amountHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.heading = page.getByText(/^batch history$/i).first();

    this.dateRangeButton = page.getByRole('button', { name: /\d{4}/ });
    this.statusCombobox = page.getByRole('combobox');
    this.clearFiltersButton = page.getByRole('button', { name: /clear filters/i });

    this.tableRoot = page.getByRole('table');
    this.table = new DataTable(page, this.tableRoot);
    this.emptyState = page.getByText(/no batches found\.?/i);

    this.previousPageButton = page.getByRole('button', { name: /previous/i });
    this.nextPageButton = page.getByRole('button', { name: /^next$/i });
    this.paginationSummary = page.getByText(/showing \d+ to \d+ of \d+ results/i);
    this.pageIndicator = page.getByText(/^\s*\d+\s*\/\s*\d+\s*$/);

    this.batchDateHeader = page.getByRole('columnheader', { name: /batch date/i });
    this.batchNumberHeader = page.getByRole('columnheader', { name: /batch number/i });
    this.statusHeader = page.getByRole('columnheader', { name: /^status$/i });
    this.totalPaymentHeader = page.getByRole('columnheader', { name: /total payment/i });
    this.amountHeader = page.getByRole('columnheader', { name: /^amount$/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0);
  }

  /** Deep-links directly with query params (page/status/dateAfter/dateBefore). */
  async gotoWithParams(params: Record<string, string>): Promise<void> {
    const qs = new URLSearchParams(params).toString();
    await this.page.goto(`${this.path}?${qs}`, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  async openDateRangePicker(): Promise<void> {
    await this.dateRangeButton.click();
  }

  async selectStatus(status: 'All status' | 'Open' | 'Closed'): Promise<void> {
    await this.statusCombobox.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
  }

  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
  }

  /** Row for a given batch number, e.g. "B-00103". */
  row(batchNumber: string): Locator {
    return this.table.rowContaining(batchNumber);
  }

  statusBadge(batchNumber: string): Locator {
    return this.row(batchNumber).getByText(/^(Open|Closed)$/);
  }

  /** BATCH DATE cell for a given batch number, e.g. "Jun 12, 2026 (UTC+7)". */
  batchDateCell(batchNumber: string): Locator {
    return this.row(batchNumber).getByText(/\(UTC[+-]?\d+\)/);
  }

  /** AMOUNT cell for a given batch number, formatted as USD currency. */
  amountCell(batchNumber: string): Locator {
    return this.row(batchNumber).getByText(/\$[\d,]+\.\d{2}/);
  }

  /** All rows currently rendered with an "Open" status badge. */
  get openStatusBadges(): Locator {
    return this.tableRoot.getByText(/^Open$/);
  }

  /** All rows currently rendered with a "Closed" status badge. */
  get closedStatusBadges(): Locator {
    return this.tableRoot.getByText(/^Closed$/);
  }

  /** Whether the "Clear filters" button is currently rendered (only shown when filters ≠ default). */
  async isClearFiltersVisible(): Promise<boolean> {
    return this.clearFiltersButton.isVisible();
  }

  /** Reads the current query params (page/status/dateAfter/dateBefore) from the URL. */
  currentQueryParams(): URLSearchParams {
    return new URL(this.page.url()).searchParams;
  }

  /** Text of the pagination summary, e.g. "Showing 1 to 30 of 88 results". */
  async paginationSummaryText(): Promise<string> {
    return (await this.paginationSummary.textContent()) ?? '';
  }

  /** Text of the page indicator, e.g. "1 / 3". */
  async pageIndicatorText(): Promise<string> {
    return (await this.pageIndicator.textContent()) ?? '';
  }

  /**
   * Options exposed by the status combobox. Only "All status", "Open", and
   * "Closed" are confirmed by the scanned doc — full option list is an open
   * question pending live verification.
   */
  statusOption(name: 'All status' | 'Open' | 'Closed'): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
