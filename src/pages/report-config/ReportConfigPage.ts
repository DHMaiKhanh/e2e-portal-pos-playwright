import { type Locator, type Page, type Request, type Route, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Report Configuration — the report-builder admin, four list screens under one
 * sidebar accordion (`Management` → `Report Configuration` → Pages / Blocks /
 * Sources / Columns). All four share the same shell: a `page-title` header, a
 * `filter-bar` toolbar (search + one or two Radix select filters + an "Add …"
 * button), a `<table>` whose first cell stacks NAME over a mono slug, icon-only
 * row actions (aria-label = action name) and the shared "Showing X to Y of Z
 * results" / Previous · `n / m` · Next footer. So one Page Object is
 * parameterised by screen rather than four near-identical classes.
 *
 * Facts verified on the DEV Portal (v2.dev-fastboypay.com, store 14) on
 * 2026-10-13 that shape the helpers below:
 *
 *  - Search, filter and page are written to the URL (`?search=`, `?page=`, plus
 *    `variant` / `blockKind` / `type` / `kind`) and restored on reload.
 *  - Pages and Blocks fetch the whole set once (`itemsPerPage=100`) and filter /
 *    paginate client-side; Sources and Columns query the server per change
 *    (`report_data.jsonld?name[]=…`, `report_columns.jsonld?label[]=|slug[]=…`).
 *  - Page size is fixed at 30; there is no page-size control.
 *  - Every list fetch is an XHR to the data host even on a full `goto`, so
 *    `page.route()` can stub list responses without a client-side navigation.
 *
 * SHARED LIVE DATA: this configuration drives the live report pages for every
 * user of the DEV Portal. Specs must never let a write reach the server. Use
 * `guardWrites()` (abort) or `mockWrites()` (fulfil locally + capture payload)
 * before any click that could save, and note that **Publish fires
 * `POST /report_pages/<id>/publish` on a single click with no confirmation**.
 */
export type ReportConfigScreen = 'pages' | 'blocks' | 'sources' | 'columns';

export interface ReportConfigFilterSpec {
  /** aria-label of the Radix select trigger. */
  label: string;
  /** Option shown when no filter is applied. */
  defaultOption: string;
  options: readonly string[];
  /** Query param the filter writes to the URL. */
  param: string;
}

export interface ReportConfigScreenSpec {
  path: string;
  /** `[data-slot="page-title"]` text. */
  heading: string;
  /** `document.title`. */
  docTitle: string;
  searchPlaceholder: string;
  addButton: string;
  columns: readonly string[];
  filters: readonly ReportConfigFilterSpec[];
  rowActions: readonly string[];
  emptyText: string;
  /** Data-host list endpoint (matches both the initial fetch and refetches). */
  listEndpoint: RegExp;
  /** True when search/filter re-query the server instead of filtering in memory. */
  serverSide: boolean;
}

const SOURCE_TYPES = [
  'All Types',
  'Staff Daily Income',
  'Staff Order Detail',
  'Store Daily Income',
  'Store Order Detail',
  'Payroll',
  'Payroll Daily',
  'Payroll Calculation',
  'Payroll Daily Calculation',
  'Payroll Period',
  'Staff List',
] as const;

export const REPORT_CONFIG_SCREENS: Record<ReportConfigScreen, ReportConfigScreenSpec> = {
  pages: {
    path: Urls.REPORT_CONFIG_PAGES,
    heading: 'Pages',
    docTitle: 'Report Pages | Portal',
    searchPlaceholder: 'Search by name or slug...',
    addButton: 'Add Page',
    columns: ['NAME', 'LAYOUTS', 'STATUS', 'PUBLISHED'],
    filters: [
      {
        label: 'Layout variant',
        defaultOption: 'All layouts',
        options: ['All layouts', 'Web', 'POS Window', 'Mobile'],
        param: 'variant',
      },
    ],
    rowActions: ['Publish', 'Build layout', 'Edit', 'Clone', 'Delete'],
    emptyText: 'No report pages found.',
    listEndpoint: /\/report_pages\.jsonld\?itemsPerPage=100&order%5Bslug%5D=asc$/,
    serverSide: false,
  },
  blocks: {
    path: Urls.REPORT_CONFIG_BLOCKS,
    heading: 'Blocks',
    docTitle: 'Report Blocks | Portal',
    searchPlaceholder: 'Search by name, slug or dataset...',
    addButton: 'Add Block',
    columns: ['NAME', 'STATUS', 'KIND', 'DATASET'],
    filters: [
      {
        label: 'Kind',
        defaultOption: 'All kinds',
        options: ['All kinds', 'Table', 'Summary', 'Chart', 'Detail'],
        param: 'blockKind',
      },
    ],
    rowActions: ['Edit', 'Clone', 'Delete'],
    emptyText: 'No report blocks found.',
    listEndpoint: /\/report_blocks\.jsonld\?/,
    serverSide: false,
  },
  sources: {
    path: Urls.REPORT_CONFIG_SOURCES,
    heading: 'Sources',
    docTitle: 'Report Sources | Portal',
    searchPlaceholder: 'Search by name...',
    addButton: 'Add Report Data',
    columns: ['NAME', 'TYPE', 'RESPONSE', 'COLUMNS', 'STATUS', 'UPDATED'],
    filters: [
      { label: 'Filter by type', defaultOption: 'All Types', options: SOURCE_TYPES, param: 'type' },
    ],
    rowActions: ['Edit', 'Delete'],
    emptyText: 'No report data found.',
    listEndpoint: /\/report_data\.jsonld\?/,
    serverSide: true,
  },
  columns: {
    path: Urls.REPORT_CONFIG_COLUMNS,
    heading: 'Columns',
    docTitle: 'Report Columns | Portal',
    searchPlaceholder: 'Search by label or slug...',
    addButton: 'Add Column',
    columns: ['NAME', 'TYPE', 'KIND', 'DATA TYPE'],
    filters: [
      { label: 'Filter by type', defaultOption: 'All Types', options: SOURCE_TYPES, param: 'type' },
      {
        label: 'Filter by kind',
        defaultOption: 'All Kinds',
        options: ['All Kinds', 'Column (Leaf)', 'Derived (Formula)', 'Joined', 'Subquery'],
        param: 'kind',
      },
    ],
    rowActions: ['Edit', 'Delete'],
    emptyText: 'No report columns found.',
    listEndpoint: /\/report_columns\.jsonld\?/,
    serverSide: true,
  },
};

export const REPORT_CONFIG_SCREEN_NAMES = Object.keys(
  REPORT_CONFIG_SCREENS,
) as ReportConfigScreen[];

/** The sidebar link label of each sub-screen. */
export const REPORT_CONFIG_LINKS: Record<ReportConfigScreen, string> = {
  pages: 'Pages',
  blocks: 'Blocks',
  sources: 'Sources',
  columns: 'Columns',
};

/** Data host the Portal fetches from (and would write to). */
export const DATA_HOST = /volt-pos\./;

export interface CapturedWrite {
  method: string;
  url: string;
  body: unknown;
}

const isRead = (r: Request): boolean => ['GET', 'HEAD', 'OPTIONS'].includes(r.method());

const capture = (r: Request): CapturedWrite => {
  let body: unknown = r.postData();
  try {
    body = body ? JSON.parse(body as string) : null;
  } catch {
    /* keep raw */
  }
  return { method: r.method(), url: r.url(), body };
};

export class ReportConfigPage extends BasePage {
  protected readonly path: string;
  readonly spec: ReportConfigScreenSpec;
  readonly sidebar: Sidebar;
  readonly table: DataTable;

  constructor(
    page: Page,
    readonly screen: ReportConfigScreen = 'pages',
  ) {
    super(page);
    this.spec = REPORT_CONFIG_SCREENS[screen];
    this.path = this.spec.path;
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
  }

  /** The same page bound to another sub-screen. */
  on(screen: ReportConfigScreen): ReportConfigPage {
    return new ReportConfigPage(this.page, screen);
  }

  get pathname(): string {
    return this.path;
  }

  // ---------------------------------------------------------------- readiness

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.resultsFooter).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.table.rows.first().or(this.emptyState)).toBeVisible({
      timeout: Timeouts.LONG,
    });
  }

  /** Navigate with explicit query params, e.g. `{ search: 'daily', page: '2' }`. */
  async gotoWithQuery(query: Record<string, string>): Promise<void> {
    const qs = new URLSearchParams(query).toString();
    await this.page.goto(`${this.path}?${qs}`, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  // ---------------------------------------------------------------- chrome

  get pageTitle(): Locator {
    return this.page.locator('[data-slot="page-title"]');
  }

  get toolbar(): Locator {
    return this.page.locator('[data-slot="page-toolbar"]');
  }

  get searchInput(): Locator {
    return this.page.getByPlaceholder(this.spec.searchPlaceholder);
  }

  get addButton(): Locator {
    return this.page.getByRole('button', { name: this.spec.addButton, exact: true });
  }

  /** The accordion button that expands the four sub-links. */
  get sidebarGroup(): Locator {
    return this.page.getByRole('button', { name: 'Report Configuration', exact: true });
  }

  sidebarLink(screen: ReportConfigScreen): Locator {
    return this.page.locator(`a[href$="/report-config/${screen}"]`);
  }

  // ---------------------------------------------------------------- filters

  /** Radix select trigger (`<button role="combobox" aria-label=…>`). */
  filter(label: string = this.spec.filters[0].label): Locator {
    return this.page.locator(`[role="combobox"][aria-label="${label}"]`);
  }

  /** Trigger text read off the DOM (role queries fail while the listbox is open). */
  async filterValue(label: string = this.spec.filters[0].label): Promise<string> {
    return ((await this.filter(label).textContent()) ?? '').trim();
  }

  async openFilter(label: string = this.spec.filters[0].label): Promise<string[]> {
    await this.filter(label).click();
    await expect(this.page.getByRole('option').first()).toBeVisible();
    return (await this.page.getByRole('option').allTextContents()).map((t) => t.trim());
  }

  async selectFilter(option: string, label: string = this.spec.filters[0].label): Promise<void> {
    await this.filter(label).click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
    await expect(this.filter(label)).toHaveText(option);
    await this.settle();
  }

  // ---------------------------------------------------------------- search

  /** Type a term and let the debounce + (server-side) refetch settle. */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.settle();
  }

  async clearSearch(): Promise<void> {
    await this.search('');
  }

  /** Debounce window + refetch. Same fixed wait the other list POs use. */
  async settle(): Promise<void> {
    await this.page.waitForTimeout(1_500);
    await expect(this.table.rows.first().or(this.emptyState)).toBeVisible({
      timeout: Timeouts.MEDIUM,
    });
  }

  // ---------------------------------------------------------------- table

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  /** Header labels with the trailing (unlabelled) actions column dropped. */
  async headerLabels(): Promise<string[]> {
    return (await this.columnHeaders.allTextContents()).map((t) => t.trim()).filter(Boolean);
  }

  /** Rows actually on screen (Blocks renders more `<tr>` than the footer claims). */
  get visibleRows(): Locator {
    return this.table.rows.filter({ visible: true });
  }

  get emptyState(): Locator {
    return this.page.locator('[data-slot="empty"]');
  }

  row(index = 0): Locator {
    return this.table.rows.nth(index);
  }

  /** NAME cell → `{ name, slug }` (bold label over a mono slug). */
  async nameAndSlug(index = 0): Promise<{ name: string; slug: string }> {
    const spans = this.row(index).getByRole('cell').first().locator('span');
    return {
      name: ((await spans.nth(0).textContent()) ?? '').trim(),
      slug: ((await spans.nth(1).textContent()) ?? '').trim(),
    };
  }

  /** Every visible value of a column (0-based), via per-row nth-child. */
  async columnValues(column: number): Promise<string[]> {
    const cells = this.table.rows.locator(`td:nth-child(${column + 1})`);
    return (await cells.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  columnIndex(name: string): number {
    const i = this.spec.columns.indexOf(name);
    if (i < 0) throw new Error(`No column ${name} on ${this.screen}`);
    return i;
  }

  rowAction(name: string, index = 0): Locator {
    return this.row(index).getByRole('button', { name, exact: true });
  }

  /** First row whose `name` action is enabled (e.g. Sources/Columns disable Delete for in-use rows). */
  async firstRowWithEnabled(name: string): Promise<number> {
    const n = await this.table.rows.count();
    for (let i = 0; i < n; i++) {
      if (await this.rowAction(name, i).isEnabled()) return i;
    }
    return -1;
  }

  // ---------------------------------------------------------------- pagination

  get resultsFooter(): Locator {
    return this.page.getByText(/^Showing \d+ to \d+ of \d+ results$/);
  }

  get pageIndicator(): Locator {
    return this.page.getByText(/^\d+\s*\/\s*\d+$/);
  }

  get nextButton(): Locator {
    return this.page.getByRole('button', { name: 'Next', exact: true });
  }

  get prevButton(): Locator {
    return this.page.getByRole('button', { name: 'Previous', exact: true });
  }

  /** `{ from, to, total }` parsed from the footer. */
  async footerRange(): Promise<{ from: number; to: number; total: number }> {
    const t = (await this.resultsFooter.first().textContent()) ?? '';
    const m = t.match(/Showing (\d+) to (\d+) of (\d+)/);
    if (!m) throw new Error(`Unparseable footer: ${t}`);
    return { from: Number(m[1]), to: Number(m[2]), total: Number(m[3]) };
  }

  async totalResults(): Promise<number> {
    return (await this.footerRange()).total;
  }

  // ---------------------------------------------------------------- dialogs

  get dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  get alertDialog(): Locator {
    return this.page.getByRole('alertdialog');
  }

  async openAdd(): Promise<void> {
    await this.addButton.click();
  }

  // ---------------------------------------------------------------- network

  /** Wait for the screen's list request (use with `Promise.all` around the trigger). */
  waitForList(): Promise<Request> {
    return this.page.waitForRequest(
      (r) => this.spec.listEndpoint.test(r.url()) && r.method() === 'GET',
    );
  }

  /**
   * Safety net: abort every non-GET request to the data host and record it.
   * Install at the start of any test that opens a dialog with a submit button.
   * Returns the live array of blocked writes — assert it stays empty.
   */
  async guardWrites(): Promise<CapturedWrite[]> {
    const blocked: CapturedWrite[] = [];
    await this.page.route(DATA_HOST, (route: Route) => {
      if (isRead(route.request())) return route.fallback();
      blocked.push(capture(route.request()));
      return route.abort('blockedbyclient');
    });
    return blocked;
  }

  /**
   * Fulfil every non-GET request to the data host locally (default 422, a
   * hydra ConstraintViolationList) and record its payload — lets a spec assert
   * exactly what *would* have been written without touching the live config.
   */
  async mockWrites(status = 422): Promise<CapturedWrite[]> {
    const captured: CapturedWrite[] = [];
    await this.page.route(DATA_HOST, (route: Route) => {
      if (isRead(route.request())) return route.fallback();
      captured.push(capture(route.request()));
      return route.fulfill({
        status,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@type': 'ConstraintViolationList',
          title: 'An error occurred',
          detail: 'name: E2E mocked rejection',
          violations: [{ propertyPath: 'name', message: 'E2E mocked rejection' }],
        }),
      });
    });
    return captured;
  }

  /** Serve the list endpoint with a canned hydra collection. */
  async stubList(members: unknown[], total = members.length): Promise<void> {
    await this.page.route(this.spec.listEndpoint, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@context': '/contexts/Stub',
          '@type': 'Collection',
          member: members,
          totalItems: total,
          'hydra:member': members,
          'hydra:totalItems': total,
        }),
      }),
    );
  }

  get toasts(): Locator {
    return this.page.locator('[data-sonner-toast]');
  }
}
