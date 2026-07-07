import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';

/** Orders list/management screen. */
export class OrdersPage extends BasePage {
  protected readonly path = Urls.ORDERS;

  readonly table: DataTable;
  readonly searchInput: Locator;
  readonly createButton: Locator;
  readonly statusFilter: Locator;

  constructor(page: Page) {
    super(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.searchInput = page.getByPlaceholder(/search orders?/i);
    this.createButton = page.getByRole('button', { name: /new order|create/i });
    this.statusFilter = page.getByRole('combobox', { name: /status/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.keyboard.press('Enter');
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption({ label: status });
  }

  async openOrder(orderNumber: string): Promise<void> {
    await this.table.rowContaining(orderNumber).click();
    await this.page.waitForURL(new RegExp(`/orders/`));
  }

  async rowCount(): Promise<number> {
    return this.table.rowCount();
  }
}
