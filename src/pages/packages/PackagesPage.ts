import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Pagination } from '@components/Pagination';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { blockMutations } from '@helpers/writeGuard';

/**
 * Column order of the packages table, as rendered (from docs 16-packages.md).
 * `getByRole('cell').nth(...)` reads one column.
 */
export const PackageColumn = {
  PACKAGE: 0,
  DESCRIPTION: 1,
  ENABLED_FEATURES: 2,
  LAST_UPDATED: 3,
} as const;

/** Header labels, in order — asserted by the layout cases. */
export const PACKAGE_COLUMNS = [
  'Package',
  'Description',
  'Enabled features',
  'Last updated',
] as const;

/**
 * Packages (POS package catalogue — Internal) list screen.
 *
 * An admin route, NOT store-scoped: `/pos/<seg>/admin/packages`. It lists every
 * POS package (the three fixed GO POS BASIC/DELUXE/PREMIUM plus test/clone
 * packages). Each row has an Actions menu (Edit, Clone package); the toolbar has
 * an "Add package" button. Opening a package Edit shows Configuration / Audit
 * log tabs with a per-feature matrix and a "Save changes" bar.
 *
 * SAFETY: cloning, creating or editing a package is a cross-merchant write.
 * Call {@link blockWrites} before `goto()` so any accidental Save/Clone/Create
 * is aborted and recorded instead of hitting the backend.
 */
export class PackagesPage extends BasePage {
  protected readonly path = Urls.PACKAGES;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly pagination: Pagination;
  readonly searchInput: Locator;
  readonly resultsFooter: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.pagination = new Pagination(page, page.getByRole('navigation', { name: 'Pagination' }));
    this.searchInput = page.getByPlaceholder(/search packages/i);
    this.resultsFooter = page.locator('[data-slot="pos-pagination-range"]');
  }

  async waitForReady(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.table.rows.first().or(this.emptyState)).toBeVisible();
  }

  get pageTitle(): Locator {
    return this.page.getByRole('heading', { level: 1, name: /packages/i });
  }

  get pageHeader(): Locator {
    return this.page.locator('[data-slot="pos-page-header"]');
  }

  /** Placeholder shown when nothing matches the filter. */
  get emptyState(): Locator {
    return this.page.locator('[data-slot="pos-data-table-empty"]');
  }

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  /** "Add package" — a header link to the create page (was a button). */
  get addPackageButton(): Locator {
    return this.page
      .getByRole('link', { name: /add package/i })
      .or(this.page.getByRole('button', { name: /add package/i }))
      .first();
  }

  /** The list screen dropped its search box (seen 2026-10-26); search specs guard on this. */
  async hasSearch(): Promise<boolean> {
    return (await this.searchInput.count()) > 0;
  }

  /** The row-level "⋯" Actions menu trigger for a given row (defaults to first). */
  rowActions(rowIndex = 0): Locator {
    return this.table.rows.nth(rowIndex).getByRole('button', { name: /actions|more|open menu/i });
  }

  /** "Enabled features" cell text of a row, e.g. "9 / 62". */
  enabledFeatures(rowIndex = 0): Locator {
    return this.table.rows.nth(rowIndex).getByRole('cell').nth(PackageColumn.ENABLED_FEATURES);
  }

  /** Every visible package name, top to bottom. */
  async packageNames(): Promise<string[]> {
    const rows = await this.table.rows.all();
    const names: string[] = [];
    for (const row of rows) {
      names.push(
        ((await row.getByRole('cell').nth(PackageColumn.PACKAGE).textContent()) ?? '').trim(),
      );
    }
    return names;
  }

  /** Total result count parsed out of the range label "X–Y of Z". */
  async totalResults(): Promise<number> {
    const text = (await this.resultsFooter.first().textContent()) ?? '';
    return Number(text.match(/of (\d+)/i)?.[1] ?? NaN);
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(1_500);
  }

  /**
   * Abort any package create/clone/update and return the live recorder array.
   * Call BEFORE navigating.
   */
  async blockWrites(): Promise<string[]> {
    return blockMutations(this.page, (url) =>
      /\/(packages|package)(\/|\?|$)/i.test(url.pathname + url.search),
    );
  }
}
