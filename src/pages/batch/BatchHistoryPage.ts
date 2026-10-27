import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Batch History — ledger screen (`/pos/<seg>/<id>/batch`, sidebar label "Batches").
 * No search, sort or bulk actions; a date-range filter, a status filter chip,
 * a "Columns" visibility menu, and pagination.
 *
 * Re-mapped to the 2026-10-13 design-system refactor (Linear VP-4569), verified
 * live on 2026-10-20:
 *  - heading is `h1 "Batches"` with a live count ("118 batches") beside it;
 *  - the status filter is no longer a combobox but a filter chip
 *    (`button[data-slot="pos-filter-chip"]`, aria-label "Status" when unset,
 *    "Status: Open" when set) opening a popover `listbox` with "Open"/"Closed".
 *    There is no "All statuses" option any more: "all" is the unset chip, reached
 *    via the chip's own "Clear status filter" (x) button;
 *  - the date-range picker is a two-month calendar with presets, applied only by
 *    its "Apply" button;
 *  - pagination is `navigation "Pagination"` with "1–30 of 118", "1 / 4",
 *    "Previous page"/"Next page" icon buttons; it is not rendered when empty;
 *  - empty state reads "No matching results"; load error "Couldn't load batches".
 *
 * Clicking any row cell opens a "Batch close review — <date>" dialog listing the
 * orders that make up the batch (paginated, with its own "Pagination" nav).
 */
export class BatchHistoryPage extends BasePage {
  protected readonly path = Urls.BATCH_HISTORY;

  readonly sidebar: Sidebar;
  readonly heading: Locator;
  /** The live "N batches" count beside the heading. */
  readonly countBadge: Locator;

  // Filter bar
  /** Button whose label is the selected date range, e.g. "Oct 13 – 20, 2026". */
  readonly dateRangeButton: Locator;
  /** Status filter chip; accessible name "Status" (unset) or "Status: Open|Closed". */
  readonly statusFilter: Locator;
  /** The chip's own (x) button, shown only while a status is set. */
  readonly clearStatusButton: Locator;
  readonly clearFiltersButton: Locator;

  // Table
  readonly table: DataTable;
  readonly tableRoot: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;

  // Pagination
  readonly pagination: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  /** Text like "1–30 of 88". */
  readonly paginationSummary: Locator;
  /** Text like "1 / 3" between the Previous/Next buttons. */
  readonly pageIndicator: Locator;

  // Table column headers (order: Batch date, Batch number, Status, Total payment, Amount)
  readonly batchDateHeader: Locator;
  readonly batchNumberHeader: Locator;
  readonly statusHeader: Locator;
  readonly totalPaymentHeader: Locator;
  readonly amountHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.heading = page.getByRole('heading', { level: 1, name: /^batches$/i });
    this.countBadge = page.locator('[data-slot="pos-page-description-count"]');

    this.dateRangeButton = page.locator('[data-slot="batch-filters-date"]');
    this.statusFilter = page.locator('button[data-slot="pos-filter-chip"]').filter({
      has: page.locator('[data-slot="pos-filter-name"]', { hasText: /^status$/i }),
    });
    this.clearStatusButton = page.getByRole('button', { name: /^clear status filter$/i });
    // The empty state repeats a "Clear filters" button — the toolbar one comes first.
    this.clearFiltersButton = page.getByRole('button', { name: /^clear filters$/i }).first();

    this.tableRoot = page.locator('#pos-main').getByRole('table');
    this.table = new DataTable(page, this.tableRoot);
    this.emptyState = page.getByText(/^no matching results$/i);
    this.errorState = page.getByText(/couldn't load batches/i);

    this.pagination = page.locator('#pos-main').getByRole('navigation', { name: 'Pagination' });
    this.previousPageButton = this.pagination.getByRole('button', { name: /^previous page$/i });
    this.nextPageButton = this.pagination.getByRole('button', { name: /^next page$/i });
    this.paginationSummary = this.pagination.getByText(/^\d+\s*[–-]\s*\d+ of [\d,]+$/);
    this.pageIndicator = this.pagination.getByText(/^\s*\d+\s*\/\s*\d+\s*$/);

    this.batchDateHeader = page.getByRole('columnheader', { name: /batch date/i });
    this.batchNumberHeader = page.getByRole('columnheader', { name: /batch number/i });
    this.statusHeader = page.getByRole('columnheader', { name: /^status$/i });
    this.totalPaymentHeader = page.getByRole('columnheader', { name: /total payment/i });
    this.amountHeader = page.getByRole('columnheader', { name: /^amount$/i });
  }

