import { type Download, type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { ReportPageSlug, type ReportPageSlugValue, Urls, reportPageUrl } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/* ------------------------------------------------------------------------- *
 * Screen facts (scanned + probed 2026-10-13, re-probed after the design-system
 * refactor 2026-10-20 — docs/test-cases/reports.md)
 *
 *  2026-10-20 deltas: the report name is the `#pos-main` banner `h1`; the Demo
 *  DS Report page is gone; the pagination footer is a `navigation "Pagination"`
 *  (`1–30 of 99`, `Previous page` / `Next page`, `1 / 4`) shown only when there
 *  is more than one page, and every block header carries a `[data-slot=pos-count]`
 *  (`21 rows`, `15 orders`, `99 staff members`); KPI tiles are
 *  `[data-slot=pos-stat]`; range/period/payroll-period pickers are filter chips;
 *  breakdowns (Income Summary row, Staff Payroll row) open in a dialog/sheet;
 *  panel amounts use a Unicode minus (`−$315.00`).
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

/** The report links, in sidebar order (Demo DS Report was removed on DEV by 2026-10-20). */
export const RPT_PAGES: readonly RptPageSpec[] = [
  { slug: ReportPageSlug.DAILY_SALE, label: 'Daily Sale Report', title: 'Daily Sale Report | Portal' },
  { slug: ReportPageSlug.INCOME_SUMMARY, label: 'Income Summary', title: 'Income Summary | Portal' },
  { slug: ReportPageSlug.STAFF_INCOME, label: 'Staff Income', title: 'Staff Income | Portal' },
  { slug: ReportPageSlug.STAFF_PAYROLL, label: 'Staff Payroll', title: 'Staff Payroll | Portal' },
] as const;

/** The four data report pages — each has a table + Export. */
export const RPT_DATA_PAGES = RPT_PAGES;

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

/** Income Detail rows; the collapsible header carries the total (no `Total Payment` row since 2026-10-20). */
export const RPT_INCOME_DETAIL_ROWS = ['Sale', 'Tip', 'Tax Collected'] as const;
export const RPT_PAYMENT_DETAIL_ROWS = [
  'Card',
  'Cash',
  'Others',
  'Amount Collected',
  'Gift Card Redemption',
] as const;

/** Income Summary breakdown groups (sheet dialog after a row click), in order. */
export const RPT_SUMMARY_BREAKDOWN_GROUPS = [
  'Payment details',
  'Sale details',
  'Supply fee',
  'Staff payout',
  'Salon earnings',
] as const;

export const RPT_SUMMARY_CHART_SERIES = ['Gross Income', 'Net Income', 'Total Tip'] as const;
export const RPT_PERIOD_OPTIONS = ['Day', 'Week', 'Month'] as const;
export const RPT_EXPORT_ITEMS = ['Download CSV', 'Download Excel'] as const;

/**
 * Staff Income range presets — the `listbox "Presets"` inside the range popover
 * since 2026-10-20 (Income Summary's popover has a shorter default list).
 */
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
  NO_METRIC: 'No metric selected',
  CURRENT_PERIOD: 'Current Period (Unclosed)',
  ESTIMATED: 'Estimated figures. They keep changing until the period is closed.',
  NO_INCOME_SWITCH: 'Show staff with no income',
  STAFF_INCOME_SEARCH: 'Search by staff name (on report)...',
  STAFF_PAYROLL_SEARCH: 'Search by staff name...',
  MERCHANT_UNAVAILABLE: 'This merchant is not available.',
} as const;

/* ------------------------------- formats -------------------------------- */

export const RPT_CURRENCY = /^[-−]?\$\d{1,3}(?:,\d{3})*\.\d{2}$/;
export const RPT_COUNT = /^\d{1,3}(?:,\d{3})*$/;
export const RPT_PERCENT = /^[+-]?\d+%$/;
export const RPT_ORDER_CODE = /^#OD\d{6}-\d{8}(?: \(Refund\))?$/;
export const RPT_DATE_LABEL = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
/** Range trigger label: `Aug 1 – 21, 2026`, `Jul 25 – Aug 2, 2026`, `Dec 25, 2025 – Jan 2, 2026`. */
export const RPT_DATE_RANGE_LABEL = /^[A-Z][a-z]{2} \d{1,2}(?:, \d{4})? – (?:[A-Z][a-z]{2} )?\d{1,2}, \d{4}$/;
export const RPT_WEEK_LABEL = /^Week \d+ \([A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}, \d{4}\)$/;
export const RPT_MONTH_LABEL = /^[A-Z][a-z]{2} \d{4}$/;
/** Pagination range text (`1–30 of 99`); only rendered when there is more than one page. */
export const RPT_RESULTS_FOOTER = /^(\d+)[–-](\d+) of ([\d,]+)$/;
/** Block header count (`21 rows`, `15 orders`, `99 staff members`). */
export const RPT_RESULT_COUNT = /^([\d,]+)\s+\S.*$/;
export const RPT_PAGE_INDICATOR = /^\d+ \/ \d+$/;
export const RPT_HOUR_LABEL = /^\d{1,2} (?:AM|PM)$/;
export const RPT_PAGE_SIZE = 30;

