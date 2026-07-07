import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';

/** Customers management screen. */
export class CustomersPage extends BasePage {
  protected readonly path = Urls.CUSTOMERS;

  readonly table: DataTable;
  readonly searchInput: Locator;
  readonly addButton: Locator;

  constructor(page: Page) {
    super(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.searchInput = page.getByPlaceholder(/search customers?/i);
    this.addButton = page.getByRole('button', { name: /add customer|create/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.keyboard.press('Enter');
  }

  async findByPhone(phone: string): Promise<Locator> {
    await this.search(phone);
    return this.table.rowContaining(phone);
  }
}
