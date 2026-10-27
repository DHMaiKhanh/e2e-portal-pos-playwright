import { type Locator, type Page, type Route, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OrdersPage } from '@pages/orders/OrdersPage';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { parseMoney } from '@utils/stringUtils';

/** Order statuses the Edit Order cases open (labels as shown in the listing Status filter). */
/** Earliest `dateAfter` used when searching the listing for an order with a given status. */
const ORDER_SEARCH_FROM = '2025-01-01';

export type EditOrderStatus =
  | 'Successful - Unsettled'
  | 'Successful - Settled'
  | 'Partial Refunded'
  | 'Refunded'
  | 'Canceled'
  | 'Pending'
  | 'Re-opened';

export interface OpenOrderOptions {
  /** Require an order that has a tip (Tip allocation section visible in the edit dialog). */
  withTip?: boolean;
  /** Require at least this many staff groups in the edit dialog. */
  staffCount?: number;
  /** Upper bound of orders inspected when `withTip`/`staffCount` require walking the list. */
  maxCandidates?: number;
  /** Upper bound of listing pages walked. */
  maxPages?: number;
  /** Require a customer attached to the order. */
  withCustomer?: boolean;
  /** Require a line sold by the store itself (a "Store" / no-staff group). */
  withStoreItem?: boolean;
  /** Require at least one staff line that can be edited (skips store-only orders). */
  withStaffRows?: boolean;
  /** Skip this many matching orders first (lets parallel files mutate different orders). */
  skipMatches?: number;
  /** Require a staff owning 2+ editable services (one can be moved without emptying the group). */
  withMultiServiceStaff?: boolean;
}

export interface OrderSummary {
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
}

export interface ServiceGroup {
  staff: string;
  services: { name: string; price: number }[];
}

export type TipSplitMethod = 'Split evenly' | 'Proportion' | 'Manual';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Order Detail screen (`/pos/nail/<storeId>/orders/<orderUuid>`) — feature "Edit Order"
 * (VP-2591 / VP-2593). Labels come from the DOM scan in docs/test-cases/edit-order.md, Part A.
 *
 * SAFETY: call {@link blockOrderMutations} before navigating. It aborts every non-GET request to
 * order/customer endpoints so no test can mutate a live DEV order. Never click
 * {@link confirmUpdateButton} on live data.
 */
export class OrderDetailPage extends BasePage {
  protected readonly path = Urls.ORDERS;

  /** Listing page object, reused for status/date filters and the table. */
  readonly orders: OrdersPage;

  /** Every blocked mutating request, as `"<METHOD> <url>"`. Filled by {@link blockOrderMutations}. */
  readonly blockedRequests: string[] = [];

  // --- Detail page ---
  /** Header "#OD<yymmdd>-<n>" — dynamic. */
  readonly heading: Locator;
  readonly orderInformationCard: Locator;
  readonly serviceDetailsCard: Locator;
  readonly activityLogCard: Locator;
  readonly moreActionsButton: Locator;
  /** "Last updated: <time>" on the Service details card. */
  readonly lastUpdatedText: Locator;
  /** "Updated" tag (A7 — not yet observed on DEV). */
  readonly updatedTag: Locator;
  readonly editCustomerButton: Locator;
  readonly editServiceDetailsButton: Locator;

  // --- Edit customer dialog (A4) ---
  /** Title "Add customer" when no customer is attached; may read "Change customer" otherwise. */
  readonly customerDialog: Locator;
  readonly customerSearchInput: Locator;
  readonly customerLoyaltyNote: Locator;
  readonly customerSaveButton: Locator;
  readonly customerCancelButton: Locator;

