import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';

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

    this.pageHeading = page
      .getByRole('heading', { name: /^payroll$/i })
      .or(page.getByText(/^payroll$/i).first());

    this.checksTab = page
      .getByRole('tab', { name: /^checks$/i })
      .or(page.getByRole('link', { name: /^checks$/i }));
    this.quickBookTab = page
      .getByRole('tab', { name: /^quick book$/i })
      .or(page.getByRole('link', { name: /^quick book$/i }));
    this.staffPayrollTab = page
      .getByRole('tab', { name: /^staff payroll$/i })
      .or(page.getByRole('link', { name: /^staff payroll$/i }));
    this.bankAccountsTab = page
      .getByRole('tab', { name: /^bank accounts$/i })
      .or(page.getByRole('link', { name: /^bank accounts$/i }));
    this.checkHistoryTab = page
      .getByRole('tab', { name: /^check history$/i })
      .or(page.getByRole('link', { name: /^check history$/i }));

    this.checksTable = new DataTable(page, page.getByRole('table').first());
    // All tab panels stay mounted (hidden) at once, so multiple matches exist; only one is visible.
    this.staffNameSearchInput = page.locator(
      'input[placeholder="Search by staff name..."]:visible',
    );
    // Custom select trigger; label is dynamic (shows the currently chosen option).
    this.checksSortSelect = page.getByRole('combobox', { name: /created/i }).first();
    this.checksDatePresetSelect = page.getByRole('combobox', { name: /all dates/i }).first();
    this.pickDateRangeButton = page.getByRole('button', { name: /pick a date range/i });
    this.addStaffButton = page.getByRole('button', { name: /add staff/i });
    this.editSignatureButton = page.getByRole('button', { name: /edit signature/i });
    this.selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
    this.checksEmptyState = page.getByText(/no checks found\.?/i);

    this.previousPageButton = page.getByRole('button', { name: /previous/i });
    this.nextPageButton = page.getByRole('button', { name: /^next$/i });
    // All tab panels stay mounted (hidden) at once, so multiple matches exist; only one is visible.
    this.paginationSummary = page
      .getByText(/showing \d+ to \d+ of \d+ results/i)
      .and(page.locator(':visible'));
    this.pageIndicator = page.getByText(/^\s*\d+\s*\/\s*\d+\s*$/).and(page.locator(':visible'));

    // Combobox has no accessible name; "Select bank account" is its displayed value, so filter on text.
    this.selectBankAccountCombobox = page
      .getByRole('combobox')
      .filter({ hasText: /select bank account/i });
    this.endingBalanceText = page.getByText(/ending balance:?\s*\$[\d,]+\.\d{2}/i);
    // Accessible name is "PAY TO THE ORDER OF"; "Select staff" is its displayed value.
    this.selectStaffCombobox = page.getByRole('combobox', { name: /pay to the order of/i });
    this.amountInput = page.getByPlaceholder('$0.00');
    this.memoTextarea = page.getByPlaceholder(/enter memo/i);
    this.createCheckButton = page.getByRole('button', { name: /^create$/i });

    this.staffPayrollTable = new DataTable(page, page.getByRole('table').first());
    // Dynamic label showing the selected period's date range, e.g. "Jun 30, 2026 - Jun 30, 2026".
    this.payPeriodCombobox = page.getByRole('combobox', { name: /\d{4}/ });
    this.createPayPeriodButton = page.getByRole('button', { name: /^create( new)?$/i });
    this.noPayrollPeriodsMessage = page.getByText(/no payroll periods available/i);
    this.noStaffSelectedMessage = page.getByText(/no staff selected/i);

    this.bankAccountsTable = new DataTable(page, page.getByRole('table').first());
    this.bankSearchInput = page.getByPlaceholder(/search by bank or account name/i);
    this.createNewBankAccountButton = page.getByRole('button', { name: /create new/i });
    // Also matches a "No bank accounts" combobox placeholder elsewhere on the page; be specific.
    this.noBankAccountsMessage = page.getByText(/no bank accounts found\.?/i);

    this.checkHistoryTable = new DataTable(page, page.getByRole('table').first());
    // These comboboxes have no accessible name; "All statuses"/"All dates" is their displayed value.
    // All tab panels stay mounted (hidden) at once, so multiple matches can exist; only one is visible.
    this.historyStatusSelect = page
      .getByRole('combobox')
      .filter({ hasText: /all statuses/i })
      .and(page.locator(':visible'));
    this.historyDatePresetSelect = page
      .getByRole('combobox')
      .filter({ hasText: /all dates/i })
      .and(page.locator(':visible'));
    this.noCheckSelectedMessage = page.getByText(/no check selected/i);
  }

  async waitForReady(): Promise<void> {
    await expect(this.pageHeading).toBeVisible();
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0);
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
    await row.getByRole('button', { name: /print/i }).click();
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
      .getByRole('button', { name: /^edit$/i })
      .click();
  }

  async deleteBankAccount(bankName: string): Promise<void> {
    await this.bankAccountRow(bankName)
      .getByRole('button', { name: /^delete$/i })
      .click();
  }

  /** BANK LINK cell for a row, rendered as a clickable URL. */
  bankLinkFor(bankName: string): Locator {
    return this.bankAccountRow(bankName).getByRole('link');
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
