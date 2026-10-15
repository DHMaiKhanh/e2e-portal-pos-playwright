import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';

/** Orders list/management screen (Order History) + Order Detail sub-route helpers. */
export class OrdersPage extends BasePage {
  protected readonly path = Urls.ORDERS;

  readonly table: DataTable;
  readonly searchInput: Locator;
  readonly createButton: Locator;
  readonly statusFilter: Locator;

  // --- Page header / layout ---
  readonly pageHeading: Locator;

  // --- Quick filter / date range ---
  readonly quickFilterCombobox: Locator;
  /** Button showing the currently selected date/range, e.g. "Jul 7, 2026". */
  readonly dateRangeButton: Locator;
  readonly datePickerDialog: Locator;

  // --- Staff filter ---
  readonly staffFilterButton: Locator;
  readonly staffFilterPanel: Locator;
  readonly allStaffOption: Locator;

  // --- Payment method filter ---
  readonly paymentMethodCombobox: Locator;

  // --- Pagination ---
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  /** Text like "Showing 1 to 10 of 42 results". */
  readonly paginationSummary: Locator;
  /** Text like "1 / 3" between the Previous/Next buttons. */
  readonly pageIndicator: Locator;

  // --- Empty state ---
  readonly emptyStateMessage: Locator;

  // --- Order Detail page ---
  /** Header "Order #<OD ID>" on the detail sub-route. */
  readonly orderDetailHeading: Locator;
  readonly backToOrdersLink: Locator;
  readonly receiptButton: Locator;
  readonly reOpenOrderButton: Locator;
  readonly orderInformationSection: Locator;
  readonly serviceDetailsSection: Locator;
  readonly paymentDetailsSection: Locator;
  readonly activityLogSection: Locator;
  readonly orderSummarySection: Locator;
  readonly cancelInformationSection: Locator;
  readonly cancelInformationEmptyState: Locator;
  readonly customerPlaceholder: Locator;
  readonly orderNotePlaceholder: Locator;
  readonly receiptDialog: Locator;