  // --- Edit service details dialog (A5) ---
  readonly editServiceDialog: Locator;
  readonly editServiceDescription: Locator;
  readonly staffAndServicesHeading: Locator;
  readonly addStaffButton: Locator;
  /** One per staff group; the button's text is the staff name ("Select staff" for a new group). */
  readonly changeStaffButtons: Locator;
  readonly staffActionsButtons: Locator;
  readonly dragHandles: Locator;
  readonly selectServiceCheckboxes: Locator;
  readonly serviceNameInputs: Locator;
  readonly changeServiceButtons: Locator;
  readonly addNoteButtons: Locator;
  readonly serviceNoteInputs: Locator;
  /** One locator per service row (nearest ancestor of a `Service name` textbox holding its price). */
  readonly serviceRows: Locator;
  /** Group-level containers, one per staff group. */
  readonly staffGroups: Locator;
  /** "<n> selected · Move to…" bar, shown only while rows are checked. */
  readonly moveToButton: Locator;
  readonly clearSelectionButton: Locator;
  /** "No service yet — drag one here, change the staff, or remove it before saving." */
  readonly emptyGroupHint: Locator;
  readonly emptyGroupError: Locator;
  readonly refundedLabels: Locator;
  /** "Not editable" badge on the Store group (lines sold by the store, no staff). */
  readonly storeNotEditable: Locator;
  readonly staffSearchInput: Locator;
  readonly serviceSearchInput: Locator;

  // --- Tip allocation (A5.4) ---
  readonly tipAllocationHeading: Locator;
  readonly noTipText: Locator;
  readonly tipSplitTabs: Locator;
  /** Element whose text is "Total tip $x.xx". */
  readonly totalTip: Locator;
  readonly recipientsLabel: Locator;
  /** Status "Balanced $x / $x" or "Off by $d $y / $x". */
  readonly balanceStatus: Locator;
  readonly tipError: Locator;

  // --- Footer (A5.5–A5.6) ---
  readonly orderNote: Locator;
  /** Element whose text is "Services total $x.xx". */
  readonly servicesTotal: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;

  // --- Confirm popup (A6) ---
  readonly confirmPopup: Locator;
  readonly confirmPopupMessage: Locator;
  /** DO NOT CLICK on live data. Exposed for visibility assertions only. */
  readonly confirmUpdateButton: Locator;
  readonly confirmCancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.orders = new OrdersPage(page);

    const cardTitle = (name: RegExp) =>
      page.locator('[data-slot="pos-card-title"]').filter({ hasText: name });

    // `<h1 data-slot="pos-page-heading">` since the 2026-10 `pos-*` redesign (was `page-title`).
    // The listing's "Orders" h1 can still be mounted while the route transitions, so keep only
    // the order-number heading.
    this.heading = page.locator('[data-slot="pos-page-heading"]').filter({ hasText: /OD\d+/ });
    this.orderInformationCard = cardTitle(/order information/i);
    this.serviceDetailsCard = cardTitle(/service details/i);
    this.activityLogCard = cardTitle(/activity log/i);
    this.moreActionsButton = page.getByRole('button', { name: /more actions/i });
    this.lastUpdatedText = page.getByText(/Last updated:/);
    this.updatedTag = page.getByText('Updated', { exact: true });
    this.editCustomerButton = page.getByRole('button', { name: 'Edit customer', exact: true });
    this.editServiceDetailsButton = page.getByRole('button', {
      name: 'Edit service details',
      exact: true,
    });

    // Customer dialog
    this.customerDialog = page.getByRole('dialog', {
      name: /Add customer|Change customer|customer/i,
    });
    this.customerSearchInput = this.customerDialog.getByPlaceholder('Search by name, phone...');
    this.customerLoyaltyNote = this.customerDialog.getByText(
      /recalculates loyalty points\. No amount on this order changes\./,
    );
    this.customerSaveButton = this.customerDialog.getByRole('button', { name: 'Save changes' });
    this.customerCancelButton = this.customerDialog.getByRole('button', { name: 'Cancel' });