/** Shell-hydration budget for {@link ReportPagesPage.waitForShell}. */
const SHELL_TIMEOUT_MS = 45_000;

/* ------------------------------ date utils ------------------------------ */

/** The report pages compute "today" in UTC-5 (verified 2026-10-20 17:00 UTC: Today = Oct 20 while UTC+7 was Oct 21). */
const STORE_OFFSET_MS = -5 * 60 * 60 * 1000;

/** `YYYY-MM-DD` of "today" in the store timezone, shifted by `days`. */
export function rptIsoDay(days = 0): string {
  return new Date(Date.now() + STORE_OFFSET_MS + days * 86_400_000).toISOString().slice(0, 10);
}

/** `2026-10-12` → `Oct 12, 2026`. */
export function rptDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Range trigger label as the 2026-10-20 picker renders it: `Today`, `Yesterday`,
 * `Aug 18, 2026` (single day), `Aug 1 – 21, 2026`, `Jul 25 – Aug 2, 2026`,
 * `Dec 25, 2025 – Jan 2, 2026`.
 */
export function rptRangeLabel(after: string, before: string): string {
  if (after === before) {
    if (after === rptIsoDay(0)) return 'Today';
    if (after === rptIsoDay(-1)) return 'Yesterday';
    return rptDateLabel(after);
  }
  const mon = (iso: string) => rptDateLabel(iso).slice(0, 3);
  const day = (iso: string) => Number(iso.slice(8, 10));
  if (after.slice(0, 4) !== before.slice(0, 4)) return `${rptDateLabel(after)} – ${rptDateLabel(before)}`;
  if (after.slice(0, 7) !== before.slice(0, 7)) {
    return `${mon(after)} ${day(after)} – ${mon(before)} ${day(before)}, ${before.slice(0, 4)}`;
  }
  return `${mon(after)} ${day(after)} – ${day(before)}, ${before.slice(0, 4)}`;
}

/** `2026-10-12` → `/October 12th, 2026/` — the day button's aria-label tail. */
export function rptDayButtonName(iso: string): RegExp {
  const d = new Date(`${iso}T00:00:00Z`);
  const month = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = d.getUTCDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return new RegExp(`${month} ${day}${suffix}, ${d.getUTCFullYear()}`);
}

