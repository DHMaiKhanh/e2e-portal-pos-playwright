import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Pagination } from '@components/Pagination';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';

/**
 * Monitoring › Change Logs — `/pos/<seg>/admin/histories`.
 *
 * The system-wide entity-history feed (hundreds of thousands of entries), grouped
 * by day ("Today"), with filters Merchant / Entity type / Operation / Channel /
 * time range and pagination. A row expands to a detail with a Field / Before /
 * After table. It is a read-only audit log — there is nothing to mutate here, so
 * no write-guard is needed.
 *
 * Note: the pagination counts *entries*, while visible rows are grouped changes,
 * so "30 entries" can render as far fewer rows (documented in docs 20-monitoring.md).
 */
export class ChangeLogsPage extends BasePage {
  protected readonly path = Urls.CHANGE_LOGS;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly pagination: Pagination;
  readonly merchantFilter: Locator;
  readonly entityTypeFilter: Locator;
  readonly operationFilter: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.pagination = new Pagination(page, page.getByRole('navigation', { name: 'Pagination' }));
    this.merchantFilter = page
      .getByRole('button', { name: /filter by merchant|merchant/i })
      .first();
    this.entityTypeFilter = page
      .getByRole('button', { name: /entity type|filter by entity/i })
      .first();
    this.operationFilter = page.getByRole('button', { name: /operation/i }).first();
  }

  async waitForReady(): Promise<void> {
    await expect(this.pageHeader.first()).toBeVisible();
    await expect(
      this.entries.first().or(this.page.locator('[data-slot="empty"]:visible')).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * One button per grouped change, inside a per-day region ("Today", …). The feed
   * replaced the old <table>; each entry expands to its Field / Before / After detail.
   */
  get entries(): Locator {
    return this.page
      .getByRole('region')
      .filter({ has: this.page.getByRole('heading', { level: 3 }) })
      .getByRole('button')
      .filter({ has: this.page.locator('time') });
  }

  get pageHeader(): Locator {
    return this.page.locator('[data-slot="pos-page-header"]');
  }

  get resultsFooter(): Locator {
    return this.page.locator('[data-slot="pos-pagination-range"]');
  }

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  /** Total entry count parsed out of the range label "X–Y of Z". */
  async totalEntries(): Promise<number> {
    const text =
      (await this.resultsFooter
        .first()
        .textContent()
        .catch(() => '')) ?? '';
    return Number(text.match(/of ([\d,]+)/i)?.[1]?.replace(/,/g, '') ?? NaN);
  }

  async gotoWithQuery(query: Record<string, string>): Promise<void> {
    const search = new URLSearchParams(query).toString();
    await this.page.goto(`${this.path}?${search}`, { waitUntil: 'domcontentloaded' });
  }
}
