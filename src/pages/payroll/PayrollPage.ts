import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Payroll screen — 5 tabs (Checks, Quick Book, Staff Payroll, Bank Accounts,
 * Check History), each with its own filters/pagination state reflected via
 * the `?tab=` (and `page`/`periodId`) query params.
 */
export class PayrollPage extends BasePage {
  protected readonly path = Urls.PAYROLL;

  // --- Page header / layout ---
  readonly pageHeading: Locator;

  // --- Sub-nav tabs ---
  readonly checksTab: Locator;
  readonly quickBookTab: Locator;
  readonly staffPayrollTab: Locator;
  readonly bankAccountsTab: Locator;
  readonly checkHistoryTab: Locator;

  // --- Checks tab ---
  readonly checksTable: DataTable;
  /** Shared across Checks / Staff Payroll / Check History tabs. */
  readonly staffNameSearchInput: Locator;
  /** Sort/column select, default "Created". */
  readonly checksSortSelect: Locator;
  /** Date-range preset select, default "All dates". */
  readonly checksDatePresetSelect: Locator;
  readonly pickDateRangeButton: Locator;
  readonly addStaffButton: Locator;
  readonly editSignatureButton: Locator;
  readonly selectAllCheckbox: Locator;
  readonly checksEmptyState: Locator;

  // --- Pagination (shared shape across tabs) ---
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  /** Text like "Showing 1 to 10 of 42 results". */
  readonly paginationSummary: Locator;
  /** Text like "1 / 2" between the Previous/Next buttons. */
  readonly pageIndicator: Locator;

  // --- Quick Book tab ---
  readonly selectBankAccountCombobox: Locator;
  /** Text like "Ending Balance: $0.00". */
  readonly endingBalanceText: Locator;
  readonly selectStaffCombobox: Locator;
  readonly amountInput: Locator;
  readonly memoTextarea: Locator;
  readonly createCheckButton: Locator;

  // --- Staff Payroll tab ---
  readonly staffPayrollTable: DataTable;
  /** Pay-period range combobox, e.g. "Jun 30, 2026 - Jun 30, 2026". */
  readonly payPeriodCombobox: Locator;
  readonly createPayPeriodButton: Locator;
  readonly noPayrollPeriodsMessage: Locator;
  readonly noStaffSelectedMessage: Locator;

  // --- Bank Accounts tab ---
  readonly bankAccountsTable: DataTable;
  readonly bankSearchInput: Locator;
  readonly createNewBankAccountButton: Locator;
  readonly noBankAccountsMessage: Locator;

  // --- Check History tab ---
  readonly checkHistoryTable: DataTable;
  readonly historyStatusSelect: Locator;
  readonly historyDatePresetSelect: Locator;
  readonly noCheckSelectedMessage: Locator;

