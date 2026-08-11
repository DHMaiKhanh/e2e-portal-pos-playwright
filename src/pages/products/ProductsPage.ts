import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';

/** Products / catalog management screen (a.k.a. "Services" — /pos/<id>/services). */
export class ProductsPage extends BasePage {
  protected readonly path = Urls.PRODUCTS;

  readonly table: DataTable;
  readonly searchInput: Locator;
  readonly addButton: Locator;

  // --- Page header ---------------------------------------------------------
  /** H2 "All Services" page title. */
  readonly pageTitle: Locator;
  readonly exportButton: Locator;
  readonly addCategoryButton: Locator;

  // --- Status tabs -----------------------------------------------------------
  readonly activeTab: Locator;
  readonly inactiveTab: Locator;

  // --- Area below the category list ------------------------------------------
  /** Combobox showing the selected status filter (e.g. "Active"). */
  readonly statusFilterCombobox: Locator;
  readonly manageOrderButton: Locator;
  readonly addServiceButton: Locator;

  // --- Category list container -------------------------------------------
  readonly categoryList: Locator;
  /** The "Other" category row — always pinned last, no Edit button. */
  readonly otherCategoryButton: Locator;

  // --- Table & pagination -----------------------------------------------
  readonly tableHeading: Locator;
  readonly paginationFooter: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  /** Page index text, e.g. "1 / 9". */
  readonly pageIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.searchInput = page.getByPlaceholder(/search by name/i);
    this.addButton = page.getByRole('button', { name: /add product|create/i });

    this.pageTitle = page.getByRole('heading', { name: /all services/i });
    this.exportButton = page.getByRole('button', { name: /^export$/i });
    this.addCategoryButton = page.getByRole('button', { name: /add category/i });

    this.activeTab = page.getByRole('tab', { name: /^active$/i });
    this.inactiveTab = page.getByRole('tab', { name: /^inactive$/i });

    this.statusFilterCombobox = page.getByRole('combobox', { name: /active|inactive/i });
    this.manageOrderButton = page.getByRole('button', { name: /manage order/i });
    this.addServiceButton = page.getByRole('button', { name: /add service/i });

    this.categoryList = page
      .getByRole('list', { name: /categor/i })
      .or(page.locator('[data-category-list]'));
    this.otherCategoryButton = page.getByRole('button', { name: /^other$/i });

    this.tableHeading = page
      .getByRole('table', { name: /all services/i })
      .or(page.getByRole('table'));
    this.paginationFooter = page.getByText(/showing \d+ to \d+ of \d+ results/i);
    this.previousPageButton = page.getByRole('button', { name: /^previous$/i });
    this.nextPageButton = page.getByRole('button', { name: /^next$/i });
    this.pageIndicator = page.getByText(/^\d+\s*\/\s*\d+$/);
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

  // --- Category row helpers --------------------------------------------------
  /** The clickable name button for a category row, e.g. "Artificial Nails". */
  categoryButton(name: string | RegExp): Locator {
    return this.page.getByRole('button', { name, exact: typeof name === 'string' });
  }

  /** Drag handle for a category row: "Reorder <name>". */
  categoryReorderHandle(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`reorder ${escapeRegExp(name)}`, 'i'),
    });
  }

  categoryMoveToFirstButton(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`move ${escapeRegExp(name)} to first`, 'i'),
    });
  }

  categoryMoveUpButton(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`move ${escapeRegExp(name)} up`, 'i'),
    });
  }

  categoryMoveDownButton(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`move ${escapeRegExp(name)} down`, 'i'),
    });
  }

  categoryMoveToLastButton(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`move ${escapeRegExp(name)} to last`, 'i'),
    });
  }

  /** Not present for the "Other" category. */
  categoryEditButton(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`edit ${escapeRegExp(name)}`, 'i') });
  }

  // --- Tabs -------------------------------------------------------------------
  async switchToActiveTab(): Promise<void> {
    await this.activeTab.click();
  }

  async switchToInactiveTab(): Promise<void> {
    await this.inactiveTab.click();
  }

  // --- Pagination ---------------------------------------------------------
  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
  }

  async pageIndicatorText(): Promise<string> {
    return (await this.pageIndicator.textContent())?.trim() ?? '';
  }

  async paginationFooterText(): Promise<string> {
    return (await this.paginationFooter.textContent())?.trim() ?? '';
  }

  // --- Table cell helpers (columns: NAME & DESCRIPTION, PRICE, DURATION, SUPPLY FEE, STATUS) ---
  /** Table column header cells in display order. */
  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  serviceRow(name: string): Locator {
    return this.table.rowContaining(name);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