  constructor(page: Page) {
    super(page);
    this.table = new DataTable(page, page.getByRole('table'));
    // Placeholder became "Search orders..." in the 2026-10 `pos-*` redesign.
    this.searchInput = page.getByPlaceholder(/search orders/i);
    this.createButton = page.getByRole('button', { name: /new order|create/i });
    // Filter bar after the 2026-10 `pos-*` redesign (`data-slot="pos-filter-bar"`),
    // in DOM order — each opens a popover with a `role="option"` list, and picking
    // an option applies it immediately and closes the popover (no Apply needed):
    //   order-filters-date    date preset + calendar ("Last 7 days")
    //   order-filters-staff   staff picker ("Staff")
    //   pos-filter-chip       payment method — aria-label "Payment method"
    //   pos-filter-chip       status — aria-label "Status"
    //
    // The two chips' accessible name grows the selected value once applied
    // ("Status: Partial refunded"), so match on the prefix. The anchor keeps out
    // the "Clear status filter" button that appears beside an applied chip.
    this.statusFilter = page.getByRole('button', { name: /^Status(:|$)/ });

    this.pageHeading = page.locator('[data-slot="pos-page-heading"]');

    // The preset picker and the date-range calendar are now one control: the
    // button shows the preset name ("Last 7 days") and its popover holds both.
    this.quickFilterCombobox = page.locator('[data-slot="order-filters-date"]');
    this.dateRangeButton = this.quickFilterCombobox;
    this.datePickerDialog = page.getByRole('dialog');

    this.staffFilterButton = page.locator('[data-slot="order-filters-staff"]');
    this.staffFilterPanel = page.getByRole('menu').or(page.getByRole('dialog'));
    this.allStaffOption = page.getByRole('option', { name: /^all staff$/i });

    this.paymentMethodCombobox = page.getByRole('button', { name: /^Payment method(:|$)/ });

    // Icon-only buttons labelled "Previous page" / "Next page".
    this.previousPageButton = page.getByRole('button', { name: /^previous( page)?$/i });
    this.nextPageButton = page.getByRole('button', { name: /^next( page)?$/i });
    /** Text like "1–30 of 4,196". */
    this.paginationSummary = page.locator('[data-slot="pos-pagination-range"]');
    this.pageIndicator = page.locator('[data-slot="pos-pagination-page"]');

    this.emptyStateMessage = page.getByText(/no orders found/i);

    // Order detail heading label is dynamic ("Order #OD260707-...").
    this.orderDetailHeading = page
      .locator('[data-slot="pos-page-heading"]')
      .filter({ hasText: /OD\d+/ });
    this.backToOrdersLink = page.getByRole('link', { name: /back to orders/i });
    this.receiptButton = page.getByRole('button', { name: 'Receipt', exact: true });
    this.reOpenOrderButton = page.getByRole('button', { name: /re-open order/i });
    // Detail sections are cards; match their title element rather than any text
    // on the page. A bare getByText(/payment details/i) also matches the
    // transaction rows inside the card, which trips strict mode.
    //
    // "Service Details" lost its "& Tip" suffix as of 2026-08-12 — the tip
    // breakdown moved out into its own "Tip Breakdown" card.
    const cardTitle = (name: RegExp) =>
      page.locator('[data-slot="pos-card-title"]').filter({ hasText: name });

    this.orderInformationSection = cardTitle(/order information/i);
    this.serviceDetailsSection = cardTitle(/service details/i);
    this.paymentDetailsSection = cardTitle(/payment details/i);
    this.activityLogSection = cardTitle(/activity log/i);
    this.orderSummarySection = cardTitle(/order summary/i);
    this.cancelInformationSection = cardTitle(/cancel information/i);
    this.cancelInformationEmptyState = page.getByText(/no cancel information/i);
    this.customerPlaceholder = page.getByText(/no customer is available/i);
    this.orderNotePlaceholder = page.getByText(/no note is available\.?/i);
    this.receiptDialog = page.getByRole('dialog').filter({ hasText: /receipt details/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    // Rows render as animated skeletons while data loads; wait for those to clear
    // so callers don't read/count placeholder cells as real data. Scoped to
    // `:visible` like the other list screens — a table that keeps hidden
    // skeleton nodes mounted would otherwise stall this wait forever.
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0);
  }

  /**
   * Opens a Radix `Select` trigger and picks the option with the given accessible text.
   *
   * If the resulting filter combination was already fetched earlier (e.g. resetting
   * back to a state visited before), the app may serve it from cache instead of firing
   * a new request — so the response wait is best-effort (bounded) rather than required.
   */
  private async chooseOption(trigger: Locator, option: string): Promise<void> {
    await trigger.click();
    const responsePromise = this.page
      .waitForResponse((res) => res.url().includes('/orders?'), { timeout: 3_000 })
      .catch(() => undefined);
    // Case-insensitive: the redesign lower-cased option labels ("Last 30 days",
    // "Gift card", "Partial refunded") while callers keep the older casing.
    const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.page.getByRole('option', { name: new RegExp(`^${escaped}$`, 'i') }).click();
    await responsePromise;
    await this.waitForReady();
  }

  async search(term: string): Promise<void> {
    // Typing debounces its own fetch; wait (best-effort — an identical query may be
    // served from cache instead of hitting the network) for the request carrying the
    // final term to resolve so callers don't read results from a stale, in-flight one.
    const responsePromise = this.page
      .waitForResponse(
        (res) =>
          res.url().includes('/orders?') &&
          res.url().includes(`search=${encodeURIComponent(term)}`),
        {
          timeout: 3_000,
        },
      )
      .catch(() => undefined);
    await this.searchInput.fill(term);
    await this.page.keyboard.press('Enter');
    await responsePromise;
    await this.waitForReady();
  }

  /** Clears the search box — the `search` param is dropped from the request, not sent empty. */
  async clearSearch(): Promise<void> {
    const responsePromise = this.page
      .waitForResponse((res) => res.url().includes('/orders?') && !res.url().includes('search='), {
        timeout: 3_000,
      })
      .catch(() => undefined);
    await this.searchInput.fill('');
    await this.page.keyboard.press('Enter');
    await responsePromise;
    await this.waitForReady();
  }

  async filterByStatus(status: string): Promise<void> {
    await this.chooseOption(this.statusFilter, status);
  }

  async openOrder(orderNumber: string): Promise<void> {
    await this.table.rowContaining(orderNumber).click();
    await this.page.waitForURL(new RegExp(`/orders/`));
  }

  /** Deep-links straight to an order's detail sub-route and waits for it to render. */
  async gotoOrderDetail(id: string): Promise<void> {
    await this.page.goto(`${this.path}/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(this.orderDetailHeading).toBeVisible();
  }

  async rowCount(): Promise<number> {
    return this.table.rowCount();
  }

  /**
   * Guarantee the list has rows to work with, widening the window if it does not.
   *
   * The screen opens on a "Last 7 Days" preset, so a quiet week would leave the
   * table empty. Several cases reacted to that by skipping themselves, which
   * meant a genuinely broken list also reported as "skipped, no data". Widening
   * to 30 days first turns the precondition into something the test can
   * establish rather than something it has to hope for — and if 30 days of a
   * live store still has no orders, that is a failure worth seeing.
   */
  async ensureRowsPresent(): Promise<void> {
    await this.waitForReady();
    if ((await this.rowCount()) === 0) {
      await this.selectQuickFilter('Last 30 Days');
    }
    await expect(
      this.table.rows.first(),
      'no orders in the last 30 days — cannot exercise the order list',
    ).toBeVisible();
  }

  /** CUSTOMER is the 4th column; it stacks "name" over "phone", or shows "—". */
  customerCell(rowIndex: number): Locator {
    return this.table.rows.nth(rowIndex).getByRole('cell').nth(3);
  }

  /**
   * A customer name to search by, found by walking pages.
   *
   * Most orders in this store are walk-ins with no customer attached, so page 1
   * is not guaranteed to hold a named one — the reason the search case used to
   * skip. Scanning a bounded number of pages makes it deterministic without
   * depending on which orders happen to be recent.
   */
  async findCustomerNameToSearch(maxPages = 5): Promise<string | null> {
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const cells = await this.table.rows.locator('td:nth-child(4)').allInnerTexts();
      for (const text of cells) {
        const name = text.split('\n')[0]?.trim() ?? '';
        if (name && name !== '—') return name;
      }
      if (await this.nextPageButton.isDisabled()) break;
      await this.goToNextPage();
      await this.waitForReady();
    }
    return null;
  }

  // --- Filters ---

  async selectQuickFilter(
    option: 'Today' | 'Yesterday' | 'Last 7 Days' | 'Last 30 Days',
  ): Promise<void> {
    await this.chooseOption(this.quickFilterCombobox, option);
  }

  async openDatePicker(): Promise<void> {
    await this.dateRangeButton.click();
  }

  /**
   * Opens the calendar and picks a custom `[startDay, endDay]` range within the
   * currently shown month, then waits for the re-filtered list to load. Day cells
   * expose the number as their text (their accessible name is the full date).
   */
  async pickCustomDateRange(startDay: number, endDay: number): Promise<void> {
    await this.openDatePicker();
    const dayCell = (day: number) =>
      this.datePickerDialog
        .getByRole('button')
        .filter({ hasText: new RegExp(`^${day}$`) })
        .first();
    await dayCell(startDay).click();
    const responsePromise = this.page.waitForResponse((res) => res.url().includes('/orders?'));
    await dayCell(endDay).click();
    await responsePromise;
    await this.waitForReady();
  }

  async openStaffFilter(): Promise<void> {
    await this.staffFilterButton.click();
  }

  /** Row for a given staff name inside the open staff filter panel. */
  staffOption(name: string): Locator {
    return this.staffFilterPanel.getByText(name, { exact: true });
  }

  /** Opens the staff filter, picks `name`, and waits for the filtered list to load. */
  async selectStaff(name: string): Promise<void> {
    await this.openStaffFilter();
    const responsePromise = this.page
      .waitForResponse((res) => res.url().includes('/orders?') && res.url().includes('staff='), {
        timeout: 3_000,
      })
      .catch(() => undefined);
    await this.staffOption(name).click();
    await responsePromise;
    await this.waitForReady();
  }

  async selectPaymentMethod(
    method: 'All methods' | 'Card' | 'Cash' | 'Gift Card' | 'Other',
  ): Promise<void> {
    await this.chooseOption(this.paymentMethodCombobox, method);
  }

  /**
   * Resets the payment method to "All methods". Unlike picking a concrete method,
   * the app clears the `paymentMethod` filter on the URL WITHOUT issuing a new
   * `/orders?` request, so we wait on the URL rather than a network response.
   */
  async clearPaymentMethod(): Promise<void> {
    await this.paymentMethodCombobox.click();
    await this.page.getByRole('option', { name: 'All methods', exact: true }).click();
    await this.page.waitForURL(/paymentMethod=all/);
  }

  /**
   * Option labels are read off the live Select. Kept in sync with the app on
   * 2026-08-12: the reset option is "All statuses" (was "All status") and
   * "Pending" was added.
   */
  async selectStatus(
    status:
      | 'All statuses'
      | 'Cancel Issue'
      | 'Canceled'
      | 'Canceling'
      | 'Partial Refunded'
      | 'Pending'
      | 'Refund Issue'
      | 'Refunded'
      | 'Refunding'
      | 'Successful - Settled'
      | 'Successful - Unsettled'
      | 'Re-opened',
  ): Promise<void> {
    await this.chooseOption(this.statusFilter, status);
  }

  // --- Pagination ---

  async goToNextPage(): Promise<void> {
    await this.turnPage(this.nextPageButton);
  }

  async goToPreviousPage(): Promise<void> {
    await this.turnPage(this.previousPageButton);
  }

  /**
   * Since the 2026-10 redesign the table keeps the previous page's rows on screen
   * (no skeleton) while the next page loads, so `waitForReady()` alone returns
   * on stale data. Wait for the first row's order id to change instead.
   */
  private async turnPage(button: Locator): Promise<void> {
    const firstId = this.odIdCell(0);
    const before = (await firstId.count()) ? (await firstId.innerText()).trim() : '';
    await button.click();
    if (before) await expect(firstId).not.toHaveText(before);
  }

  // --- Table cell helpers ---

  /** OD ID text (e.g. "#OD260707-12050342") for the row at index. */
  odIdCell(rowIndex: number): Locator {
    return this.table.rows.nth(rowIndex).getByRole('cell').first();
  }

  async openReceipt(): Promise<void> {
    await this.receiptButton.click();
    await expect(this.receiptDialog).toBeVisible();
  }

  /** Row for a given credit note code inside the "Cancel Information" block. */
  creditNoteRow(code: string): Locator {
    return this.page.getByText(code, { exact: false });
  }

  /** Link to view all / navigate away — dynamic label, kept generic. */
  viewAllLink(sectionName: string | RegExp): Locator {
    return this.page
      .getByRole('link', { name: /view all/i })
      .filter({ hasText: sectionName instanceof RegExp ? '' : sectionName });
  }
}