    // Edit service details dialog
    const d = page.getByRole('dialog', { name: /Edit service details/ });
    this.editServiceDialog = d;
    this.editServiceDescription = d.getByText(
      'Reassign staff, change services or notes. Amounts stay the same.',
    );
    this.staffAndServicesHeading = d.getByRole('heading', { name: 'Staff & services' });
    this.addStaffButton = d.getByRole('button', { name: 'Add staff', exact: true });
    this.changeStaffButtons = d.getByRole('button', { name: 'Change staff for this group' });
    this.staffActionsButtons = d.getByRole('button', { name: 'Staff actions' });
    this.dragHandles = d.getByRole('button', { name: 'Drag to reassign staff' });
    this.selectServiceCheckboxes = d.getByRole('checkbox', { name: 'Select service' });
    this.serviceNameInputs = d.getByRole('textbox', { name: 'Service name' });
    this.changeServiceButtons = d.getByRole('button', { name: 'Change service' });
    this.addNoteButtons = d.getByRole('button', { name: 'Add note' });
    this.serviceNoteInputs = d.getByRole('textbox', { name: 'Service note' });
    // No row container role exists; the nearest ancestor of each `Service name` box that also
    // carries a "$" price is the row.
    this.serviceRows = this.serviceNameInputs.locator('xpath=ancestor::*[contains(., "$")][1]');
    // A group container is the nearest ancestor of its "Change staff for this group" button that
    // also holds either a service row or the empty-group hint.
    this.staffGroups = this.changeStaffButtons.locator(
      'xpath=ancestor::*[.//input or contains(., "No service yet")][1]',
    );
    this.moveToButton = d.getByRole('button', { name: /^Move to/ });
    this.clearSelectionButton = d.getByRole('button', { name: 'Clear', exact: true });
    this.emptyGroupHint = d.getByText(/No service yet — drag one here/);
    this.emptyGroupError = d.getByText('Each section needs a staff and a service.');
    this.refundedLabels = d.getByText('Refunded', { exact: true });
    this.storeNotEditable = d.getByText('Not editable', { exact: true });
    // Placeholder is "Search staff..." in the Move to… picker; tolerate either ellipsis form.
    this.staffSearchInput = page.getByPlaceholder(/^Search staff(…|\.\.\.)$/);
    this.serviceSearchInput = page.getByPlaceholder('Search service…');

    // Tip allocation
    this.tipAllocationHeading = d.getByRole('heading', { name: 'Tip allocation' });
    this.noTipText = d.getByText('No tip on this order');
    this.tipSplitTabs = d.getByRole('tablist', { name: 'Tip split method' });
    this.totalTip = d.getByText(/Total tip\s*\$[\d,]+\.\d{2}/);
    this.recipientsLabel = d.getByText('Recipients & amounts');
    this.balanceStatus = d.getByRole('status').filter({ hasText: /Balanced|Off by/ });
    this.tipError = d.getByText('Tip shares must add up to the total tip.');

    // Footer
    // After a failed save the textarea loses its "Order note" label; the placeholder stays.
    this.orderNote = d
      .getByRole('textbox', { name: 'Order note' })
      .or(d.getByPlaceholder('Add a note for this order'))
      .first();
    this.servicesTotal = d.getByText(/Services total\s*\$[\d,]+\.\d{2}/);
    this.saveChangesButton = d.getByRole('button', { name: 'Save changes' });
    this.cancelButton = d.getByRole('button', { name: 'Cancel', exact: true });