  constructor(page: Page) {
    super(page);

    // 2026-10 design system: the page title is the `#pos-main` banner's h1. A
    // page-wide `getByText('Payroll')` also hits the sidebar link and breadcrumb.
    this.pageHeading = page
      .locator('#pos-main')
      .getByRole('heading', { level: 1, name: /^payroll$/i });

    this.checksTab = page.getByRole('tab', { name: /^checks$/i });
    this.quickBookTab = page.getByRole('tab', { name: /^quick book$/i });
    this.staffPayrollTab = page.getByRole('tab', { name: /^staff payroll$/i });
    this.bankAccountsTab = page.getByRole('tab', { name: /^bank accounts$/i });
    this.checkHistoryTab = page.getByRole('tab', { name: /^check history$/i });

    /**
     * Each tab's table, identified by a column header unique to it.
     *
     * Inactive tab panels stay mounted (hidden, full of skeleton rows), so a
     * bare `getByRole('table').first()` can resolve to another tab's table.
     * Keying on a header the tab owns and filtering to the visible one is
     * unambiguous.
     */
    const tableWithHeader = (header: RegExp): Locator =>
      page
        .locator('table')
        .filter({ has: page.getByRole('columnheader', { name: header }) })
        .filter({ visible: true })
        .first();

    this.checksTable = new DataTable(page, tableWithHeader(/check amount/i));
    this.staffNameSearchInput = page.locator(
      'input[placeholder="Search by staff name..."]:visible',
    );
    // Status filter chip ("Check status: Created"), opening a listbox of
    // Created / Printed / Voided / Deleted / Archived. Its value is in the URL
    // (`status=`), so it never leaks between tests.
    this.checksSortSelect = page
      .getByRole('button', { name: /^check status/i })
      .filter({ visible: true })
      .first();
    // Date filter trigger: shows "All dates" or the chosen preset; opens a
    // dialog with a "Presets" listbox and a range calendar.
    this.checksDatePresetSelect = page
      .locator('button[data-slot="popover-trigger"][data-pos-filter]')
      .filter({ visible: true })
      .first();
    this.pickDateRangeButton = this.checksDatePresetSelect;
    // The old "Add Staff" button became the header "Create check" button,
    // which opens the "Create checks" (bulk, per payroll period) dialog.
    this.addStaffButton = page
      .locator('#pos-main')
      .getByRole('banner')
      .getByRole('button', { name: /^create check$/i });
    this.editSignatureButton = page.getByRole('button', { name: /^edit signature$/i });
    this.selectAllCheckbox = page
      .getByRole('checkbox', { name: /select all/i })
      .filter({ visible: true })
      .first();
    this.checksEmptyState = page
      .locator('[data-slot="pos-empty-state-title"]:visible')
      .filter({ hasNotText: /^No check selected$/ })
      .first();

    const pagination = page
      .getByRole('navigation', { name: 'Pagination' })
      .filter({ visible: true })
      .first();
    this.previousPageButton = pagination.getByRole('button', { name: /^previous page$/i });
    this.nextPageButton = pagination.getByRole('button', { name: /^next page$/i });
    // Range text like "1–30 of 64" (en dash). The pager is not rendered at all
    // when the result set is empty.
    this.paginationSummary = pagination.getByText(/^\d+\s*[–-]\s*\d+ of \d+$/);
    // Text like "1 / 3" between the Previous/Next buttons.
    this.pageIndicator = pagination.getByText(/^\s*\d+\s*\/\s*\d+\s*$/);

    this.selectBankAccountCombobox = page.getByRole('combobox', { name: /^bank account$/i });
    // "Ending balance" label + `[data-slot="pos-money"]` value in one row.
    this.endingBalanceText = page.getByText(/^ending balance$/i).locator('xpath=..');
    this.selectStaffCombobox = page.getByRole('combobox', { name: /^pay to$/i });
    this.amountInput = page.getByRole('textbox', { name: /^amount$/i });
    this.memoTextarea = page.getByRole('textbox', { name: /^memo$/i });
    // The Quick book tab's submit — distinct from the Checks header button of
    // the same name, which only exists on the Checks tab. The 2026-10 redesign
    // dropped the <form> wrapper, so scope to the active tabpanel directly.
    this.createCheckButton = page
      .getByRole('tabpanel')
      .getByRole('button', { name: /^create check$/i });

    this.staffPayrollTable = new DataTable(page, tableWithHeader(/total income/i));
    // Pay-period combobox, e.g. "Oct 16, 2026 - Oct 20, 2026 - Current Period
    // (Unclosed)". Shows "No payroll periods available" (disabled) while the
    // period list is still loading.
    this.payPeriodCombobox = page
      .getByRole('combobox', { name: /payroll period/i })
      .filter({ visible: true })
      .first();
    this.createPayPeriodButton = page.getByRole('button', { name: /^create( new)?$/i });
    this.noPayrollPeriodsMessage = page.getByText(/no payroll periods available/i);
    this.noStaffSelectedMessage = page.getByText(/no staff selected/i);

    this.bankAccountsTable = new DataTable(page, tableWithHeader(/routing number/i));
    this.bankSearchInput = page.getByRole('textbox', { name: /search bank or account/i });
    this.createNewBankAccountButton = page.getByRole('button', { name: /^add bank account$/i });
    this.noBankAccountsMessage = page.getByText(/no bank accounts found\.?/i);

    // Check History columns: "#", Staff name, Created at, Check (+ Memo, hidden
    // at desktop width while the detail panel is shown).
    this.checkHistoryTable = new DataTable(page, tableWithHeader(/^#$/));
    this.historyStatusSelect = page
      .getByRole('button', { name: /^check status/i })
      .filter({ visible: true })
      .first();
    this.historyDatePresetSelect = this.checksDatePresetSelect;
    this.noCheckSelectedMessage = page.getByText(/no check selected/i);
  }

  async waitForReady(): Promise<void> {
    await expect(this.pageHeading).toBeVisible({ timeout: Timeouts.NAVIGATION });
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
      timeout: Timeouts.NAVIGATION,
    });
  }

  // --- Tab navigation ---

  async goToChecksTab(): Promise<void> {
    await this.checksTab.click();
    await this.page.waitForURL(/tab=checks/);
    await this.waitForReady();
  }

  async goToQuickBookTab(): Promise<void> {
    await this.quickBookTab.click();
    await this.page.waitForURL(/tab=quick-book/);
    await this.waitForReady();
  }

