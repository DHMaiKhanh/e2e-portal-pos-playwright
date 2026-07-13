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
    this.searchInput = page.getByPlaceholder(/search by order id, customer name, phone/i);
    this.createButton = page.getByRole('button', { name: /new order|create/i });
    // Custom Radix `Select` triggers — not native `<select>`, and expose no accessible
    // name matching their current value, so we key off the app's stable `data-slot`.
    this.statusFilter = page.locator('[data-slot="order-filters-status"]');

    this.pageHeading = page.locator('[data-slot="page-title"]');

    this.quickFilterCombobox = page.locator('[data-slot="order-filters-date-preset"]');
    // Label is dynamic (shows the current date/range, e.g. "Jul 7, 2026" or a range).
    this.dateRangeButton = page.getByRole('button', { name: /\d{4}/ });
    this.datePickerDialog = page.getByRole('dialog');

    this.staffFilterButton = page.getByRole('button', { name: /all staff/i });
    this.staffFilterPanel = page.getByRole('menu').or(page.getByRole('dialog'));
    this.allStaffOption = page.getByRole('option', { name: /^all staff$/i });

    this.paymentMethodCombobox = page.locator('[data-slot="order-filters-payment-method"]');

    this.previousPageButton = page.getByRole('button', { name: /previous/i });
    this.nextPageButton = page.getByRole('button', { name: /^next$/i });
    this.paginationSummary = page.getByText(/showing \d+ to \d+ of \d+ results/i);
    this.pageIndicator = page.getByText(/^\s*\d+\s*\/\s*\d+\s*$/);

    this.emptyStateMessage = page.getByText(/no orders found/i);

    // Order detail heading label is dynamic ("Order #OD260707-...").
    this.orderDetailHeading = page.locator('[data-slot="page-title"]');
    this.backToOrdersLink = page.getByRole('link', { name: /back to orders/i });
    this.receiptButton = page.getByRole('button', { name: 'Receipt', exact: true });
    this.reOpenOrderButton = page.getByRole('button', { name: /re-open order/i });
    this.orderInformationSection = page.getByText(/order information/i);
    this.serviceDetailsSection = page.getByText(/service details\s*&\s*tip/i);
    this.paymentDetailsSection = page.getByText(/payment details/i);
    this.activityLogSection = page.getByText(/activity log/i);
    this.orderSummarySection = page.getByText(/order summary/i);
    this.cancelInformationSection = page.getByText(/cancel information/i);
    this.cancelInformationEmptyState = page.getByText(/no cancel information/i);
    this.customerPlaceholder = page.getByText(/no customer is available/i);
    this.orderNotePlaceholder = page.getByText(/no note is available\.?/i);
    this.receiptDialog = page.getByRole('dialog').filter({ hasText: /receipt details/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    // Rows render as animated skeletons while data loads; wait for those to clear
    // so callers don't read/count placeholder cells as real data.
    await expect(this.page.locator('[data-slot="skeleton"]')).toHaveCount(0);
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
    await this.page.getByRole('option', { name: option, exact: true }).click();
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
    method: 'All method' | 'Card' | 'Cash' | 'Gift Card' | 'Other',
  ): Promise<void> {
    await this.chooseOption(this.paymentMethodCombobox, method);
  }

  /**
   * Resets the payment method to "All method". Unlike picking a concrete method,
   * the app clears the `paymentMethod` filter on the URL WITHOUT issuing a new
   * `/orders?` request, so we wait on the URL rather than a network response.
   */
  async clearPaymentMethod(): Promise<void> {
    await this.paymentMethodCombobox.click();
    await this.page.getByRole('option', { name: 'All method', exact: true }).click();
    await this.page.waitForURL(/paymentMethod=all/);
  }

  async selectStatus(
    status:
      | 'All status'
      | 'Cancel Issue'
      | 'Canceled'
      | 'Canceling'
      | 'Partial Refunded'
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
    await this.nextPageButton.click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
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