/** `-$1,234.56` / `−$1,234.56` → -1234.56; `1,955` → 1955; anything else → NaN. */
export function rptAmount(text: string): number {
  const cleaned = (text ?? '').replace(/[\s$,]/g, '').replace(/^−/, '-');
  return /^-?\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/**
 * Staff Income summary-strip label matcher. The labels come from Report
 * Configuration and were seen both as `Staff` … `Income` and as `Total Staff`
 * … `Total Income` on 2026-10-20, so the `Total ` prefix is optional.
 */
export function rptStripLabel(label: string): RegExp {
  const base = escapeRe(label.replace(/^Total /, ''));
  return new RegExp(`^(?:Total )?${base}$`);
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
  const value = opts?.counts ? /([-−]?\$[\d,]+\.\d{2}|[-−]?\d[\d,]*)/g : /([-−]?\$[\d,]+\.\d{2})/g;
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

  /** The report name — the `#pos-main` banner `h1`. */
  readonly pageTitle: Locator;
  /** Sidebar accordion trigger `Reports` (Management group). */
  readonly reportsGroupButton: Locator;
  /** The report links inside the `Reports` accordion (folded or not). */
  readonly reportLinks: Locator;
  /** The report links while the accordion is open (`pos-nav-fold[data-open=true]`). */
  readonly openReportLinks: Locator;
  readonly overviewLink: Locator;

  readonly printButton: Locator;
  readonly exportButton: Locator;
  /** Daily Sale single-date trigger (`aria-label="Report date"`). */
  readonly reportDateButton: Locator;
  /** Daily Sale `Today` shortcut (aria-pressed while today is shown). */
  readonly todayButton: Locator;
  /** Income Summary / Staff Income range trigger. */
  readonly dateRangeButton: Locator;
  /** Range popover `listbox "Presets"` (Today, Yesterday, Last 7 days, …). */
  readonly rangePresets: Locator;
  /** Kept for older specs: the range preset list lives inside the range popover now. */
  readonly rangePresetCombobox: Locator;
  /** Income Summary `Group by` filter chip (`Period and date window: Day`). */
  readonly periodCombobox: Locator;
  /** The chip's value text (`Day` / `Week` / `Month`). */
  readonly periodValue: Locator;
  /** Staff Payroll `Payroll period` filter chip. */
  readonly payrollPeriodCombobox: Locator;
  /** The chip's value text (`Oct 16, 2026 - Oct 20, 2026`). */
  readonly payrollPeriodValue: Locator;
  /** Open calendar popover. */
  readonly calendar: Locator;

  readonly table: Locator;
  readonly bodyRows: Locator;
  readonly columnHeaders: Locator;
  /** Count in the table block header (`21 rows`, `15 orders`, `99 staff members`). */
  readonly resultsFooter: Locator;
  /** `navigation "Pagination"` — rendered only when there is more than one page. */
  readonly pagination: Locator;
  /** Pagination range text `1–30 of 99`. */
  readonly paginationRange: Locator;
  readonly pageIndicator: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;
  readonly emptyRow: Locator;

  readonly kpiTiles: Locator;
  readonly incomeDetailTrigger: Locator;
  readonly paymentDetailTrigger: Locator;
  readonly orderDialog: Locator;
  /** Row breakdown dialog/sheet (Income Summary, Staff Payroll). */
  readonly breakdownDialog: Locator;

  readonly staffSearch: Locator;
  readonly noIncomeSwitch: Locator;
  /** Staff Income summary strip (Staff / Orders / Subtotal / Supply Fee / Tip / Income). */
  readonly staffSummary: Locator;
  /** Staff Payroll period heading (`h3`, `Oct 16, 2026 - Oct 20, 2026`). */
  readonly payrollPeriodHeading: Locator;
  /** Staff Payroll `Live` badge (current, unclosed period). */
  readonly liveBadge: Locator;

  readonly merchantUnavailable: Locator;
  /** Error card for an unknown slug / failed layout (`Unable to load reports`). */
  readonly loadError: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.pageTitle = page.locator('#pos-main').getByRole('banner').getByRole('heading', { level: 1 });
    this.reportsGroupButton = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Reports', exact: true });
    const reportsLi = page
      .getByRole('navigation', { name: 'Main' })
      .locator('li[data-slot="pos-nav-li"]')
      .filter({ has: page.locator(':scope > button[data-slot="pos-nav-item"]', { hasText: /^Reports$/ }) });
    this.reportLinks = reportsLi.locator('[data-slot="pos-nav-fold"] a[href*="/report-pages/"]');
    this.openReportLinks = reportsLi.locator('[data-slot="pos-nav-fold"][data-open="true"] a[href*="/report-pages/"]');
    this.overviewLink = page.locator('a[href$="/overview"]').first();

    this.printButton = page.locator('#pos-main').getByRole('button', { name: 'Print', exact: true }).first();
    this.exportButton = page.getByRole('button', { name: 'Export', exact: true }).filter({ visible: true }).first();
    this.reportDateButton = page.getByRole('button', { name: 'Report date', exact: true });
    this.todayButton = page.locator('#pos-main').getByRole('button', { name: 'Today', exact: true });
    this.dateRangeButton = page.getByRole('button', { name: 'Report date range', exact: true });
    this.rangePresets = page.getByRole('listbox', { name: 'Presets' });
    this.rangePresetCombobox = this.rangePresets;
    this.periodCombobox = page.getByRole('button', { name: /^Period and date window/ });
    this.periodValue = this.periodCombobox.locator('[data-slot="pos-filter-value"]');
    this.payrollPeriodCombobox = page.getByRole('button', { name: /^Payroll period/ });
    this.payrollPeriodValue = this.payrollPeriodCombobox.locator('[data-slot="pos-filter-value"]');
    this.calendar = page.getByRole('dialog').filter({ has: page.getByRole('grid') });

    this.table = page.locator('#pos-main table').filter({ visible: true }).first();
    this.bodyRows = this.table.locator('tbody tr');
    this.columnHeaders = this.table.locator('thead th');
    this.resultsFooter = page
      .locator('[data-slot="pos-card"]')
      .filter({ has: page.locator('table') })
      .locator('[data-slot="pos-count"]')
      .filter({ visible: true })
      .first();
    this.pagination = page.getByRole('navigation', { name: 'Pagination' }).filter({ visible: true }).first();
    this.paginationRange = this.pagination.getByText(RPT_RESULTS_FOOTER);
    this.pageIndicator = this.pagination.getByText(RPT_PAGE_INDICATOR);
    this.previousButton = this.pagination.getByRole('button', { name: 'Previous page' });
    this.nextButton = this.pagination.getByRole('button', { name: 'Next page' });
    this.emptyRow = page.locator('[data-slot="pos-empty-state-title"]').filter({ hasText: RPT_TEXT.NO_ROWS }).filter({ visible: true }).first();

    this.kpiTiles = page.locator('[data-slot="report-block-summary"] [data-slot="pos-stat"]');
    this.incomeDetailTrigger = page.getByRole('button', { name: /^Income Detail/ });
    this.paymentDetailTrigger = page.getByRole('button', { name: /^Payment Detail/ });
    this.orderDialog = page.getByRole('dialog', { name: 'Order detail' });
    this.breakdownDialog = page.getByRole('dialog').filter({ hasText: /· Breakdown/ });

    this.staffSearch = page.getByPlaceholder(/^Search by staff name/);
    this.noIncomeSwitch = page.getByRole('switch', { name: RPT_TEXT.NO_INCOME_SWITCH });
    this.staffSummary = page.locator('[data-slot="pos-stat-strip"]').first();
    this.payrollPeriodHeading = page.locator('#pos-main').getByRole('heading', { level: 3 }).first();
    this.liveBadge = page.locator('[data-slot="pos-badge"]').filter({ hasText: /^Live$/ });

    this.merchantUnavailable = page.getByText(RPT_TEXT.MERCHANT_UNAVAILABLE);
    this.loadError = page.getByText('Unable to load reports');
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
   * Data arrived: block count rendered, table header + first body row (data or
   * the empty-state row) visible, and no visible skeleton left. Each block
   * loads through its own request, so the count alone can precede the rows.
   */
  async waitForData(): Promise<void> {
    await expect(this.resultsFooter).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.columnHeaders.first()).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.bodyRows.first()).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.page.locator('[data-slot*="skeleton"]:visible')).toHaveCount(0, {
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

  /** Block count text plus the pagination range when present (`99 staff members | 1–30 of 99`). */
  async footerText(): Promise<string> {
    const count = ((await this.resultsFooter.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
    const range = (await this.pagination.isVisible().catch(() => false))
      ? ((await this.paginationRange.textContent().catch(() => '')) ?? '').trim()
      : '';
    return range ? `${count} | ${range}` : count;
  }

  /** Total from the block count; `from`/`to` from the pagination range (or the single page). */
  async footerCounts(): Promise<{ from: number; to: number; total: number }> {
    const countText = ((await this.resultsFooter.textContent()) ?? '').replace(/\s+/g, ' ').trim();
    const c = RPT_RESULT_COUNT.exec(countText);
    if (!c) throw new Error(`Unexpected result count: ${countText}`);
    const total = Number(c[1].replace(/,/g, ''));
    if (await this.pagination.isVisible().catch(() => false)) {
      const m = RPT_RESULTS_FOOTER.exec(((await this.paginationRange.textContent()) ?? '').trim());
      if (m) return { from: Number(m[1]), to: Number(m[2]), total };
    }
    return total === 0 ? { from: 0, to: 0, total } : { from: 1, to: total, total };
  }

  /** Assert the block count reads `<n> <noun>` (e.g. `0 orders`). */
  async expectTotal(n: number): Promise<void> {
    await expect(this.resultsFooter).toHaveText(new RegExp(`^${n}\\s+\\S`), { timeout: Timeouts.MEDIUM });
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

  /**
   * Text of the "right-hand" area: an open breakdown dialog/sheet when there is
   * one, else every page card that holds no table (Daily Sale summary + detail
   * panels).
   */
  async rightPanelText(): Promise<string> {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    if (await dialog.isVisible().catch(() => false)) return dialog.innerText();
    const cards = this.page.locator('#pos-main [data-slot="pos-card"]').filter({ hasNot: this.page.locator('table') });
    return (await cards.allInnerTexts()).join('\n');
  }

  /** Value of one Staff Income summary strip item (`Staff`, `Orders`, …, `Income`), '' when absent. */
  async stripValue(label: string): Promise<string> {
    const item = this.staffSummary
      .locator('[data-slot="pos-stat-strip-item"]')
      .filter({ has: this.page.locator('[data-slot="pos-stat-strip-label"]', { hasText: rptStripLabel(label) }) });
    return ((await item.locator('[data-slot="pos-stat-strip-value"]').textContent().catch(() => '')) ?? '').trim();
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

  /** The date-range trigger's visible label (`Today` / `Aug 18, 2026` / `Aug 1 – 21, 2026`). */
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