  async goToStaffPayrollTab(): Promise<void> {
    await this.staffPayrollTab.click();
    await this.page.waitForURL(/tab=staff-payroll/);
    await this.waitForReady();

    // waitForReady clears the shared shell, but the staff table populates after
    // it: measured on the DEV store, rows are 0 immediately and 30 six seconds
    // later. Tests that counted rows right after this call read the empty table
    // and skipped themselves as "no staff rows available" on a store that has
    // 209. Settle on the rows here so no caller has to know that.
    //
    // The empty branch must key on the table's genuine no-data message ("No
    // payroll periods available"). The previous `/no staff/` regex also matched
    // the detail panel's ever-present "No staff selected" placeholder, so once
    // the table had rows this `.or()` resolved to *both* a row and that
    // placeholder and failed strict mode. "No payroll periods available" never
    // coexists with rows, so the two branches stay mutually exclusive.
    const rowsOrEmpty = this.staffPayrollTable.rows
      .first()
      .or(this.noPayrollPeriodsMessage.first());
    await expect(rowsOrEmpty).toBeVisible({ timeout: Timeouts.NAVIGATION });
  }

  /**
   * Wait until the Staff Payroll table actually has rows.
   *
   * `goToStaffPayrollTab` is satisfied by rows *or* an empty state, which is
   * right for cases that assert emptiness. Cases that need data have to wait
   * further: under load the period lookup occasionally comes back empty for a
   * few seconds and the screen shows "No payroll periods available" before
   * settling, which read as "this store has no payroll" if sampled once.
   */
  async waitForStaffPayrollRows(): Promise<void> {
    await expect
      .poll(async () => this.staffPayrollTable.rows.count(), {
        timeout: Timeouts.NAVIGATION,
      })
      .toBeGreaterThan(0);
  }

  async goToBankAccountsTab(): Promise<void> {
    await this.bankAccountsTab.click();
    await this.page.waitForURL(/tab=bank-account/);
    await this.waitForReady();
  }

  async goToCheckHistoryTab(): Promise<void> {
    await this.checkHistoryTab.click();
    await this.page.waitForURL(/tab=history/);
    await this.waitForReady();
  }

