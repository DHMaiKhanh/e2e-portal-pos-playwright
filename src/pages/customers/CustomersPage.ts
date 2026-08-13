import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Pagination } from '@components/Pagination';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/** Customers (Khách hàng) list screen. */
export class CustomersPage extends BasePage {
  protected readonly path = Urls.CUSTOMERS;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly pagination: Pagination;
  readonly searchInput: Locator;
  readonly groupFilter: Locator;
  readonly resultsFooter: Locator;
  /**
   * The screen is a Radix Tabs ("Customers" / "Customer Groups") and BOTH panels
   * stay mounted — the inactive one is merely not visible. So every page-wide
   * locator here (table, pagination, results footer, page indicator) matches two
   * elements and trips strict mode; the second match is the other tab's own
   * table, which is why assertions saw a phantom "Showing 0 to 0 of 0 results"
   * and a phantom "1 / 1" pager next to the real ones.
   *
   * Everything table-related is therefore scoped to the ACTIVE panel.
   */
  readonly activePanel: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.activePanel = page.locator('[data-slot="tabs-content"][data-state="active"]');
    this.table = new DataTable(page, this.activePanel.getByRole('table'));
    this.pagination = new Pagination(
      page,
      this.activePanel
        .locator('div')
        .filter({ has: page.getByRole('button', { name: /^previous$/i }) })
        .last(),
    );
    this.searchInput = page.getByPlaceholder(/search by name, phone/i);
    this.groupFilter = page.getByRole('button', { name: /all groups/i });
    this.resultsFooter = this.activePanel.getByText(/showing \d+ to \d+ of \d+ results/i);
  }

  async waitForReady(): Promise<void> {
    // The real backend can be slow to respond (cold start / staging load), so
    // give these a longer margin than the default expect timeout.
    await expect(this.searchInput).toBeVisible({ timeout: Timeouts.NAVIGATION });
    const firstRowOrEmpty = this.table.rows.first().or(this.emptyState);
    await expect(firstRowOrEmpty).toBeVisible({ timeout: Timeouts.NAVIGATION });
    // The table renders a skeleton (same row/cell roles, empty text) while the
    // real page of data is still loading — wait for it to fully clear so
    // callers never read placeholder cells or a transiently-disabled pager.
    //
    // Scope to `:visible`: once loaded, the table keeps ~50 *hidden* skeleton
    // nodes mounted permanently, so an unscoped count never reaches 0 and this
    // wait would burn its full timeout on every test. The visible count does go
    // 80 -> 0 the moment real rows land, which is the signal we actually want.
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
      timeout: Timeouts.MEDIUM,
    });
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
    return this.activePanel.getByText(/^\d+\s*\/\s*\d+$/);
  }

  /** Column headers, in doc order: NAME, PHONE, EMAIL, GROUP, TOTAL VISITS, POINTS, CASHBACK BALANCE, LAST VISIT. */
  get columnHeaders(): Locator {
    return this.activePanel.getByRole('table').getByRole('columnheader');
  }

  columnHeader(name: RegExp): Locator {
    return this.activePanel.getByRole('table').getByRole('columnheader', { name });
  }

  /** Empty-state text shown when the table has zero matching rows. */
  get emptyState(): Locator {
    return this.activePanel.locator('[data-slot="empty"]');
  }

  get pageTitle(): Locator {
    return this.page.getByText(/^customers$/i).first();
  }

  async findByPhone(phone: string): Promise<Locator> {
    await this.search(phone);
    return this.table.rowContaining(phone);
  }

  /** Cell order in a row: NAME, PHONE, EMAIL, GROUP, TOTAL VISITS, POINTS, CASHBACK BALANCE, LAST VISIT. */
  static readonly Column = {
    NAME: 0,
    PHONE: 1,
    EMAIL: 2,
    GROUP: 3,
    TOTAL_VISITS: 4,
    POINTS: 5,
    CASHBACK: 6,
    LAST_VISIT: 7,
  } as const;

  /** Total pages, read from the "n / m" indicator. */
  async totalPages(): Promise<number> {
    const text = (await this.pageIndicator.textContent())?.trim() ?? '';
    const total = Number(text.split('/')[1]?.trim());
    // The indicator is part of waitForReady's settled state, so an unparseable
    // value means the screen is broken rather than merely slow — say so here
    // instead of letting a caller silently skip itself.
    expect(Number.isFinite(total) && total > 0, `Unreadable page indicator: "${text}"`).toBe(true);
    return total;
  }

  async gotoPage(pageNumber: number): Promise<void> {
    await this.page.goto(`${this.path}?tab=customers&page=${pageNumber}&orderCreatedAt=desc`, {
      waitUntil: 'domcontentloaded',
    });
    await this.waitForReady();
  }

  /** Every row on the current page, split into trimmed cell text. */
  async rowCells(): Promise<string[][]> {
    const rows = await this.table.rows.allInnerTexts();
    return rows.map((row) => row.split('\t').map((cell) => cell.trim()));
  }

  /**
   * Walk pages until a row satisfies `predicate`, returning its cells.
   *
   * Several data-formatting cases need a row of a particular shape (no name, no
   * recorded visit). Those shapes exist in the store but are not guaranteed to
   * sit on page 1, which is why the cases used to `test.skip` themselves when
   * page 1 happened not to contain one — a skip that hid the assertion instead
   * of running it. Scanning the dataset makes the check deterministic: the row
   * is either found and asserted on, or genuinely absent and the caller fails.
   */
  async findRowAcrossPages(
    predicate: (cells: string[]) => boolean,
    maxPages = 11,
  ): Promise<string[] | null> {
    const limit = Math.min(maxPages, await this.totalPages());
    for (let pageNumber = 1; pageNumber <= limit; pageNumber++) {
      if (pageNumber > 1) await this.gotoPage(pageNumber);
      const match = (await this.rowCells()).find(predicate);
      if (match) return match;
    }
    return null;
  }
}
