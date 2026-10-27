import { type Locator, type Page, type Request, type Route, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Report Configuration — the report-builder admin, four list screens under one
 * sidebar accordion (`Management` → `Report Configuration` → Pages / Blocks /
 * Sources / Columns). All four share the same shell, so one Page Object is
 * parameterised by screen rather than four near-identical classes.
 *
 * Shell after the 2026-10-13 design-system refactor (verified on DEV store
 * 100004 on 2026-10-20):
 *  - `#pos-main` banner: `h1` title, a description ending in a
 *    `[data-slot="pos-count"]` ("56 blocks" / "10 of 56 blocks") and an in-page
 *    `navigation "Report configuration"` with the four tabs;
 *  - toolbar: search textbox, filter chips (`[data-slot="pos-filter-chip"]`,
 *    aria-label "Layout variant" / "Kind" / "Filter by type" / "Filter by kind",
 *    becoming "<label>: <value>" once set, with a sibling "Clear … filter"
 *    button) that open a cmdk `listbox "Suggestions"` (`aria-checked` = chosen,
 *    `aria-selected` = keyboard highlight), a "Columns" visibility button and
 *    "Add …";
 *  - table: Name | Key (slug + "Copy key") | … | an actions column whose only
 *    control is `button "Actions for <name>"` opening a `menu` of menuitems
 *    (Delete is "Delete…", disabled for in-use records);
 *  - `navigation "Pagination"`: "1–30 of 429", "Previous page", "n / m",
 *    "Next page" — removed entirely when the list is empty;
 *  - empty state `[data-slot="pos-empty-state"]` rendered inside `<tbody>`.
 *
 * Add / Edit / Clone dialogs (re-verified 2026-10-26): "New page" / "New block"
 * (submit "Create page" / "Create block"), "Edit page", "Clone Page" /
 * "Clone Block"; Delete is an alertdialog "Delete page?" / "Delete block?" ….
 * Sources and Columns create/edit on full pages ("New source", "Edit column" …).
 *
 * Search, filter and page are written to the URL (`?search=`, `?page=`, plus
 * `variant` / `blockKind` / `type` / `kind`) and restored on reload. Pages and
 * Blocks fetch everything once (`itemsPerPage=100`) and filter / paginate
 * client-side; Sources and Columns query the server per change.
 *
 * SHARED LIVE DATA: this configuration drives the live report pages for every
 * user of the DEV Portal. Specs must never let a write reach the server. Use
 * `guardWrites()` (abort) or `mockWrites()` (fulfil locally + capture payload)
 * before any click that could save, and note that **Publish fires
 * `POST /report_pages/<id>/publish` on a single click with no confirmation**.
 */
export type ReportConfigScreen = 'pages' | 'blocks' | 'sources' | 'columns';

export interface ReportConfigFilterSpec {
  /** aria-label of the filter chip while no value is set. */
  label: string;
  /** Visible chip text while no value is set. */
  chipText: string;
  /** Options in the "Suggestions" listbox (there is no "All …" option; clearing is a separate button). */
  options: readonly string[];
  /** Query param the filter writes to the URL. */
  param: string;
}

export interface ReportConfigScreenSpec {
  path: string;
  /** `#pos-main` banner h1. */
  heading: string;
  /** `document.title`. */
  docTitle: string;
  searchPlaceholder: string;
  addButton: string;
  columns: readonly string[];
  filters: readonly ReportConfigFilterSpec[];
  /** Menu items of the per-row "Actions for <name>" menu. */
  rowActions: readonly string[];
  emptyText: string;
  /** Data-host list endpoint (matches both the initial fetch and refetches). */
  listEndpoint: RegExp;
  /** True when search/filter re-query the server instead of filtering in memory. */
  serverSide: boolean;
}

export const RC_SOURCE_TYPES = [
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

/** Delete opens a confirmation, hence the ellipsis in the menu item. */
export const RC_DELETE_ACTION = 'Delete…';

export const REPORT_CONFIG_SCREENS: Record<ReportConfigScreen, ReportConfigScreenSpec> = {
  pages: {
    path: Urls.REPORT_CONFIG_PAGES,
    heading: 'Pages',
    docTitle: 'Report pages | Portal',
    searchPlaceholder: 'Search name or key...',
    addButton: 'Add page',
    columns: ['Name', 'Key', 'Layouts', 'Status', 'Published'],
    filters: [
      {
        label: 'Layout variant',
        chipText: 'Layout',
        options: ['Web', 'POS window', 'Mobile'],
        param: 'variant',
      },
    ],
    rowActions: ['Publish', 'Edit', 'Clone', RC_DELETE_ACTION],
    emptyText: 'No report pages found.',
    listEndpoint: /\/report_pages\.jsonld\?itemsPerPage=100&order%5Bslug%5D=asc$/,
    serverSide: false,
  },
  blocks: {
    path: Urls.REPORT_CONFIG_BLOCKS,
    heading: 'Blocks',
    docTitle: 'Report blocks | Portal',
    searchPlaceholder: 'Search name or key...',
    addButton: 'Add block',
    // At ≥1920px wide (the suite viewport); narrower viewports drop "Updated".
    columns: ['Name', 'Key', 'Kind', 'Source', 'Status', 'Updated'],
    filters: [
      {
        label: 'Kind',
        chipText: 'Kind',
        options: ['Table', 'Summary', 'Chart', 'Detail'],
        param: 'blockKind',
      },
    ],
    rowActions: ['Edit', 'Clone', RC_DELETE_ACTION],
    emptyText: 'No report blocks found.',
    listEndpoint: /\/report_blocks\.jsonld\?/,
    serverSide: false,
  },
  sources: {
    path: Urls.REPORT_CONFIG_SOURCES,
    heading: 'Sources',
    docTitle: 'Report sources | Portal',
    searchPlaceholder: 'Search name...',
    addButton: 'Add source',
    // At ≥1920px wide (the suite viewport); narrower viewports drop Response / Columns.
    columns: ['Name', 'Key', 'Type', 'Response', 'Columns', 'Status', 'Updated'],
    filters: [
      { label: 'Filter by type', chipText: 'Type', options: RC_SOURCE_TYPES, param: 'type' },
    ],
    rowActions: ['Edit', RC_DELETE_ACTION],
    emptyText: 'No sources found.',
    listEndpoint: /\/report_data\.jsonld\?/,
    serverSide: true,
  },
  columns: {
    path: Urls.REPORT_CONFIG_COLUMNS,
    heading: 'Columns',
    docTitle: 'Report columns | Portal',
    searchPlaceholder: 'Search name or key...',
    addButton: 'Add column',
    columns: ['Name', 'Key', 'Type', 'Kind', 'Data type'],
    filters: [
      { label: 'Filter by type', chipText: 'Type', options: RC_SOURCE_TYPES, param: 'type' },
      {
        label: 'Filter by kind',
        chipText: 'Kind',
        options: ['Database column', 'Formula', 'Joined', 'Subquery'],
        param: 'kind',
      },
    ],
    rowActions: ['Edit', RC_DELETE_ACTION],
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
  /** `{ rows }` — data rows only (empty-state and skeleton rows excluded). */
  readonly table: { rows: Locator };

  constructor(
    page: Page,
    readonly screen: ReportConfigScreen = 'pages',
  ) {
    super(page);
    this.spec = REPORT_CONFIG_SCREENS[screen];
    this.path = this.spec.path;
    this.sidebar = new Sidebar(page);
    this.table = {
      rows: page
        .getByRole('table')
        .locator('tbody tr')
        .filter({ hasNot: page.locator('[data-slot="pos-empty-state"]') })
        // Newer builds keep a placeholder `[data-slot="empty"]` row in <tbody> and draw
        // the real empty state outside the table.
        .filter({ hasNot: page.locator('[data-slot="empty"]') })
        .filter({ hasNot: page.locator('[data-slot="skeleton"]') }),
    };
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
    await expect(this.table.rows.first().or(this.emptyState)).toBeVisible({
      timeout: Timeouts.LONG,
    });
    await expect(this.count).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  /** Navigate with explicit query params, e.g. `{ search: 'daily', page: '2' }`. */
  async gotoWithQuery(query: Record<string, string>): Promise<void> {
    const qs = new URLSearchParams(query).toString();
    await this.page.goto(`${this.path}?${qs}`, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  // ---------------------------------------------------------------- chrome

  get main(): Locator {
    return this.page.locator('#pos-main');
  }

  get pageTitle(): Locator {
    return this.main.getByRole('banner').getByRole('heading', { level: 1 });
  }

  /** `[data-slot="pos-count"]` — "56 blocks", or "10 of 56 blocks" when narrowed. */
  get count(): Locator {
    return this.main.locator('[data-slot="pos-count"]');
  }

  get searchInput(): Locator {
    return this.page.getByRole('textbox', { name: this.spec.searchPlaceholder, exact: true });
  }

  get addButton(): Locator {
    return this.page.getByRole('button', { name: this.spec.addButton, exact: true });
  }

  get mainNav(): Locator {
    return this.page.getByRole('navigation', { name: 'Main' });
  }

  /** The sidebar accordion button that expands the four sub-links. */
  get sidebarGroup(): Locator {
    return this.mainNav.getByRole('button', { name: 'Report Configuration', exact: true });
  }

  sidebarLink(screen: ReportConfigScreen): Locator {
    return this.mainNav.locator(`a[href$="/report-config/${screen}"]`);
  }

  /**
   * Rendered height of the accordion panel. A collapsed group keeps its links in
   * the DOM inside a 0-height `overflow:hidden` grid, so Playwright still calls
   * them "visible" — the panel height is the reliable collapsed/expanded signal.
   */
  async sidebarGroupPanelHeight(): Promise<number> {
    const id = await this.sidebarGroup.getAttribute('aria-controls');
    return this.page
      .locator(`[id="${id}"]`)
      .evaluate((e) => Math.round(e.getBoundingClientRect().height));
  }

  /** Bring the accordion into the requested state (its open state is remembered across pages). */
  async setSidebarGroupExpanded(expanded: boolean): Promise<void> {
    if ((await this.sidebarGroup.getAttribute('aria-expanded')) !== String(expanded)) {
      await this.sidebarGroup.click();
    }
    await expect(this.sidebarGroup).toHaveAttribute('aria-expanded', String(expanded));
    if (expanded) await expect.poll(() => this.sidebarGroupPanelHeight()).toBeGreaterThan(0);
    else await expect.poll(() => this.sidebarGroupPanelHeight()).toBe(0);
  }

  // ---------------------------------------------------------------- filters

  /** Filter chip, matched with or without a value set ("Kind" / "Kind: Chart"). */
  filter(label: string = this.spec.filters[0].label): Locator {
    return this.page.locator(
      `[data-slot="pos-filter-chip"][aria-label="${label}"], [data-slot="pos-filter-chip"][aria-label^="${label}: "]`,
    );
  }

  /** Selected value of a chip, or '' when the filter is not set. */
  async filterValue(label: string = this.spec.filters[0].label): Promise<string> {
    const aria = (await this.filter(label).getAttribute('aria-label')) ?? '';
    return aria.startsWith(`${label}: `) ? aria.slice(label.length + 2).trim() : '';
  }

  get listbox(): Locator {
    return this.page.getByRole('listbox', { name: 'Suggestions' });
  }

  async openFilter(label: string = this.spec.filters[0].label): Promise<string[]> {
    await this.filter(label).click();
    await expect(this.listbox.getByRole('option').first()).toBeVisible();
    return (await this.listbox.getByRole('option').allInnerTexts()).map((t) => t.trim());
  }

  async selectFilter(option: string, label: string = this.spec.filters[0].label): Promise<void> {
    await this.filter(label).click();
    await this.listbox.getByRole('option', { name: option, exact: true }).click();
    await expect(this.filter(label)).toHaveAttribute('aria-label', `${label}: ${option}`);
    await this.settle();
  }

  /** The "Clear … filter" button next to a set chip. */
  clearFilterButton(): Locator {
    return this.page.getByRole('button', { name: /^Clear .* filter$/ });
  }

  async clearFilter(): Promise<void> {
    await this.clearFilterButton().first().click();
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

  /**
   * Debounce window + refetch. The count / footer briefly show the previous
   * total after a server-side refetch starts, so also wait until the count text
   * is stable across two reads.
   */
  async settle(): Promise<void> {
    await this.page.waitForTimeout(1_500);
    await expect(this.table.rows.first().or(this.emptyState)).toBeVisible({
      timeout: Timeouts.MEDIUM,
    });
    let prev = '';
    await expect
      .poll(
        async () => {
          // allTextContents() never waits: the pagination nav is removed for an
          // empty list, and textContent() would block a whole action timeout.
          const now =
            (await this.count.allTextContents()).join('') +
            '|' +
            (await this.pagination.allTextContents()).join('');
          const same = now === prev;
          prev = now;
          return same;
        },
        { timeout: Timeouts.MEDIUM, intervals: [500] },
      )
      .toBe(true);
  }

  // ---------------------------------------------------------------- table

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  /** Header labels with the trailing (unlabelled) actions column dropped. */
  async headerLabels(): Promise<string[]> {
    return (await this.columnHeaders.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  }

  /** Rows actually on screen (Blocks renders more `<tr>` than the footer claims). */
  get visibleRows(): Locator {
    return this.table.rows.filter({ visible: true });
  }

  /**
   * Empty-state title. A failed list fetch reuses the same slot with an error
   * title ("Couldn't load report columns") and a "Try again" button.
   */
  get emptyState(): Locator {
    return this.page.locator('[data-slot="pos-empty-state-title"]');
  }

  row(index = 0): Locator {
    return this.table.rows.nth(index);
  }

  /** Name cell + Key cell (the slug; the "Copy key" button has no text). */
  async nameAndSlug(index = 0): Promise<{ name: string; slug: string }> {
    const cells = this.row(index).getByRole('cell');
    return {
      name: (await cells.nth(0).innerText()).trim(),
      slug: (await cells.nth(1).innerText()).trim(),
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

  /** The per-row "Actions for <name>" menu trigger. */
  rowMenuButton(index = 0): Locator {
    return this.row(index).getByRole('button', { name: /^Actions for / });
  }

  get rowMenu(): Locator {
    return this.page.getByRole('menu');
  }

  /** Open a row's actions menu and return it. */
  async openRowMenu(index = 0): Promise<Locator> {
    await this.rowMenuButton(index).click();
    await expect(this.rowMenu).toBeVisible();
    return this.rowMenu;
  }

  async closeRowMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.rowMenu).toHaveCount(0);
  }

  /** Names of the menu items a row offers. */
  async rowActionNames(index = 0): Promise<string[]> {
    const menu = await this.openRowMenu(index);
    const names = (await menu.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
    await this.closeRowMenu();
    return names;
  }

  /** Whether a row's menu item is enabled. */
  async isRowActionEnabled(name: string, index = 0): Promise<boolean> {
    const menu = await this.openRowMenu(index);
    const item = menu.getByRole('menuitem', { name: actionName(name) });
    const disabled =
      (await item.getAttribute('aria-disabled')) === 'true' ||
      (await item.getAttribute('data-disabled')) !== null;
    await this.closeRowMenu();
    return !disabled;
  }

  /** Open the row's menu and click one of its items. */
  async clickRowAction(name: string, index = 0): Promise<void> {
    const menu = await this.openRowMenu(index);
    await menu.getByRole('menuitem', { name: actionName(name) }).click();
  }

  /** First row whose `name` action is enabled (e.g. Delete is disabled for in-use rows). */
  async firstRowWithEnabled(name: string): Promise<number> {
    const n = await this.table.rows.count();
    for (let i = 0; i < n; i++) {
      if (await this.isRowActionEnabled(name, i)) return i;
    }
    return -1;
  }

  // ---------------------------------------------------------------- pagination

  get pagination(): Locator {
    return this.page.getByRole('navigation', { name: 'Pagination' });
  }

  /** "1–30 of 429" (en dash). */
  get resultsFooter(): Locator {
    return this.pagination.getByText(/^\d+–\d+ of \d+$/);
  }

  get pageIndicator(): Locator {
    return this.pagination.getByText(/^\d+\s*\/\s*\d+$/);
  }

  get nextButton(): Locator {
    return this.page.getByRole('button', { name: 'Next page', exact: true });
  }

  get prevButton(): Locator {
    return this.page.getByRole('button', { name: 'Previous page', exact: true });
  }

  /** `{ from, to, total }` parsed from the footer. */
  async footerRange(): Promise<{ from: number; to: number; total: number }> {
    const t = (await this.resultsFooter.first().textContent()) ?? '';
    const m = t.match(/(\d+)–(\d+) of (\d+)/);
    if (!m) throw new Error(`Unparseable footer: ${t}`);
    return { from: Number(m[1]), to: Number(m[2]), total: Number(m[3]) };
  }

  /** Matching total from the header count ("10 of 56 blocks" → 10, "56 blocks" → 56). */
  async totalResults(): Promise<number> {
    const t = ((await this.count.textContent()) ?? '').replace(/\s+/g, ' ');
    const m = t.match(/(\d[\d,]*)/);
    if (!m) throw new Error(`Unparseable count: ${t}`);
    return Number(m[1].replace(/,/g, ''));
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

  /**
   * Serve the live list with `system: false` on its first `n` members. Every
   * block and source on DEV is a system record whose Delete is disabled, so this
   * is the only way to reach their Delete confirmation. Pair it with
   * `guardWrites()` / `mockWrites()` — the DELETE itself must never go out.
   */
  async unlockSystemRows(n = 1): Promise<void> {
    await this.page.route(this.spec.listEndpoint, async (route: Route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const response = await route.fetch();
      const json = await response.json();
      const members: Array<Record<string, unknown>> = json.member ?? json['hydra:member'] ?? [];
      members.slice(0, n).forEach((m) => (m.system = false));
      return route.fulfill({ response, json });
    });
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

/** Menu item name matcher: `Delete` also matches the menu's `Delete…`. */
function actionName(name: string): RegExp {
  const base = name.replace(/…$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${base}…?$`);
}
