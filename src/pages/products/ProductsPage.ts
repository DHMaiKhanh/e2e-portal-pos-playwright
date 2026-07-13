import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';

/** Products / catalog management screen. */
export class ProductsPage extends BasePage {
  protected readonly path = Urls.PRODUCTS;

  readonly table: DataTable;
  readonly searchInput: Locator;
  readonly addButton: Locator;

  constructor(page: Page) {
    super(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.searchInput = page.getByPlaceholder(/search by name/i);
    this.addButton = page.getByRole('button', { name: /add product|create/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.keyboard.press('Enter');
  }

  async hasProduct(name: string): Promise<boolean> {
    return this.table.rowContaining(name).isVisible();
  }
}
