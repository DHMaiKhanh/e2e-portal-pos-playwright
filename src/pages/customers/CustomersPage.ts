import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Pagination } from '@components/Pagination';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';

/** Customers (Khách hàng) list screen. */
export class CustomersPage extends BasePage {
  protected readonly path = Urls.CUSTOMERS;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly pagination: Pagination;
  readonly searchInput: Locator;
  readonly groupFilter: Locator;
  readonly resultsFooter: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.pagination = new Pagination(page);
    this.searchInput = page.getByPlaceholder(/search by name, phone/i);
    this.groupFilter = page.getByRole('button', { name: /all groups/i });
    this.resultsFooter = page.getByText(/showing \d+ to \d+ of \d+ results/i);
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    const firstRowOrEmpty = this.table.rows.first().or(this.emptyState);
    await expect(firstRowOrEmpty).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(400);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
    await this.page.waitForTimeout(400);
  }

  async openGroupFilter(): Promise<void> {
    await this.groupFilter.click();
  }

  /** Locate the group-filter button by its current label (changes once a group is selected). */
  groupFilterButtonWithLabel(label: string | RegExp): Locator {
    return this.page.getByRole('button', { name: label });
  }

  async selectGroup(name: string | RegExp): Promise<void> {
    await this.openGroupFilter();
    await this.page.getByRole('option', { name }).click();
  }

  async openCustomerRow(text: string): Promise<void> {
    await this.table.rowContaining(text).click();
  }

  get pageIndicator(): Locator {
    return this.page.getByText(/^\d+\s*\/\s*\d+$/);
  }

  /** Column headers, in doc order: NAME, PHONE, EMAIL, GROUP, TOTAL VISITS, POINTS, CASHBACK BALANCE, LAST VISIT. */
  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  columnHeader(name: RegExp): Locator {
    return this.page.getByRole('table').getByRole('columnheader', { name });
  }

  /** Empty-state text shown when the table has zero matching rows. */
  get emptyState(): Locator {
    return this.page.locator('[data-slot="empty"]');
  }

  get pageTitle(): Locator {
    return this.page.getByText(/^customers$/i).first();
  }

  async findByPhone(phone: string): Promise<Locator> {
    await this.search(phone);
    return this.table.rowContaining(phone);
  }
}