  async waitForReady(): Promise<void> {
    // Gate on the filter bar + table (they render on every batch view, while the
    // header can still be hydrating on deep links), then on the skeleton rows
    // clearing, which is what actually signals data readiness. Shared remote DEV
    // is slow under parallel load, so use the MEDIUM margin throughout.
    await expect(this.dateRangeButton).toBeVisible({ timeout: Timeouts.MEDIUM });
    await expect(this.tableRoot).toBeVisible({ timeout: Timeouts.MEDIUM });
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
   * Load the ledger over a range wide enough that rows are guaranteed (the
   * default 7-day window can be empty on DEV): 2020-01-01 to today, all statuses.
   */
  async gotoAllTime(): Promise<void> {
    await this.gotoWithParams({
      dateAfter: '2020-01-01',
      dateBefore: new Date().toISOString().slice(0, 10),
      status: 'all',
    });
  }

  /** Text of every cell under a column, found by its header (position read at call time). */
  async columnCellTexts(headerPattern: RegExp): Promise<string[]> {
    const headers = await this.tableRoot.locator('thead th').allInnerTexts();
    const index = headers.findIndex((h) => headerPattern.test(h.trim()));
    if (index === -1) throw new Error(`No column header matching ${headerPattern}`);

    return this.table.rows.locator(`td:nth-child(${index + 1})`).allInnerTexts();
  }

  /** Total result count from the pagination summary ("1–30 of 118" -> 118); 0 when hidden. */
  async totalResults(): Promise<number> {
    if (!(await this.paginationSummary.isVisible())) return 0;
    const text = await this.paginationSummaryText();
    return Number(text.match(/of\s+([\d,]+)/)?.[1].replace(/,/g, '') ?? NaN);
  }

  async openDateRangePicker(): Promise<void> {
    await this.dateRangeButton.click();
    await expect(this.dateRangePicker).toBeVisible();
  }

  // --- Date range picker ---
  //
  // A popover dialog with presets ("Today", "Last 7 days", ...), a two-month
  // react-day-picker calendar and Cancel/Apply. Day cells are buttons named by
  // the full date ("Tuesday, September 1st, 2026", "..., selected" once in range);
  // months are stepped with "Go to the Previous/Next Month". A picked range only
  // reaches the URL once "Apply" is pressed.

  get dateRangePicker(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.page.getByRole('grid') });
  }

  get previousMonthButton(): Locator {
    return this.dateRangePicker.getByRole('button', { name: /previous month/i });
  }

  get nextMonthButton(): Locator {
    return this.dateRangePicker.getByRole('button', { name: /next month/i });
  }

  get applyDateRangeButton(): Locator {
    return this.dateRangePicker.getByRole('button', { name: /^apply$/i });
  }

  /** Day cell for a date, e.g. new Date(2026, 7, 3) -> "Monday, August 3rd, 2026". */
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
    // Substring match: selection state is appended to the accessible name.
    return this.dateRangePicker
      .getByRole('button', {
        name: `${weekday}, ${month} ${day}${suffix}, ${date.getFullYear()}`,
      })
      .first();
  }

  /** Steps the calendar back `count` months. */
  async goBackMonths(count: number): Promise<void> {
    for (let index = 0; index < count; index++) {
      await this.previousMonthButton.click();
      await this.page.waitForTimeout(150);
    }
  }

  /** The first (left) month caption currently shown, e.g. "August 2026" (a live `status` region). */
  get calendarCaption(): Locator {
    return this.dateRangePicker.getByRole('status').first();
  }

  /** "August 2026" read from the first visible month grid. */
  async calendarMonth(): Promise<{ year: number; month: number }> {
    const caption = (await this.calendarCaption.innerText()).trim();
    const [monthName, yearText] = caption.split(' ');
    return {
      year: Number(yearText),
      month: new Date(`${monthName} 1, ${yearText}`).getMonth(),
    };
  }

  /**
   * Set the status filter. "All statuses" clears the chip — the refactored
   * filter has no explicit "all" option; unset means all.
   */
  async selectStatus(status: 'All statuses' | 'Open' | 'Closed'): Promise<void> {
    if (status === 'All statuses') {
      if (await this.clearStatusButton.isVisible()) await this.clearStatusButton.click();
      return;
    }
    await this.statusFilter.click();
    await this.statusOption(status).click();
    await expect(this.statusFilter).toHaveAccessibleName(new RegExp(`status: ${status}`, 'i'));
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

  // --- Batch close review dialog (opens on any row cell click) ---

  get batchReviewDialog(): Locator {
    return this.page.getByRole('dialog', { name: /batch close review/i });
  }

  get batchReviewCloseButton(): Locator {
    return this.batchReviewDialog.getByRole('button', { name: /^close$/i });
  }

  /** The dialog's order-list pagination ("Previous page"/"Next page"). */
  get batchReviewPreviousButton(): Locator {
    return this.batchReviewDialog.getByRole('button', { name: /^previous page$/i });
  }

  get batchReviewNextButton(): Locator {
    return this.batchReviewDialog.getByRole('button', { name: /^next page$/i });
  }

  /** Order rows listed inside the review dialog (OD code / Payment method / Subtotal / Tip / Total). */
  get batchReviewOrderRows(): Locator {
    return this.batchReviewDialog
      .locator('tbody tr')
      .filter({ hasNot: this.page.locator('[data-slot="empty"], [data-slot="skeleton"]') });
  }

  async openBatchReview(rowIndex = 0): Promise<void> {
    await this.table.rows.nth(rowIndex).getByRole('cell').first().click();
    await expect(this.batchReviewDialog).toBeVisible();
  }

  statusBadge(batchNumber: string): Locator {
    return this.row(batchNumber).locator('[data-slot="pos-status-pill"]');
  }

  /** BATCH DATE cell for a given batch number, e.g. "Jun 12, 2026 (UTC-5)". */
  batchDateCell(batchNumber: string): Locator {
    return this.row(batchNumber).getByText(/\(UTC[+-]?\d+\)/);
  }

  /** AMOUNT cell for a given batch number, formatted as USD currency. */
  amountCell(batchNumber: string): Locator {
    return this.row(batchNumber).getByText(/\$[\d,]+\.\d{2}/);
  }

  /** Every status pill in the ledger body. */
  get statusBadges(): Locator {
    return this.tableRoot.locator('tbody [data-slot="pos-status-pill"]');
  }

  /** All rows currently rendered with an "Open" status pill. */
  get openStatusBadges(): Locator {
    return this.statusBadges.filter({ hasText: /^Open$/ });
  }

  /** All rows currently rendered with a "Closed" status pill. */
  get closedStatusBadges(): Locator {
    return this.statusBadges.filter({ hasText: /^Closed$/ });
  }

  /** Whether the "Clear filters" button is currently rendered (only shown when filters ≠ default). */
  async isClearFiltersVisible(): Promise<boolean> {
    return this.clearFiltersButton.isVisible();
  }

  /** Reads the current query params (page/status/dateAfter/dateBefore) from the URL. */
  currentQueryParams(): URLSearchParams {
    return new URL(this.page.url()).searchParams;
  }

  /** Text of the pagination summary, e.g. "1–30 of 88". */
  async paginationSummaryText(): Promise<string> {
    return ((await this.paginationSummary.textContent()) ?? '').trim();
  }

  /** Text of the page indicator, e.g. "1 / 3". */
  async pageIndicatorText(): Promise<string> {
    return (await this.pageIndicator.textContent()) ?? '';
  }

  /** Options in the status chip's popover listbox: exactly "Open" and "Closed". */
  statusOption(name: 'Open' | 'Closed'): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