  /** Deep-links directly into a given tab via the `?tab=` query param. */
  async gotoTab(
    tab: 'checks' | 'quick-book' | 'staff-payroll' | 'bank-account' | 'history',
  ): Promise<void> {
    await this.page.goto(`${this.path}?tab=${tab}`, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  // --- Checks tab actions ---

  async searchStaffName(term: string): Promise<void> {
    await this.staffNameSearchInput.fill(term);
    await this.page.keyboard.press('Enter');
  }

  async clickPrintOnRow(rowIndexOrText: number | string): Promise<void> {
    const row =
      typeof rowIndexOrText === 'number'
        ? this.checksTable.rows.nth(rowIndexOrText)
        : this.checksTable.rowContaining(rowIndexOrText);
    await row.getByRole('button', { name: /^print\b/i }).click();
  }

  rowSelectCheckbox(rowIndexOrText: number | string): Locator {
    const row =
      typeof rowIndexOrText === 'number'
        ? this.checksTable.rows.nth(rowIndexOrText)
        : this.checksTable.rowContaining(rowIndexOrText);
    return row.getByRole('checkbox', { name: /select row/i });
  }

  // --- Pagination (shared) ---

  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
  }

  // --- Quick Book actions ---

  async fillQuickBookForm(opts: {
    bankAccount?: string;
    staff?: string;
    amount?: string;
    memo?: string;
  }): Promise<void> {
    if (opts.bankAccount) {
      await this.selectBankAccountCombobox.click();
      await this.page.getByRole('option', { name: opts.bankAccount, exact: true }).click();
    }
    if (opts.staff) {
      await this.selectStaffCombobox.click();
      await this.page.getByRole('option', { name: opts.staff, exact: true }).click();
    }
    if (opts.amount) {
      await this.amountInput.fill(opts.amount);
    }
    if (opts.memo) {
      await this.memoTextarea.fill(opts.memo);
    }
  }

  async submitQuickBook(): Promise<void> {
    await this.createCheckButton.click();
  }

  // --- Staff Payroll actions ---

  /** Row for a given staff name in the Staff Payroll table. */
  staffPayrollRow(name: string): Locator {
    return this.staffPayrollTable.rowContaining(name);
  }

  async selectStaffPayrollRow(name: string): Promise<void> {
    await this.staffPayrollRow(name).click();
  }

  // --- Bank Accounts actions ---

  async searchBankAccount(term: string): Promise<void> {
    await this.bankSearchInput.fill(term);
    await this.page.keyboard.press('Enter');
  }

  bankAccountRow(bankName: string): Locator {
    return this.bankAccountsTable.rowContaining(bankName);
  }

  async editBankAccount(bankName: string): Promise<void> {
    await this.bankAccountRow(bankName)
      .getByRole('button', { name: /^actions for/i })
      .click();
    await this.page.getByRole('menuitem', { name: /^edit$/i }).click();
  }

  async deleteBankAccount(bankName: string): Promise<void> {
    await this.bankAccountRow(bankName)
      .getByRole('button', { name: /^actions for/i })
      .click();
    await this.page.getByRole('menuitem', { name: /^delete/i }).click();
  }

  /** BANK LINK cell for a row, rendered as a clickable URL. */
  bankLinkFor(bankName: string): Locator {
    return this.bankAccountRow(bankName).getByRole('link');
  }

  // --- Bank account create/edit dialog ---
  //
  // "Create New" and a row's "Edit" open the same form ("Add Bank Account" /
  // "Edit Bank Account"): accountName, accountNumber + confirmAccountNumber,
  // bankName, routingNumber, bankLink, address block, contact block, an
  // "isDefault" switch, and Cancel / Save Account / Close.

  get bankAccountDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /bank account/i });
  }

  bankAccountField(name: string): Locator {
    return this.bankAccountDialog.locator(`#${name}`);
  }

  /**
   * The dialog's submit button.
   *
   * "Add Bank Account" labels it "Save Account"; the edit variant uses a
   * different wording, so match the family rather than one string.
   */
  get saveBankAccountButton(): Locator {
    return this.bankAccountDialog
      .getByRole('button', { name: /save|update/i })
      .filter({ hasNotText: /cancel|close/i })
      .first();
  }

  get cancelBankAccountButton(): Locator {
    return this.bankAccountDialog.getByRole('button', { name: /^cancel$/i });
  }

  /**
   * The delete confirmation.
   *
   * Rendered as an alertdialog, so it does not match a plain
   * `getByRole('dialog')` — matching both keeps this working either way.
   */
  get confirmDialog(): Locator {
    return this.page.getByRole('alertdialog').or(this.page.getByRole('dialog')).first();
  }

  get confirmDeleteButton(): Locator {
    return this.confirmDialog.getByRole('button', { name: /^(delete|confirm|yes|ok)$/i }).first();
  }

  /**
   * Submit a bank-account form, retrying through the Portal's lazy token
   * refresh — with an expired access token the first press is swallowed while
   * `POST /refresh_token` round-trips, showing no error at all.
   */
  async saveBankAccount(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.saveBankAccountButton.click();
      try {
        await expect(this.bankAccountDialog).toBeHidden({ timeout: Timeouts.SHORT });
        return;
      } catch {
        await this.page.waitForTimeout(1_000);
      }
    }
    await expect(this.bankAccountDialog).toBeHidden({ timeout: Timeouts.MEDIUM });
  }

  /**
   * Values in the ACCOUNT NAME column.
   *
   * Column order is BANK NAME, ACCOUNT NAME, ACCOUNT NUMBER, ROUTING NUMBER,
   * BANK LINK — so account name is the *second* cell, not the first.
   */
  async bankAccountNames(): Promise<string[]> {
    // Scoped to the visible table: every tab panel stays mounted, so
    // `getByRole('table').first()` can resolve to another tab's table and
    // report an empty list while the bank rows are on screen.
    const rows = await this.page.locator('table:visible tbody tr').allInnerTexts();
    return rows
      .map((row) => (row.split('\t')[1] ?? '').replace(/\s+/g, ' ').trim())
      .filter((name) => name.length > 0);
  }

  /**
   * Delete a bank account if it is still there — the cleanup half of the
   * create/edit/delete cases, safe to call when the account is already gone.
   */
  async removeBankAccountIfPresent(bankName: string): Promise<void> {
    await this.gotoTab('bank-account');
    if ((await this.bankAccountRow(bankName).count()) === 0) return;

    await this.deleteBankAccount(bankName);
    await this.confirmDeleteButton.click().catch(() => undefined);
    await expect
      .poll(async () => this.bankAccountNames(), { timeout: Timeouts.MEDIUM })
      .not.toContain(bankName);
  }

  // --- Check History actions ---

  /** Row for a given check in Check History, keyed on a visible text (e.g. staff name or `#46`). */
  checkHistoryRow(text: string): Locator {
    return this.checkHistoryTable.rowContaining(text);
  }

  async selectCheckHistoryRow(text: string): Promise<void> {
    await this.checkHistoryRow(text).click();
  }
}
