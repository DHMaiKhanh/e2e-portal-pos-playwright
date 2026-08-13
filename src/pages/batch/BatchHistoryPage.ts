import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Batch History — ledger screen (`/pos/<id>/batch`). No search, sort or bulk
 * actions; a date-range filter, a status filter, and pagination.
 *
 * It does have a detail view, contrary to an earlier reading of the screen:
 * clicking any cell of a row opens a "Batch Close Review" dialog listing the
 * orders that make up the batch, with Previous/Next to step between batches.
 * Verified live on 2026-08-12 — see `batchReviewDialog` below.
 */
export class BatchHistoryPage extends BasePage {
  protected readonly path = Urls.BATCH_HISTORY;

  readonly sidebar: Sidebar;
  readonly heading: Locator;

  // Filter bar
  /** Button whose label is the currently selected date range, e.g. "Jul 8, 2026 - Jul 15, 2026". */
  readonly dateRangeButton: Locator;
  /** Status combobox; default label "All statuses". */
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
    // The heading paints well before the ledger does, so the skeleton wait is the
    // one that actually gates readiness — and under a full-suite run (8 workers
    // hitting the same remote Portal) it regularly needs more than the default
    // 10s expect timeout. Give it the same margin the other list screens use.
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
      timeout: Timeouts.MEDIUM,
    });
  }

  /** Deep-links directly with query params (page/status/dateAfter/dateBefore). */
  async gotoWithParams(params: Record<string, string>): Promise<void> {
    const qs = new URLSearchParams(params).toString();
    await this.page.goto(`${this.path}?${qs}`, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  /**
   * Load the ledger over a range wide enough that rows are guaranteed.
   *
   * The screen defaults to the last 7 days, which on the DEV store is routinely
   * empty — that emptiness is why several formatting checks used to skip
   * themselves at runtime. Formatting cases want *any* real rows, not a
   * particular date window, so they open the ledger this way instead.
   */
  async gotoAllTime(): Promise<void> {
    await this.gotoWithParams({
      dateAfter: '2020-01-01',
      dateBefore: new Date().toISOString().slice(0, 10),
      status: 'all',
    });
  }

  /**
   * Text of every cell under a column, found by its header.
   *
   * Column position is read at call time rather than hardcoded, so this keeps
   * working if the ledger's columns are reordered. Needed for columns like
   * TOTAL PAYMENT whose values carry no distinguishing format to filter on the
   * way BATCH NUMBER (`B-…`) or AMOUNT (`$…`) can be.
   */
  async columnCellTexts(headerPattern: RegExp): Promise<string[]> {
    const headers = await this.tableRoot.locator('thead th').allInnerTexts();
    const index = headers.findIndex((h) => headerPattern.test(h.trim()));
    if (index === -1) throw new Error(`No column header matching ${headerPattern}`);

    return this.tableRoot.locator(`tbody tr td:nth-child(${index + 1})`).allInnerTexts();
  }

  async openDateRangePicker(): Promise<void> {
    await this.dateRangeButton.click();
    await expect(this.dateRangePicker).toBeVisible();
  }

  // --- Date range picker ---
  //
  // A react-day-picker calendar in a dialog. Day cells are buttons whose
  // accessible name is the full date ("Sunday, July 26th, 2026"); month
  // navigation is "Go to the Previous/Next Month". Matching on the accessible
  // name rather than the visible number avoids picking the same digit from the
  // leading/trailing days of the adjacent month, which share the grid.

  get dateRangePicker(): Locator {
    return this.page.getByRole('dialog');
  }

  get previousMonthButton(): Locator {
    return this.dateRangePicker.getByRole('button', { name: /previous month/i });
  }

  get nextMonthButton(): Locator {
    return this.dateRangePicker.getByRole('button', { name: /next month/i });
  }

  /** Day cell for a date, e.g. new Date('2026-08-03') -> "Monday, August 3rd, 2026". */
  dayCell(date: Date): Locator {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const suffix =
      day % 10 === 1 && day !== 11
        ? 'st'
        : day % 10 === 2 && day !== 12
          ? 'nd'
          : day % 10 === 3 && day !== 13
            ? 'rd'
            : 'th';
    // Substring match, not exact: once a start date is chosen, react-day-picker
    // extends the accessible name of the affected cells (selection/range state),
    // so an anchored match silently stops finding the end date. The date text
    // itself is unique within the visible grid, so this stays unambiguous.
    return this.dateRangePicker.getByRole('button', {
      name: `${weekday}, ${month} ${day}${suffix}, ${date.getFullYear()}`,
    });
  }

  /** Steps the calendar back `count` months. */
  async goBackMonths(count: number): Promise<void> {
    for (let index = 0; index < count; index++) {
      await this.previousMonthButton.click();
      await this.page.waitForTimeout(150);
    }
  }

  /** The month/year caption currently shown, e.g. "August 2026". */
  get calendarCaption(): Locator {
    return this.dateRangePicker.getByText(/^[A-Z][a-z]+ \d{4}$/).first();
  }

  async selectStatus(status: 'All statuses' | 'Open' | 'Closed'): Promise<void> {
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

  // --- Batch Close Review dialog (opens on any row cell click) ---

  get batchReviewDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /batch close review/i });
  }

  get batchReviewCloseButton(): Locator {
    return this.batchReviewDialog.getByRole('button', { name: /^close$/i });
  }

  get batchReviewPreviousButton(): Locator {
    return this.batchReviewDialog.getByRole('button', { name: /^previous$/i });
  }

  get batchReviewNextButton(): Locator {
    return this.batchReviewDialog.getByRole('button', { name: /^next$/i });
  }

  /** The order rows listed inside the review dialog (OD CODE / PAYMENT METHOD / SUBTOTAL / TIP / TOTAL). */
  get batchReviewOrderRows(): Locator {
    return this.batchReviewDialog.locator('tbody tr');
  }

  async openBatchReview(rowIndex = 0): Promise<void> {
    await this.table.rows.nth(rowIndex).getByRole('cell').first().click();
    await expect(this.batchReviewDialog).toBeVisible();
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
   * Options exposed by the status combobox, read off the live Select on
   * 2026-08-12: exactly "All statuses" (previously labelled "All status"),
   * "Open" and "Closed".
   */
  statusOption(name: 'All statuses' | 'Open' | 'Closed'): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
