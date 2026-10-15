import { type Download, type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { ReportPageSlug, type ReportPageSlugValue, Urls, reportPageUrl } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/* ------------------------------------------------------------------------- *
 * Screen facts (scanned + probed 2026-10-13 — docs/test-cases/reports.md)
 *
 *  - Five report pages under `/pos/<seg>/<id>/report-pages/<slug>`, reached
 *    from the sidebar accordion `Reports` (Management group). The accordion is
 *    collapsed on other screens and auto-expanded on a report page.
 *  - No `h1`–`h6` for the report name: it is `[data-slot="page-title"]`. The
 *    only heading anywhere is Staff Payroll's `h3` period label.
 *  - No `data-testid`. Everything is reached by role / aria-label / text.
 *  - All filter state is URL state: `after` / `before` (YYYY-MM-DD), `metric`,
 *    `period` (daily|weekly|monthly), `search`, `include_no_income`,
 *    `period_id`, `page`, `tab` (Demo) and `blockSort` — a JSON map
 *    `{ "<block-id>": "<column>:<asc|desc>" }`.
 *  - Sort headers are tri-state (asc → desc → none for text columns; numeric
 *    columns start at desc). State is in the button's aria-label suffix
 *    (`Sort by Staff, sorted ascending`) and on the `th[aria-sort]`.
 *  - Export opens a menu (`Download CSV` / `Download Excel`). Print renders the
 *    report into a hidden iframe and calls `iframe.contentWindow.print()` —
 *    {@link ReportPagesPage.installPrintSpy} captures that without a dialog.
 *  - Data loads from `volt-pos.<portal-host>/report_pages/<slug>/layout` and
 *    `/report_blocks/<block>/rows?...` on the browser side.
 * ------------------------------------------------------------------------- */

/** One report page: slug, sidebar label (= on-page title), `document.title`. */
export interface RptPageSpec {
  slug: ReportPageSlugValue;
  label: string;
  title: string;
}

/** The five report links, in sidebar order. */
export const RPT_PAGES: readonly RptPageSpec[] = [
  { slug: ReportPageSlug.DAILY_SALE, label: 'Daily Sale Report', title: 'Daily Sale Report | Portal' },
  { slug: ReportPageSlug.DEMO_DS, label: 'Demo DS Report', title: 'Demo DS Report | Portal' },
  { slug: ReportPageSlug.INCOME_SUMMARY, label: 'Income Summary', title: 'Income Summary | Portal' },
  { slug: ReportPageSlug.STAFF_INCOME, label: 'Staff Income', title: 'Staff Income | Portal' },
  { slug: ReportPageSlug.STAFF_PAYROLL, label: 'Staff Payroll', title: 'Staff Payroll | Portal' },
] as const;

/** The four "real" (non-demo) report pages — each has a paginated table + Export. */
export const RPT_DATA_PAGES = RPT_PAGES.filter((p) => p.slug !== ReportPageSlug.DEMO_DS);

export function rptPage(slug: ReportPageSlugValue): RptPageSpec {
  const found = RPT_PAGES.find((p) => p.slug === slug);
  if (!found) throw new Error(`Unknown report slug: ${slug}`);
  return found;
}

/** `/pos/nail/14/report-pages/<slug>` matcher (store id never hardcoded). */
export function rptUrlPattern(slug: string): RegExp {
  return new RegExp(`/pos/[\\w-]+/\\d+/report-pages/${slug}(?:[?#]|$)`);
}

/** Table columns as `textContent` holds them (CSS upper-cases them on screen). */
export const RPT_COLUMNS = {
  dailySale: ['Order #', 'Sale/Refund', 'Tax', 'Tip', 'Total'],
  incomeSummary: ['Date', 'Sale', 'Tip', 'Tax', 'Total Payment'],
  staffIncome: ['Staff', 'Orders', 'Subtotal', 'Supply Fee', 'Tip', 'Total Income'],
  staffPayroll: ['Name', 'Orders', 'Subtotal', 'Supply Fee', 'Tip', 'Total Income'],
  demoDailySale: ['Order #', 'Sale', 'Refund', 'Tax', 'Tip', 'Total'],
} as const;

/** CSV header lines per export. */
export const RPT_CSV_HEADERS = {
  dailySale: 'Order #,Sale/Refund,Tax,Tip,Total',
  incomeSummary: 'Date,Sale,Tip,Tax,Total Payment',
  staffIncome: 'Staff,Orders,Subtotal,Supply Fee,Tip,Total Income',
  staffPayroll: 'Name,Orders,Subtotal,Supply Fee,Tip,Total Income',
} as const;

/** Daily Sale KPI tiles: label → `?metric=` value. */
export const RPT_DAILY_KPIS = [
  { label: 'Total Orders', metric: 'numberOfOrders' },
  { label: 'Sale Income', metric: 'dailySaleSale' },
  { label: 'Total Tip', metric: 'dailySaleTip' },
  { label: 'Total Payment', metric: 'dailySalePayment' },
] as const;

export const RPT_INCOME_DETAIL_ROWS = ['Sale', 'Tip', 'Tax Collected', 'Total Payment'] as const;
export const RPT_PAYMENT_DETAIL_ROWS = [
  'Card',
  'Cash',
  'Others',
  'Amount Collected',
  'Gift Card Redemption',
  'Total Payment',
] as const;

/** Income Summary breakdown groups (right panel after a row click), in order. */
export const RPT_SUMMARY_BREAKDOWN_GROUPS = [
  'PAYMENT DETAILS',
  'SALE DETAILS',
  'SUPPLY FEE',
  'STAFF PAYOUT',
  'SALON EARNINGS',
] as const;

export const RPT_SUMMARY_CHART_SERIES = ['Gross Income', 'Net Income', 'Total Tip'] as const;
export const RPT_PERIOD_OPTIONS = ['Day', 'Week', 'Month'] as const;
export const RPT_DEMO_TABS = ['Daily Sale', 'Income Summary', 'Staff Income', 'Staff Payroll'] as const;
export const RPT_EXPORT_ITEMS = ['Download CSV', 'Download Excel'] as const;

/** Staff Income `Report Date Range preset` options (added on DEV 2026-10-13). */
export const RPT_RANGE_PRESETS = [
  'Today',
  'Yesterday',
  'This Week',
  'Last Week',
  'Last 7 Days',
  'This Month',
  'Last Month',
  'Last 30 Days',
  'This Year',
  'Last Year',
] as const;

/** Staff Payroll per-staff breakdown labels (right panel after a row click). */
export const RPT_PAYROLL_BREAKDOWN_ROWS = [
  'Sale',
  'Refund',
  'Subtotal',
  'Supply Fee',
  'Staff Commission',
  'Card Charge Commission',
  'Clean Up Fee/Deduction',
  'Tip',
  'Card Charge Tip',
  'Discount Charge',
  'Total Income',
  'Pay 1',
  'Pay 2',
] as const;

export const RPT_TEXT = {
  NO_ROWS: 'No rows for this date range.',
  NO_ROW_SELECTED: 'No Row Selected',
  NO_ROW_SELECTED_HINT: 'Pick a row on the left to see its breakdown.',
  NO_METRIC: 'No Metric Selected',
  CURRENT_PERIOD: 'Current Period (Unclosed)',
  ESTIMATED: 'Estimated figures. They keep changing until the period is closed.',
  NO_INCOME_SWITCH: 'Show staff with no income',
  STAFF_INCOME_SEARCH: 'Search by staff name (on report)...',
  STAFF_PAYROLL_SEARCH: 'Search by staff name...',
  MERCHANT_UNAVAILABLE: 'This merchant is not available.',
} as const;

/* ------------------------------- formats -------------------------------- */

export const RPT_CURRENCY = /^-?\$\d{1,3}(?:,\d{3})*\.\d{2}$/;
export const RPT_COUNT = /^\d{1,3}(?:,\d{3})*$/;
export const RPT_PERCENT = /^[+-]?\d+%$/;
export const RPT_ORDER_CODE = /^#OD\d{6}-\d{8}(?: \(Refund\))?$/;
export const RPT_DATE_LABEL = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
export const RPT_DATE_RANGE_LABEL = /^[A-Z][a-z]{2} \d{1,2}, \d{4} - [A-Z][a-z]{2} \d{1,2}, \d{4}$/;
export const RPT_WEEK_LABEL = /^Week \d+ \([A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}, \d{4}\)$/;
export const RPT_MONTH_LABEL = /^[A-Z][a-z]{2} \d{4}$/;
/**
 * Pagination footer. Desktop: `Showing 1 to 30 of 316 results`; below the
 * tablet breakpoint the same footer is compacted to `1-29 of 29`.
 */
export const RPT_RESULTS_FOOTER = /^(?:Showing (\d+) to (\d+) of (\d+) results|(\d+)-(\d+) of (\d+))$/;
export const RPT_PAGE_INDICATOR = /^\d+ \/ \d+$/;
export const RPT_HOUR_LABEL = /^\d{1,2} (?:AM|PM)$/;
export const RPT_PAGE_SIZE = 30;

/** Shell-hydration budget for {@link ReportPagesPage.waitForShell}. */
const SHELL_TIMEOUT_MS = 45_000;

/* ------------------------------ date utils ------------------------------ */

/** Store timezone is UTC+7. */
const STORE_OFFSET_MS = 7 * 60 * 60 * 1000;

/** `YYYY-MM-DD` of "today" in the store timezone, shifted by `days`. */
export function rptIsoDay(days = 0): string {
  return new Date(Date.now() + STORE_OFFSET_MS + days * 86_400_000).toISOString().slice(0, 10);
}

/** `2026-10-12` → `Oct 12, 2026`. */
export function rptDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** `2026-10-12` → `/October 12th, 2026/` — the day button's aria-label tail. */
export function rptDayButtonName(iso: string): RegExp {
  const d = new Date(`${iso}T00:00:00Z`);
  const month = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = d.getUTCDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return new RegExp(`${month} ${day}${suffix}, ${d.getUTCFullYear()}`);
}

/** `-$1,234.56` → -1234.56; `1,955` → 1955; anything else → NaN. */
export function rptAmount(text: string): number {
  const cleaned = (text ?? '').replace(/[\s$,]/g, '');
  return /^-?\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/** One `label → value` pair of a flat right-hand panel. */
export interface RptValueRow {
  label: string;
  value: string;
}

/**
 * Split a panel's `innerText` into label/value pairs by walking the currency
 * values (`counts` also treats bare integers as values). The text before each
 * value is its label, so `Total Discount` and `Discount` cannot be confused.
 */
export function rptParseRows(section: string, opts?: { counts?: boolean }): RptValueRow[] {
  const value = opts?.counts ? /(-?\$[\d,]+\.\d{2}|-?\d[\d,]*)/g : /(-?\$[\d,]+\.\d{2})/g;
  const rows: RptValueRow[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = value.exec(section)) !== null) {
    rows.push({ label: section.slice(cursor, match.index).replace(/\s+/g, ' ').trim(), value: match[1] });
    cursor = match.index + match[0].length;
  }
  return rows;
}

/** Value for a label (exact, then suffix match), '' when absent. */
export function rptRowValue(rows: RptValueRow[], label: string): string {
  return rows.find((r) => r.label === label)?.value ?? rows.find((r) => r.label.endsWith(label))?.value ?? '';
}

/** `{ "income-staff": "totalIncome:desc" }` out of the `blockSort` param, {} when absent. */
export function rptBlockSort(url: string): Record<string, string> {
  const raw = new URL(url).searchParams.get('blockSort');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export type RptExportFormat = 'CSV' | 'Excel';

/* ------------------------------------------------------------------------- */

/**
 * Reports — the configurable report pages (`/pos/<seg>/<id>/report-pages/<slug>`).
 *
 * One Page Object for all five slugs because they share every building block
 * (page title, date pickers, Export menu, sortable table, pagination footer,
 * right-hand summary panels). Call {@link open} with a slug.
 */
export class ReportPagesPage extends BasePage {
  protected readonly path = Urls.REPORT_PAGES;

  readonly sidebar: Sidebar;

  /** The report name in the page header — a `div`, not a heading. */
  readonly pageTitle: Locator;
  /** Sidebar accordion trigger `Reports` (Management group). */
  readonly reportsGroupButton: Locator;
  /** The five report links inside the expanded accordion. */
  readonly reportLinks: Locator;
  readonly overviewLink: Locator;

  readonly printButton: Locator;
  readonly exportButton: Locator;
  /** Daily Sale single-date trigger (`aria-label="Report Date"`). */
  readonly reportDateButton: Locator;
  /** Income Summary / Staff Income range trigger. */
  readonly dateRangeButton: Locator;
  /** Staff Income range preset combobox (Today, Yesterday, This Week, …). */
  readonly rangePresetCombobox: Locator;
  /** Income Summary `Day | Week | Month` combobox. */
  readonly periodCombobox: Locator;
  /** Staff Payroll period combobox. */
  readonly payrollPeriodCombobox: Locator;
  /** Open calendar popover. */
  readonly calendar: Locator;

  readonly table: Locator;
  readonly bodyRows: Locator;
  readonly columnHeaders: Locator;
  readonly resultsFooter: Locator;
  readonly pageIndicator: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;
  readonly emptyRow: Locator;
  readonly noRowSelected: Locator;

  readonly kpiTiles: Locator;
  readonly incomeDetailTrigger: Locator;
  readonly paymentDetailTrigger: Locator;
  readonly orderDialog: Locator;

  readonly staffSearch: Locator;
  readonly noIncomeSwitch: Locator;
  readonly staffSummaryTrigger: Locator;
  readonly payrollPeriodHeading: Locator;

  readonly tabs: Locator;
  readonly merchantUnavailable: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.pageTitle = page.locator('[data-slot="page-title"]').first();
    this.reportsGroupButton = page.getByRole('button', { name: 'Reports', exact: true });
    this.reportLinks = page.locator('[data-slot="sidebar-menu-sub"] a[href*="/report-pages/"]');
    this.overviewLink = page.locator('a[href$="/overview"]').first();

    this.printButton = page.getByRole('button', { name: 'Print', exact: true }).first();
    this.exportButton = page.getByRole('button', { name: 'Export', exact: true }).filter({ visible: true }).first();
    this.reportDateButton = page.getByRole('button', { name: 'Report Date', exact: true });
    this.dateRangeButton = page.getByRole('button', { name: 'Report date range', exact: true });
    this.rangePresetCombobox = page.getByRole('combobox', { name: 'Report Date Range preset' });
    this.periodCombobox = page.getByRole('combobox', { name: 'Period and Date Window' });
    this.payrollPeriodCombobox = page.getByRole('combobox', { name: 'Payroll Period' });
    this.calendar = page.locator('[data-radix-popper-content-wrapper]').filter({ has: page.getByRole('grid') });

    this.table = page.locator('table').filter({ visible: true }).first();
    this.bodyRows = this.table.locator('tbody tr');
    this.columnHeaders = this.table.locator('thead th');
    this.resultsFooter = page.getByText(RPT_RESULTS_FOOTER).filter({ visible: true }).first();
    this.pageIndicator = page.getByText(RPT_PAGE_INDICATOR).filter({ visible: true }).first();
    this.previousButton = page.getByRole('button', { name: 'Previous', exact: true }).filter({ visible: true }).first();
    this.nextButton = page.getByRole('button', { name: 'Next', exact: true }).filter({ visible: true }).first();
    this.emptyRow = page.getByText(RPT_TEXT.NO_ROWS).filter({ visible: true }).first();
    this.noRowSelected = page.getByText(RPT_TEXT.NO_ROW_SELECTED, { exact: true }).filter({ visible: true }).first();

    this.kpiTiles = page.locator('[data-slot="report-summary-tile"]');
    this.incomeDetailTrigger = page.getByRole('button', { name: /^Income Detail/ });
    this.paymentDetailTrigger = page.getByRole('button', { name: /^Payment Detail/ });
    this.orderDialog = page.getByRole('dialog').filter({ hasText: /^\s*Order detail/ });

    this.staffSearch = page.getByPlaceholder(/^Search by staff name/);
    this.noIncomeSwitch = page.getByRole('switch', { name: RPT_TEXT.NO_INCOME_SWITCH });
    this.staffSummaryTrigger = page.getByRole('button', { name: 'Staff Summary', exact: true });
    this.payrollPeriodHeading = page.getByRole('heading', { level: 3 }).first();

    this.tabs = page.getByRole('tab');
    this.merchantUnavailable = page.getByText(RPT_TEXT.MERCHANT_UNAVAILABLE);
  }

  // ---- navigation --------------------------------------------------------

  /** Default `goto()` = the first report (Daily Sale). */
  async goto(): Promise<void> {
    await this.open(ReportPageSlug.DAILY_SALE);
  }

  /** Open a report by slug, optionally with query params, and wait for the chrome. */
  async open(slug: ReportPageSlugValue | string, query?: Record<string, string> | string): Promise<void> {
    const qs = typeof query === 'string' ? query : query ? `?${new URLSearchParams(query).toString()}` : '';
    await this.page.goto(`${reportPageUrl(slug)}${qs}`, { waitUntil: 'domcontentloaded' });
    await this.waitForShell();
  }

  /** Open a report and wait until its first data block has rendered. */
  async openWithData(slug: ReportPageSlugValue, query?: Record<string, string> | string): Promise<void> {
    await this.open(slug, query);
    await this.waitForData();
  }

  /**
   * Open Daily Sale on the most recent day that has orders — today, else
   * yesterday (the store is live and "today" can legitimately be empty).
   * Returns the ISO day used, or `null` when neither day has orders.
   */
  async openDailyWithRows(): Promise<string | null> {
    for (const days of [0, -1]) {
      const day = rptIsoDay(days);
      await this.openWithData(ReportPageSlug.DAILY_SALE, { after: day, before: day });
      if ((await this.dataRows().count()) > 0) return day;
    }
    return null;
  }

  /**
   * The SPA shell is up (sidebar hydrated). The SPA is slow on DEV: cold
   * hydration under 6 parallel workers was seen to exceed 30s once, so this
   * wait gets a 45s budget (still inside the 60s test timeout).
   */
  async waitForShell(): Promise<void> {
    // Desktop: the nav column. Mobile (<768px): no column, only the drawer toggle.
    await expect(
      this.overviewLink.or(this.sidebar.toggle).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: SHELL_TIMEOUT_MS });
  }

  async waitForReady(): Promise<void> {
    await this.waitForShell();
    await expect(this.pageTitle).toBeVisible({ timeout: Timeouts.LONG });
  }

  /**
   * Data arrived: footer rendered, table header + first body row (data or the
   * empty-state row) visible, and no visible skeleton left. Each block loads
   * through its own request, so the footer alone can precede the rows.
   */
  async waitForData(): Promise<void> {
    await expect(this.resultsFooter).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.columnHeaders.first()).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.bodyRows.first()).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
      timeout: Timeouts.LONG,
    });
  }

  /** Wait for the footer to change away from `previous` (after a filter/sort/page change). */
  async waitForFooterChange(previous: string): Promise<void> {
    await expect
      .poll(async () => (await this.footerText()) !== previous, { timeout: Timeouts.MEDIUM })
      .toBe(true);
  }

  /** Expand the sidebar `Reports` accordion if it is collapsed. */
  async expandReportsGroup(): Promise<void> {
    if ((await this.reportsGroupButton.getAttribute('aria-expanded')) !== 'true') {
      await this.reportsGroupButton.click();
    }
    await expect(this.reportsGroupButton).toHaveAttribute('aria-expanded', 'true');
  }

  reportLink(label: string): Locator {
    return this.reportLinks.filter({ hasText: new RegExp(`^\\s*${escapeRe(label)}\\s*$`) }).first();
  }

  // ---- footer / pagination -----------------------------------------------

  async footerText(): Promise<string> {
    return ((await this.resultsFooter.textContent().catch(() => '')) ?? '').trim();
  }

  /** `{ from, to, total }` out of `Showing 1 to 30 of 316 results`. */
  async footerCounts(): Promise<{ from: number; to: number; total: number }> {
    const m = RPT_RESULTS_FOOTER.exec(await this.footerText());
    if (!m) throw new Error(`Unexpected footer: ${await this.footerText()}`);
    return m[1] !== undefined
      ? { from: Number(m[1]), to: Number(m[2]), total: Number(m[3]) }
      : { from: Number(m[4]), to: Number(m[5]), total: Number(m[6]) };
  }

  /** Data rows only (the empty-state row is excluded). */
  dataRows(): Locator {
    return this.bodyRows.filter({ hasNotText: RPT_TEXT.NO_ROWS });
  }

  // ---- table -------------------------------------------------------------

  /** Header labels as `textContent` (title case; CSS upper-cases them). */
  async headerLabels(): Promise<string[]> {
    return (await this.columnHeaders.allTextContents()).map((t) => t.trim());
  }

  /**
   * Visible text of one column. Payroll name cells carry an avatar initial on a
   * line of its own (`P\nPamela`), so the last line is taken.
   */
  async columnTexts(index: number): Promise<string[]> {
    const cells = this.dataRows().locator(`td:nth-child(${index + 1})`);
    return (await cells.allInnerTexts()).map((t) => t.trim().split('\n').pop()!.trim());
  }

  sortButton(column: string): Locator {
    return this.table.getByRole('button', { name: new RegExp(`^Sort by ${escapeRe(column)}(?:,|$)`) });
  }

  /** `ascending` / `descending` / `none` from the sort button's aria-label. */
  async sortState(column: string): Promise<'ascending' | 'descending' | 'none'> {
    const label = (await this.sortButton(column).getAttribute('aria-label')) ?? '';
    if (/sorted ascending/.test(label)) return 'ascending';
    if (/sorted descending/.test(label)) return 'descending';
    return 'none';
  }

  /** Click a sort header and wait for its aria-label to change. */
  async clickSort(column: string): Promise<void> {
    const before = await this.sortButton(column).getAttribute('aria-label');
    await this.sortButton(column).click();
    await expect(this.sortButton(column)).not.toHaveAttribute('aria-label', before ?? '', {
      timeout: Timeouts.MEDIUM,
    });
  }

  // ---- calendar ----------------------------------------------------------

  dayButton(iso: string): Locator {
    return this.calendar.getByRole('button', { name: rptDayButtonName(iso) }).first();
  }

  // ---- export / print ----------------------------------------------------

  exportMenuItem(name: (typeof RPT_EXPORT_ITEMS)[number]): Locator {
    return this.page.getByRole('menuitem', { name });
  }

  /** Open the Export menu and pick a format; resolves with the download. */
  async download(format: RptExportFormat): Promise<Download> {
    await this.exportButton.click();
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: Timeouts.LONG }),
      this.exportMenuItem(`Download ${format}`).click(),
    ]);
    return download;
  }

  /** Read a CSV download as text. */
  async downloadText(format: RptExportFormat): Promise<{ name: string; text: string; bytes: Buffer }> {
    const dl = await this.download(format);
    const p = await dl.path();
    const fs = await import('node:fs');
    const bytes = fs.readFileSync(p);
    return { name: dl.suggestedFilename(), text: bytes.toString('utf8'), bytes };
  }

  /**
   * Stub `print()` on the page AND on any iframe window the page creates, so
   * Print can be asserted headlessly. Must be called before navigating.
   * Calls land in `window.__rptPrintCalls` as the printed body's textContent
   * (not innerText: parts of the print copy are CSS-hidden on screen media).
   */
  async installPrintSpy(): Promise<void> {
    await this.page.addInitScript(() => {
      const w = window as unknown as { __rptPrintCalls: string[] };
      w.__rptPrintCalls = [];
      window.print = () => {
        w.__rptPrintCalls.push(document.body?.textContent ?? '');
      };
      const desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (!desc?.get) return;
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        configurable: true,
        get() {
          const frameWin = desc.get!.call(this) as (Window & { __rptPatched?: boolean }) | null;
          if (frameWin && !frameWin.__rptPatched) {
            try {
              frameWin.__rptPatched = true;
              frameWin.print = () => {
                w.__rptPrintCalls.push(frameWin.document?.body?.textContent ?? '');
              };
            } catch {
              /* cross-origin frame — ignore */
            }
          }
          return frameWin;
        },
      });
    });
  }

  async printCalls(): Promise<string[]> {
    return this.page.evaluate(() => (window as unknown as { __rptPrintCalls?: string[] }).__rptPrintCalls ?? []);
  }

  // ---- panels ------------------------------------------------------------

  kpiTile(label: string): Locator {
    return this.kpiTiles.filter({ hasText: label }).first();
  }

  /** Text of the right-hand area: everything after the pagination `Next`. */
  async rightPanelText(): Promise<string> {
    const body = await this.page.locator('body').innerText();
    const idx = body.search(/\d+ \/ \d+\s*\n\s*Next\s*\n/);
    return idx >= 0 ? body.slice(idx).replace(/^\d+ \/ \d+\s*\n\s*Next\s*\n/, '') : body;
  }

  /** Slice `text` from heading `from` up to the next heading in `all` (case-sensitive). */
  static section(text: string, from: string, all: readonly string[]): string {
    const start = text.indexOf(from);
    if (start < 0) return '';
    const rest = text.slice(start);
    const ends = all
      .filter((h) => h !== from)
      .map((h) => rest.indexOf(h, from.length))
      .filter((i) => i > 0);
    return ends.length ? rest.slice(0, Math.min(...ends)) : rest;
  }

  /** The date-range trigger's visible label (`Oct 13, 2026` / `Oct 1, 2026 - Oct 13, 2026`). */
  async rangeLabel(): Promise<string> {
    return ((await this.dateRangeButton.innerText()) ?? '').trim();
  }

  /** Current value of a URL query param. */
  param(name: string): string | null {
    return new URL(this.page.url()).searchParams.get(name);
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