    // Confirm popup — title on DEV is "Confirm order update?" (spec: "Confirm Order Update?").
    const confirmName = /Confirm order update\?/i;
    this.confirmPopup = page
      .getByRole('alertdialog', { name: confirmName })
      .or(page.getByRole('dialog', { name: confirmName }));
    this.confirmPopupMessage = this.confirmPopup.getByText(
      'This action will update the order information without changing any amount or payment data. Do you want to continue?',
    );
    this.confirmUpdateButton = this.confirmPopup.getByRole('button', { name: /^Confirm update$/i });
    this.confirmCancelButton = this.confirmPopup.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
  }

  /** Detail is ready once the "#OD…" header and the Order information card render. */
  async waitForReady(): Promise<void> {
    await expect(this.heading).toContainText(/#?OD\d+/, { timeout: Timeouts.NAVIGATION });
    await expect(this.orderInformationCard).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  // ---------------------------------------------------------------------------
  // Safety
  // ---------------------------------------------------------------------------

  /**
   * Aborts every non-GET request to order/customer/tip endpoints and records it as
   * `"<METHOD> <url>"`. Must be called BEFORE any navigation. Returns the live recorder array.
   */
  async blockOrderMutations(): Promise<string[]> {
    const handler = async (route: Route): Promise<void> => {
      const req = route.request();
      const method = req.method().toUpperCase();
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        await route.fallback();
        return;
      }
      this.blockedRequests.push(`${method} ${req.url()}`);
      this.logger.warn(`Blocked mutating request ${method} ${req.url()}`);
      await route.abort('blockedbyclient');
    };
    // Equivalent to '**/orders/**', '**/customers/**' (incl. attach endpoints) and split_tip,
    // as a predicate so query strings and trailing segments are matched reliably.
    await this.page.route(
      (url) => /\/(orders|customers)(\/|\?|$)|split_tip/i.test(url.pathname + url.search),
      handler,
    );
    return this.blockedRequests;
  }

  // ---------------------------------------------------------------------------
  // Opening an order
  // ---------------------------------------------------------------------------

  /**
   * Opens an order with the given status from the listing. Widens the date preset to the widest
   * available, filters by status, and (when `opts` require tip / several staff) walks rows and
   * pages, inspecting each order's edit dialog. Returns `false` when DEV has no matching order —
   * specs should `test.skip(!opened, '<reason>')`.
   */
  async openOrderWithStatus(
    status: EditOrderStatus,
    opts: OpenOrderOptions = {},
  ): Promise<boolean> {
    const needsInspection =
      Boolean(opts.withTip) ||
      Boolean(opts.withCustomer) ||
      Boolean(opts.withStoreItem) ||
      Boolean(opts.withStaffRows) ||
      Boolean(opts.withMultiServiceStaff) ||
      (opts.staffCount ?? 0) > 1 ||
      (opts.skipMatches ?? 0) > 0;
    const maxCandidates = opts.maxCandidates ?? 15;
    const maxPages = opts.maxPages ?? 5;
    let toSkip = opts.skipMatches ?? 0;

    await this.orders.goto();
    await this.widenDateRange();
    await this.pickFilterOption(this.orders.statusFilter, status);
    // The widest preset is "Last 30 days", but rarer statuses (Partial refunded, Re-opened) only
    // exist further back on DEV. The listing reads its range from the URL, so open it from
    // ORDER_SEARCH_FROM; rows stay newest-first, so recent orders are still preferred.
    const wide = new URL(this.page.url());
    wide.searchParams.set('dateAfter', ORDER_SEARCH_FROM);
    wide.searchParams.set('page', '1');
    await this.page.goto(wide.toString(), { waitUntil: 'domcontentloaded' });
    await this.orders.waitForReady();
    const listingUrl = this.page.url();

    let inspected = 0;
    for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
      const rowCount = await this.orders.rowCount();
      if (rowCount === 0) return false;

      for (let i = 0; i < rowCount; i++) {
        const row = this.orders.table.rows.nth(i);
        const statusText = (await row.innerText()).toLowerCase();
        if (!statusText.includes(status.toLowerCase())) continue;
        // The Staff column (3rd) lists every staff on the order, comma-separated — rule out
        // single-staff orders here instead of opening each one's edit dialog, which is slow
        // enough to blow the test timeout on a store full of single-staff orders.
        const minStaff = opts.staffCount ?? 0;
        if (minStaff > 1) {
          const staffCell = await row.getByRole('cell').nth(2).innerText();
          if (staffCell.split(',').filter((s) => s.trim()).length < minStaff) continue;
        }

        await this.openRow(row);
        if (!needsInspection) return true;

        inspected++;
        if (await this.matchesOptions(opts)) {
          if (toSkip === 0) return true;
          toSkip--;
        }
        if (inspected >= maxCandidates) return false;

        await this.returnToListing(listingUrl, pageNo);
      }

      if ((await this.orders.nextPageButton.count()) === 0) break;
      if (await this.orders.nextPageButton.isDisabled()) break;
      await this.orders.goToNextPage();
      await this.orders.waitForReady();
    }
    return false;
  }

  /** Picks the widest date preset offered (falls back to "Last 30 Days"). */
  private async widenDateRange(): Promise<void> {
    const trigger = this.orders.quickFilterCombobox;
    await trigger.click();
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: Timeouts.SHORT });
    const labels = (await options.allInnerTexts()).map((t) => t.trim());
    const preferred = ['All time', 'This Year', 'Last 365 Days', 'Last 90 Days', 'Last 30 Days'];
    const pick = preferred.find((p) => labels.some((l) => l.toLowerCase() === p.toLowerCase()));
    if (!pick) {
      await this.page.keyboard.press('Escape');
      return;
    }
    await this.clickOptionAndWait(pick);
  }

  /** Case-insensitive option pick — listing labels vary in case ("Partial refunded"). */
  private async pickFilterOption(trigger: Locator, label: string): Promise<void> {
    await trigger.click();
    await this.clickOptionAndWait(label);
  }

  private async clickOptionAndWait(label: string): Promise<void> {
    const response = this.page
      .waitForResponse((res) => res.url().includes('/orders?'), { timeout: 3_000 })
      .catch(() => undefined);
    await this.page
      .getByRole('option', { name: new RegExp(`^${escapeRegExp(label)}$`, 'i') })
      .click();
    await response;
    await this.orders.waitForReady();
  }

  private async openRow(row: Locator): Promise<void> {
    await row.click();
    await this.page.waitForURL(/\/orders\/[0-9a-z-]{8,}/i, { timeout: Timeouts.NAVIGATION });
    await this.waitForReady();
  }

  private async returnToListing(listingUrl: string, pageNo: number): Promise<void> {
    await this.page.goto(listingUrl, { waitUntil: 'domcontentloaded' });
    await this.orders.waitForReady();
    for (let p = 1; p < pageNo; p++) {
      await this.orders.goToNextPage();
      await this.orders.waitForReady();
    }
  }

  /** Opens the edit dialog (read-only), checks tip/staff requirements, then cancels it. */
  private async matchesOptions(opts: OpenOrderOptions): Promise<boolean> {
    // The card's edit button renders after the Order information card that waitForReady() keys
    // off, so an instant isVisible() would wrongly reject an editable order.
    const editable = await this.editServiceDetailsButton
      .waitFor({ state: 'visible', timeout: Timeouts.SHORT })
      .then(() => true)
      .catch(() => false);
    if (!editable) return false;
    if (opts.withCustomer && (await this.readCustomer()) === null) return false;
    if (opts.withStoreItem && (await this.storeGroup()) === null) return false;
    await this.openEditServiceDialog();
    let ok = true;
    if (opts.withTip) ok = ok && (await this.tipSplitTabs.isVisible());
    if (opts.withStaffRows) ok = ok && (await this.changeStaffButtons.count()) >= 1;
    if (opts.withMultiServiceStaff && ok) {
      let found = false;
      for (const staff of await this.staffNames()) {
        const editable = await this.groupByStaff(staff)
          .getByRole('textbox', { name: 'Service name' })
          .evaluateAll((els) => els.filter((e) => !(e as HTMLInputElement).disabled).length);
        if (editable >= 2) found = true;
      }
      ok = found;
    }
    if (opts.staffCount && opts.staffCount > 1) {
      ok = ok && (await this.changeStaffButtons.count()) >= opts.staffCount;
    }
    await this.closeEditServiceDialog();
    return ok;
  }

  // ---------------------------------------------------------------------------
  // Dialog actions (all read-only)
  // ---------------------------------------------------------------------------

  async openEditServiceDialog(): Promise<void> {
    await this.editServiceDetailsButton.click();
    await expect(this.editServiceDialog).toBeVisible({ timeout: Timeouts.MEDIUM });
    await expect(this.staffAndServicesHeading).toBeVisible();
    // Service rows render after the heading; reading the dialog earlier sees no staff/rows.
    await expect(this.serviceNameInputs.or(this.storeNotEditable).first()).toBeVisible({
      timeout: Timeouts.MEDIUM,
    });
  }

  async closeEditServiceDialog(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.editServiceDialog).toBeHidden({ timeout: Timeouts.SHORT });
  }

  async openEditCustomerDialog(): Promise<void> {
    await this.editCustomerButton.click();
    await expect(this.customerDialog).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  /** Whether both edit entry points (A2) are present on the detail page. */
  async hasEditButtons(): Promise<{ customer: boolean; service: boolean }> {
    return {
      customer: (await this.editCustomerButton.count()) > 0,
      service: (await this.editServiceDetailsButton.count()) > 0,
    };
  }

  /**
   * Group container for a staff, keyed by the text of its "Change staff for this group" button
   * (the staff name, or "Select staff" for a freshly added group).
   */
  groupByStaff(name: string): Locator {
    const button = this.changeStaffButtons.filter({
      hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`),
    });
    return button.locator('xpath=ancestor::*[.//input or contains(., "No service yet")][1]');
  }

  /** "<N> service(s) · $x.xx" (or "0 services") summary inside a staff group. */
  groupSummary(name: string): Locator {
    return this.groupByStaff(name)
      .getByText(/\d+ services?/)
      .first();
  }

  /** Staff names, read off the group buttons in DOM order. */
  async staffNames(): Promise<string[]> {
    return (await this.changeStaffButtons.allInnerTexts()).map((t) => t.trim());
  }

  serviceRow(index: number): Locator {
    return this.serviceRows.nth(index);
  }

  /** Item in an open menu (e.g. Staff actions: "Select all services", "Remove staff"). */
  menuItem(name: string | RegExp): Locator {
    return this.page.getByRole('menuitem', { name });
  }

  /** Item in an open picker (Move to…, Change staff for this group, Change service). */
  pickerOption(name: string | RegExp): Locator {
    return this.page
      .getByRole('option', { name })
      .or(this.page.getByRole('menuitem', { name }))
      .first();
  }

  /** Checks `Select service` on the given rows. */
  async selectServices(...indexes: number[]): Promise<void> {
    for (const i of indexes) await this.selectServiceCheckboxes.nth(i).check();
  }

  /** Moves the currently checked rows to `staff` via the "Move to…" picker (dialog-local only). */
  async moveSelectedTo(staff: string): Promise<void> {
    await this.moveToButton.click();
    // The picker lists every staff of the store, not just the order's, so the target is often
    // scrolled out of the rendered list — narrow it with the picker's search box first.
    await this.staffSearchInput.fill(staff);
    await this.pickerOption(new RegExp(`^${escapeRegExp(staff)}$`)).click();
  }

  async openStaffActions(groupIndex = 0): Promise<void> {
    await this.staffActionsButtons.nth(groupIndex).click();
  }

  // --- Tip ---

  tipTab(method: TipSplitMethod): Locator {
    return this.tipSplitTabs.getByRole('tab', { name: method, exact: true });
  }

  async selectTipSplit(method: TipSplitMethod): Promise<void> {
    await this.tipTab(method).click();
    await expect(this.tipTab(method)).toHaveAttribute('aria-selected', 'true');
  }

  /** `Tip amount for <Staff>` input (textbox on DEV; spinbutton tolerated). Dynamic label. */
  tipAmountInput(staff: string): Locator {
    const name = `Tip amount for ${staff}`;
    return this.editServiceDialog
      .getByRole('textbox', { name, exact: true })
      .or(this.editServiceDialog.getByRole('spinbutton', { name, exact: true }));
  }

  async readTotalTip(): Promise<number> {
    return parseMoney((await this.totalTip.innerText()).replace(/Total tip/i, ''));
  }

  async readServicesTotal(): Promise<number> {
    return parseMoney((await this.servicesTotal.innerText()).replace(/Services total/i, ''));
  }

  // --- Save / confirm (never confirms) ---

  /** Clicks `Save changes` to reveal the confirm popup. Caller MUST then {@link dismissConfirmPopup}. */
  async openConfirmPopup(): Promise<void> {
    await expect(this.saveChangesButton).toBeEnabled();
    await this.saveChangesButton.click();
    await expect(this.confirmPopup).toBeVisible({ timeout: Timeouts.SHORT });
  }

  /** Clicks the popup's `Cancel` — popup closes, edit dialog stays open. */
  async dismissConfirmPopup(): Promise<void> {
    await this.confirmCancelButton.click();
    await expect(this.confirmPopup).toBeHidden({ timeout: Timeouts.SHORT });
  }

  // ---------------------------------------------------------------------------
  // Real saves (only for specs that are allowed to change DEV data and revert it)
  // ---------------------------------------------------------------------------

  /** Toast shown after a successful save. */
  get updatedToast(): Locator {
    return this.page.getByText('Order updated — no amount changed');
  }

  /**
   * `Save changes` → `Confirm update` for real: waits for `PUT /orders/{id}/items` and for the
   * dialog to close. Returns the request body and response status. MUTATES THE ORDER.
   */
  async saveAndConfirm(): Promise<{ status: number; body: Record<string, unknown> }> {
    await this.openConfirmPopup();
    const response = this.page.waitForResponse(
      (r) => r.request().method() === 'PUT' && /\/orders\/[^/]+\/items/.test(r.url()),
      { timeout: Timeouts.NAVIGATION },
    );
    await this.confirmUpdateButton.click();
    const res = await response;
    await expect(this.editServiceDialog).toBeHidden({ timeout: Timeouts.MEDIUM });
    return { status: res.status(), body: JSON.parse(res.request().postData() ?? '{}') };
  }

  /** Reloads the detail page and waits until it is ready again. */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForReady();
    await expect(this.serviceDetailsCard).toBeVisible();
  }

  // ---------------------------------------------------------------------------
  // Reading the detail page (text based — the cards have no structured markup)
  // ---------------------------------------------------------------------------

  private async lines(): Promise<string[]> {
    return (await this.page.locator('body').innerText())
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  /** Lines of one card, from its title up to (not including) the next card title. */
  private async cardLines(title: string, nextTitles: string[]): Promise<string[]> {
    const all = await this.lines();
    const start = all.indexOf(title);
    if (start < 0) return [];
    const rest = all.slice(start + 1);
    const end = rest.findIndex((l) => nextTitles.includes(l));
    return end < 0 ? rest : rest.slice(0, end);
  }

  /** Order summary card: Subtotal / Discount / Tax / Tip / Total. */
  async readOrderSummary(): Promise<OrderSummary> {
    const lines = await this.cardLines('Order summary', ['Tip breakdown', 'Split tip']);
    const after = (label: string): number => {
      const i = lines.indexOf(label);
      const money = lines.slice(i + 1).find((l) => /^-?\$[\d,]+\.\d{2}$/.test(l));
      return i < 0 || !money ? NaN : parseMoney(money);
    };
    return {
      subtotal: after('Subtotal'),
      discount: after('Discount'),
      tax: after('Tax'),
      tip: after('Tip'),
      total: after('Total'),
    };
  }

  /** Tip breakdown on the detail page, staff → amount. */
  async readTipBreakdown(): Promise<Record<string, number>> {
    const lines = await this.cardLines('Tip breakdown', ['Total tip']);
    const shares: Record<string, number> = {};
    for (let i = 0; i + 1 < lines.length; i += 2) shares[lines[i]] = parseMoney(lines[i + 1]);
    return shares;
  }

  /** Service details card: one entry per staff group with its services and prices. */
  async readServiceGroups(): Promise<ServiceGroup[]> {
    const lines = await this.cardLines('Service details', ['Payment details']);
    const start = lines.indexOf('Price') + 1;
    const end = lines.indexOf('Items subtotal');
    const body = lines.slice(start, end < 0 ? undefined : end);
    const groups: ServiceGroup[] = [];
    for (let i = 0; i < body.length;) {
      // Staff groups read "N service(s)"; the Store group reads "N item(s)".
      const count = Number(body[i + 1]?.match(/^(\d+) (services?|items?)$/)?.[1] ?? NaN);
      if (Number.isNaN(count)) {
        i++;
        continue;
      }
      const services = [];
      for (let k = 0; k < count; k++) {
        services.push({ name: body[i + 2 + k * 2], price: parseMoney(body[i + 3 + k * 2]) });
      }
      groups.push({ staff: body[i], services });
      i += 2 + count * 2;
    }
    return groups;
  }

  /** The group of store-sold lines (no staff), or null when the order has none. */
  async storeGroup(): Promise<ServiceGroup | null> {
    const groups = await this.readServiceGroups();
    return groups.find((g) => /^(store|no staff|unassigned|—)$/i.test(g.staff)) ?? null;
  }

  /** Order note on the Order information card ('' when none). */
  async readOrderNote(): Promise<string> {
    const lines = await this.cardLines('Order information', ['Service details']);
    const note = lines[lines.indexOf('Order note') + 1] ?? '';
    return note === 'No note is available.' ? '' : note;
  }

  /** Customer on the Order information card, or null when none is attached. */
  async readCustomer(): Promise<string | null> {
    const lines = await this.cardLines('Order information', ['Service details']);
    const value = lines[lines.indexOf('Customer') + 1] ?? '';
    return !value || /No customer is available/i.test(value) ? null : value;
  }

  /** "N payment(s)" on the Payment details card. */
  async readPaymentCount(): Promise<number> {
    const lines = await this.cardLines('Payment details', ['Activity log']);
    return Number(lines[0]?.match(/^(\d+) payments?$/)?.[1] ?? NaN);
  }

  /** Text of the Activity log card (newest entries are at the end). */
  async readActivityLog(): Promise<string> {
    // Entries load after the page; the "Times in UTC…" caption shows once they are in.
    await expect(this.page.getByText(/Times in UTC/)).toBeVisible({ timeout: Timeouts.MEDIUM });
    return (await this.cardLines('Activity log', ['Order summary'])).join('\n');
  }

  /**
   * Puts the tip split back to exactly `shares` (staff → amount) via Manual. Moving services
   * between staff re-splits the tip, so specs that move services call this to clean up.
   */
  async restoreTipShares(shares: Record<string, number>): Promise<void> {
    await this.reload();
    if (Object.keys(shares).length === 0) return;
    const current = await this.readTipBreakdown();
    const same = Object.entries(shares).every(
      ([s, v]) => Math.abs((current[s] ?? NaN) - v) < 0.005,
    );
    if (same) return;
    await this.openEditServiceDialog();
    await this.selectTipSplit('Manual');
    for (const staff of await this.staffNames()) {
      await this.tipAmountInput(staff).fill((shares[staff] ?? 0).toFixed(2));
    }
    if (await this.saveChangesButton.isEnabled()) await this.saveAndConfirm();
    else await this.closeEditServiceDialog();
  }
}
