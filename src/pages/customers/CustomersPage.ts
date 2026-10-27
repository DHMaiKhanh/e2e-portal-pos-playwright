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
    // Since the 2026-10-13 design-system refactor (verified 2026-10-20) the tab
    // panels are `[role=tabpanel][data-slot="pos-tabs-content"]`, the pager is
    // `navigation "Pagination"` (range "1–30 of 16,803", indicator "1 / 561",
    // "Previous page"/"Next page"), and the group filter is a chip button whose
    // accessible name is "Group" (or "Group: <name>" once a group is picked).
    this.activePanel = page.locator('[role="tabpanel"][data-state="active"]');
    this.table = new DataTable(page, this.activePanel.getByRole('table'));
    this.pagination = new Pagination(
      page,
      this.activePanel.getByRole('navigation', { name: 'Pagination' }),
    );
    this.searchInput = page.getByPlaceholder(/search by name, phone/i);
    this.groupFilter = page.locator('[data-slot="customer-filters-group"]');
    this.resultsFooter = this.activePanel.locator('[data-slot="pos-pagination-range"]');
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
    // Typing debounces a GET to the data host (the debounce is longer than the
    // old fixed 400ms sleep, so callers were reading the rows from *before* the
    // search). Wait for that response and then for the table to re-render, so
    // every caller observes the results for THIS term, not a stale page or a
    // mid-flight loading skeleton.
    const settled = this.page
      .waitForResponse(
        (res) =>
          new URL(res.url()).pathname.endsWith('/customers') && res.request().method() === 'GET',
        { timeout: Timeouts.MEDIUM },
      )
      .catch(() => undefined);
    await this.searchInput.fill(term);
    await settled;
    await this.waitForReady();
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
    await this.page.waitForTimeout(400);
  }

  async openGroupFilter(): Promise<void> {
    await this.groupFilter.click();
  }

  /** The group-filter chip once `label` is selected (accessible name "Group: <label>"). */
  groupFilterButtonWithLabel(label: string): Locator {
    return this.page.getByRole('button', { name: `Group: ${label}`, exact: true });
  }

  /** The chip's "x" that clears the selected group (replaces the old "All Groups" option). */
  get clearGroupButton(): Locator {
    return this.page.getByRole('button', { name: 'Clear group filter' });
  }

  async selectGroup(name: string): Promise<void> {
    await this.openGroupFilter();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async openCustomerRow(text: string): Promise<void> {
    await this.table.rowContaining(text).click();
  }

  get pageIndicator(): Locator {
    return this.activePanel.locator('[data-slot="pos-pagination-page"]');
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
    // The visible empty state ("No matching results") sits below the table since
    // the 2026-10-13 refactor; the old in-table `[data-slot="empty"]` row is now zero-size.
    return this.activePanel.locator('[data-slot="pos-empty-state"]');
  }

  get pageTitle(): Locator {
    return this.page.getByRole('heading', { level: 1, name: /^customers$/i });
  }

  /**
   * The list masks phones to their last four digits. The cell renders
   * `img "Phone ending in 4533"` with visible text "••• ••• 4533".
   */
  static readonly MASKED_PHONE = /^•{3} •{3} \d{4}$/;

  /** Last four phone digits of a row's PHONE cell, read from its accessible label. */
  async phoneSuffix(row: Locator): Promise<string> {
    const label =
      (await row
        .getByRole('cell')
        .nth(CustomersPage.Column.PHONE)
        .getByRole('img')
        .getAttribute('aria-label')) ?? '';
    return label.match(/(\d{4})$/)?.[1] ?? '';
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
    const total = Number(text.split('/')[1]?.replace(/,/g, '').trim());
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
    // The masked phone renders on two lines ("••• •••\n4533"); collapse
    // whitespace so every cell is a single-line string ("••• ••• 4533").
    return rows.map((row) => row.split('\t').map((cell) => cell.replace(/\s+/g, ' ').trim()));
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
