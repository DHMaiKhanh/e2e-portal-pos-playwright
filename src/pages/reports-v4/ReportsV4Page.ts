import { type APIResponse, type Download, type Locator, type Page, expect } from '@playwright/test';
import { env } from '@configs/env/loadEnv';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { ReportV4Slug, type ReportV4SlugValue, Urls, reportV4Url } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { rptAmount, rptDayButtonName } from '@pages/reports/ReportPagesPage';

/* ------------------------------------------------------------------------- *
 * Screen facts (scanned 2026-10-20 — docs/test-cases/reports-v4.md)
 *
 *  - Pages under `/pos/<seg>/<id>/v4/reports/<slug>`, rendered from the
 *    Report Configuration V4 page/block/report config. Sidebar accordion
 *    `Reports V4` (Management group) lists four of them; `staff-income-detail`
 *    is only reached by clicking a Staff Income row.
 *  - Heading is a real `h1[data-slot="pos-page-heading"]` with a `V4` badge.
 *  - URL state: `after` / `before` (YYYY-MM-DD), `metric` (Daily Sale tile),
 *    `period=weekly|monthly` (Income Summary), `include_no_income`, `search`,
 *    `period_id` (Payroll), `staff_id` (Staff Income Detail). `?date=` is
 *    ignored.
 *  - "Today" follows the STORE timezone (UTC-5 for store 100004), not the
 *    runner's — specs pin a data-bearing day instead of computing today.
 *  - Daily Sale KPI tiles are `section[data-slot="pos-stat"][role=button]`;
 *    the active one has `data-selected="true"`.
 *  - Row click opens a `dialog-content` (Daily Sale order) or a
 *    `sheet-content` (Income Summary / Payroll breakdown). Staff Income row
 *    click navigates to `staff-income-detail`.
 *  - Pickers are popovers (`pos-popover-content`, role=dialog) whose choices
 *    are `role=option` (range presets, group-by, payroll periods).
 * ------------------------------------------------------------------------- */

export interface Rv4PageSpec {
  slug: ReportV4SlugValue;
  label: string;
  title: string;
}

/** The four sidebar entries, in sidebar order. */
export const RV4_PAGES: readonly Rv4PageSpec[] = [
  {
    slug: ReportV4Slug.DAILY_SALE,
    label: 'Daily Sale Report',
    title: 'Daily Sale Report | Portal',
  },
  { slug: ReportV4Slug.INCOME_SUMMARY, label: 'Income Summary', title: 'Income Summary | Portal' },
  { slug: ReportV4Slug.STAFF_INCOME, label: 'Staff Income', title: 'Staff Income | Portal' },
  { slug: ReportV4Slug.STAFF_PAYROLL, label: 'Staff Payroll', title: 'Staff Payroll | Portal' },
] as const;

/** Day with stable historical data on DEV store 100004 (15 orders on Daily Sale). */
export const RV4_DATA_DAY = '2026-08-18';
/** A closed payroll period that covers {@link RV4_DATA_DAY}. */
export const RV4_CLOSED_PERIOD = 'Aug 7, 2026 - Aug 20, 2026';

export const RV4_COLUMNS = {
  dailySale: ['Order #', 'Sale/Refund', 'Tax', 'Tip', 'Total'],
  incomeSummary: ['Date', 'Sale', 'Tip', 'Tax', 'Total Payment'],
  staffIncome: ['Staff', 'Orders', 'Subtotal', 'Supply Fee', 'Tip', 'Total Income'],
  staffIncomeDetail: ['Order #', 'Date', 'Customer', 'Services', 'Sale/Refund', 'Supply', 'Tip'],
  staffPayroll: ['Name', 'Orders', 'Subtotal', 'Supply Fee', 'Tip', 'Total Income'],
} as const;

/** Daily Sale KPI tile label → `?metric=` value → chart title. */
export const RV4_DAILY_KPIS = [
  { label: 'Total Orders', metric: 'numberOfOrders', chart: 'Total Orders by Hour' },
  { label: 'Sale Income', metric: 'dailySaleSale', chart: 'Sale Income by Hour' },
  { label: 'Total Tip', metric: 'dailySaleTip', chart: 'Total Tip by Hour' },
  { label: 'Total Payment', metric: 'dailySaleTotalPayment', chart: 'Total Payment by Hour' },
] as const;

export const RV4_RANGE_PRESETS = [
  'Today',
  'Yesterday',
  'Last 7 days',
  'Last 30 days',
  'This month',
  'Last month',
] as const;
export const RV4_GROUP_BY = ['Day', 'Week', 'Month'] as const;
export const RV4_EXPORT_ITEMS = ['Download CSV', 'Download Excel'] as const;

export const RV4_TEXT = {
  NO_METRIC: 'No metric selected',
  NO_METRIC_HINT: 'Pick a metric above to see its chart.',
  NO_INCOME_SWITCH: 'Show staff with no income',
  CURRENT_PERIOD: 'Current Period (Unclosed)',
  ESTIMATED: 'Estimated figures. They keep changing until the period is closed.',
  LOAD_FAILURE: 'Unable to load reports',
  MERCHANT_LOAD_FAILURE: "We couldn't load this merchant",
} as const;

/** Money as rendered: tables/panels use the Unicode minus `−` (U+2212), KPI tiles an ASCII `-`. */
export const RV4_CURRENCY = /^[-−]?\$\d{1,3}(?:,\d{3})*\.\d{2}$/;
export const RV4_PERCENT = /^[+-]?\d+%$/;
export const RV4_ORDER_CODE = /^#OD\d{6}-\d{8}/;
export const RV4_DATE_LABEL = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
export const RV4_WEEK_LABEL = /^Week \d+ \([A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}, \d{4}\)$/;
export const RV4_PAGINATION_RANGE = /^(\d+)–(\d+) of (\d+)$/;
export const RV4_PAGE_SIZE = 30;

/** `/pos/<seg>/<id>/v4/reports/<slug>` matcher (store id never hardcoded). */
export function rv4UrlPattern(slug: string): RegExp {
  return new RegExp(`/pos/[\\w-]+/\\d+/v4/reports/${slug}(?:[?#]|$)`);
}

/** `−$1,234.56` / `-$1,234.56` → -1234.56; `15` → 15; anything else → NaN. */
export function rv4Amount(text: string): number {
  return rptAmount((text ?? '').replace(/−/g, '-'));
}

/** Round to cents so float sums compare cleanly. */
export function rv4Cents(n: number): number {
  return Math.round(n * 100);
}

/** `2026-08-18` → `Aug 18, 2026`. */
export function rv4DateLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Days between two ISO dates (inclusive count). */
export function rv4DayCount(after: string, before: string): number {
  return (Date.parse(`${before}T00:00:00Z`) - Date.parse(`${after}T00:00:00Z`)) / 86_400_000 + 1;
}

export type Rv4ExportFormat = 'CSV' | 'Excel';

/* ------------------------------------------------------------------------- */

/**
 * Reports V4 — one Page Object for every `/v4/reports/<slug>` page; they share
 * the header, pickers, Export menu, sortable table, pagination and panels.
 */
export class ReportsV4Page extends BasePage {
  protected readonly path = Urls.REPORTS_V4;

  readonly sidebar: Sidebar;

  readonly heading: Locator;
  readonly v4Badge: Locator;
  readonly legacyLink: Locator;
  readonly reportsV4GroupButton: Locator;
  readonly reportLinks: Locator;

  readonly printButton: Locator;
  readonly exportButton: Locator;
  readonly expandTableButton: Locator;
  readonly todayButton: Locator;
  /** Daily Sale single-day trigger. */
  readonly reportDateButton: Locator;
  /** Income Summary / Staff Income range trigger. */
  readonly dateRangeButton: Locator;
  /** Income Summary `Group by` chip (`Period and date window: Day`). */
  readonly groupByChip: Locator;
  /** Staff Payroll period chip (`Payroll period: <range>`). */
  readonly payrollPeriodChip: Locator;
  /** Any open picker popover. */
  readonly popover: Locator;

  readonly table: Locator;
  readonly bodyRows: Locator;
  readonly footRow: Locator;
  readonly columnHeaders: Locator;
  readonly countNumber: Locator;
  readonly paginationRange: Locator;
  readonly paginationPage: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;

  readonly statTiles: Locator;
  readonly dialog: Locator;
  readonly sheet: Locator;

  readonly staffSearch: Locator;
  readonly noIncomeSwitch: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.heading = page.locator('h1[data-slot="pos-page-heading"]').first();
    this.v4Badge = this.heading.locator('[data-slot="pos-badge"]');
    this.legacyLink = page.getByRole('link', { name: 'Open in legacy' });
    this.reportsV4GroupButton = page.getByRole('button', { name: 'Reports V4', exact: true });
    this.reportLinks = page.locator('a[href*="/v4/reports/"]');

    const main = page.locator('#pos-main');
    this.printButton = main.getByRole('button', { name: 'Print', exact: true }).first();
    this.exportButton = main
      .getByRole('button', { name: 'Export', exact: true })
      .filter({ visible: true })
      .first();
    this.expandTableButton = main.getByRole('button', { name: 'Expand table' }).first();
    this.todayButton = main.getByRole('button', { name: 'Today', exact: true });
    this.reportDateButton = main.getByRole('button', { name: 'Report date', exact: true });
    this.dateRangeButton = main.getByRole('button', { name: 'Report date range', exact: true });
    this.groupByChip = main.getByRole('button', { name: /^Period and date window/ });
    this.payrollPeriodChip = main.getByRole('button', { name: /^Payroll period/ });
    this.popover = page
      .locator('[data-slot="pos-popover-content"], [data-slot="pos-combobox-list"]')
      .filter({ visible: true })
      .first();

    this.table = main.locator('table').filter({ visible: true }).first();
    this.bodyRows = this.table.locator('tbody tr');
    this.footRow = this.table.locator('tfoot tr').first();
    this.columnHeaders = this.table.locator('thead th');
    this.countNumber = main.locator('[data-slot="pos-count-number"]').first();
    this.paginationRange = main.locator('[data-slot="pos-pagination-range"]').first();
    this.paginationPage = main.locator('[data-slot="pos-pagination-page"]').first();
    this.previousPageButton = main.getByRole('button', { name: 'Previous page' });
    this.nextPageButton = main.getByRole('button', { name: 'Next page' });

    this.statTiles = main.locator('[data-slot="pos-stat"]');
    this.dialog = page.locator('[role="dialog"][data-slot="dialog-content"]').first();
    this.sheet = page.locator('[role="dialog"][data-slot="sheet-content"]').first();

    this.staffSearch = main.getByPlaceholder(/^Search by staff/);
    this.noIncomeSwitch = main.getByRole('switch');
  }

  // ---- navigation --------------------------------------------------------

  async goto(): Promise<void> {
    await this.open(ReportV4Slug.DAILY_SALE);
  }

  /** Open a page by slug (optionally with query) and wait for the shell. */
  async open(
    slug: ReportV4SlugValue | string,
    query?: Record<string, string> | string,
  ): Promise<void> {
    const qs =
      typeof query === 'string' ? query : query ? `?${new URLSearchParams(query).toString()}` : '';
    await this.page.goto(`${reportV4Url(slug)}${qs}`, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  /** Open and wait until the first table has rows (or headers for an empty table). */
  async openWithData(
    slug: ReportV4SlugValue | string,
    query?: Record<string, string> | string,
  ): Promise<void> {
    await this.open(slug, query);
    await this.waitForData();
  }

  /** Heading rendered, or one of the full-page error states. */
  async waitForReady(): Promise<void> {
    await expect(
      this.heading
        .or(this.page.getByText(RV4_TEXT.MERCHANT_LOAD_FAILURE))
        .or(this.page.getByText(RV4_TEXT.LOAD_FAILURE))
        .first(),
    ).toBeVisible({ timeout: 45_000 });
  }

  /** After an in-app navigation: heading switched to `text`, then data rendered. */
  async waitForHeading(text: string): Promise<void> {
    await expect(this.heading).toContainText(text, { timeout: Timeouts.LONG });
    await this.waitForData();
  }

  async waitForData(): Promise<void> {
    await expect(this.columnHeaders.first()).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.page.locator('#pos-main [data-slot="skeleton"]:visible')).toHaveCount(0, {
      timeout: Timeouts.LONG,
    });
  }

  async expandReportsV4Group(): Promise<void> {
    if ((await this.reportsV4GroupButton.getAttribute('aria-expanded')) !== 'true') {
      await this.reportsV4GroupButton.click();
    }
    await expect(this.reportsV4GroupButton).toHaveAttribute('aria-expanded', 'true');
  }

  reportLink(label: string): Locator {
    return this.reportLinks.filter({ hasText: new RegExp(`^\\s*${escapeRe(label)}\\s*$`) }).first();
  }

  /** Current value of a URL query param. */
  param(name: string): string | null {
    return new URL(this.page.url()).searchParams.get(name);
  }

  // ---- pickers -----------------------------------------------------------

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name }).filter({ visible: true }).first();
  }

  dayButton(iso: string): Locator {
    return this.popover.getByRole('button', { name: rptDayButtonName(iso) }).first();
  }

  /** Open the Daily Sale calendar and page back/forward to the month of `iso`. */
  async pickDay(iso: string): Promise<void> {
    await this.reportDateButton.click();
    await expect(this.popover).toBeVisible();
    for (let i = 0; i < 24 && !(await this.dayButton(iso).isVisible()); i++) {
      const shown = (await this.popover.innerText()).match(/([A-Z][a-z]+) (\d{4})/);
      const shownKey = shown
        ? Number(shown[2]) * 12 + new Date(`${shown[1]} 1, 2000`).getMonth()
        : 0;
      const wantKey = Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
      await this.popover
        .getByRole('button', {
          name: wantKey < shownKey ? 'Go to the Previous Month' : 'Go to the Next Month',
        })
        .click();
    }
    await this.dayButton(iso).click();
  }

  /** Pick a range preset (Income Summary / Staff Income) — it applies and closes at once. */
  async pickRangePreset(preset: (typeof RV4_RANGE_PRESETS)[number]): Promise<void> {
    const url = this.page.url();
    await this.dateRangeButton.click();
    await this.option(preset).click();
    await expect(this.dateRangeButton).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => this.page.url(), { timeout: Timeouts.MEDIUM }).not.toBe(url);
  }

  async pickGroupBy(value: (typeof RV4_GROUP_BY)[number]): Promise<void> {
    await this.groupByChip.click();
    await this.option(value).click();
    await expect(this.groupByChip).toHaveAttribute('aria-label', new RegExp(`: ${value}$`));
  }

  async pickPayrollPeriod(label: string): Promise<void> {
    await this.payrollPeriodChip.click();
    await this.option(new RegExp(`^${escapeRe(label)}`)).click();
    await expect(this.payrollPeriodChip).toHaveAttribute('aria-label', `Payroll period: ${label}`);
  }

  // ---- KPI tiles ---------------------------------------------------------

  stat(label: string): Locator {
    return this.statTiles
      .filter({ has: this.page.locator('[data-slot="pos-stat-label"]', { hasText: label }) })
      .first();
  }

  async statValue(label: string): Promise<string> {
    return (
      (await this.stat(label).locator('[data-slot="pos-stat-value"]').first().innerText()) ?? ''
    ).trim();
  }

  chartTitle(title: string): Locator {
    return this.page.locator('#pos-main').getByText(title, { exact: true }).first();
  }

  // ---- table -------------------------------------------------------------

  async headerLabels(): Promise<string[]> {
    return (await this.columnHeaders.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  /** Visible text of one column (last line — payroll name cells carry an avatar initial). */
  async columnTexts(index: number): Promise<string[]> {
    const cells = this.bodyRows.locator(`td:nth-child(${index + 1})`);
    return (await cells.allInnerTexts()).map((t) => t.trim().split('\n').pop()!.trim());
  }

  async columnSum(index: number): Promise<number> {
    return (await this.columnTexts(index)).reduce((s, t) => s + rv4Amount(t), 0);
  }

  /** The tfoot "Total" row's cells. */
  async footTexts(): Promise<string[]> {
    return (await this.footRow.locator('td,th').allInnerTexts()).map((t) => t.trim());
  }

  /** The "<n> orders / staff members" count shown in the table card header. */
  async countValue(): Promise<number> {
    return rv4Amount((await this.countNumber.innerText()).trim());
  }

  async paginationCounts(): Promise<{ from: number; to: number; total: number }> {
    const text = (await this.paginationRange.innerText()).trim();
    const m = RV4_PAGINATION_RANGE.exec(text);
    if (!m) throw new Error(`Unexpected pagination range: ${text}`);
    return { from: Number(m[1]), to: Number(m[2]), total: Number(m[3]) };
  }

  sortButton(column: string): Locator {
    return this.table.getByRole('button', {
      name: new RegExp(`^Sort by ${escapeRe(column)}(?:,|$)`),
    });
  }

  async sortState(column: string): Promise<'ascending' | 'descending' | 'none'> {
    const label = (await this.sortButton(column).getAttribute('aria-label')) ?? '';
    if (/sorted ascending/.test(label)) return 'ascending';
    if (/sorted descending/.test(label)) return 'descending';
    return 'none';
  }

  /** Rows (re-rendered after a server-side sort) follow the header's current direction. */
  async expectColumnSorted(
    column: string,
    index: number,
  ): Promise<'ascending' | 'descending' | 'none'> {
    const dir = await this.sortState(column);
    if (dir === 'none') return dir;
    await expect
      .poll(
        async () => {
          const v = (await this.columnTexts(index)).map(rv4Amount);
          return v.every(
            (x, i) => i === 0 || (dir === 'ascending' ? v[i - 1] <= x : v[i - 1] >= x),
          );
        },
        { timeout: Timeouts.MEDIUM, message: `${column} sorted ${dir}` },
      )
      .toBe(true);
    return dir;
  }

  async clickSort(column: string): Promise<void> {
    const before = await this.sortButton(column).getAttribute('aria-label');
    await this.sortButton(column).click();
    await expect(this.sortButton(column)).not.toHaveAttribute('aria-label', before ?? '', {
      timeout: Timeouts.MEDIUM,
    });
  }

  // ---- panels ------------------------------------------------------------

  /** `label → amount` pairs of a panel's text (labels followed by a `$` value on the next line). */
  static amounts(text: string): Map<string, number> {
    const map = new Map<string, number>();
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      // breakdown sheets print a formula hint between label and value: "(Total Income x 50%)"
      .filter((l) => l && !/^\(.*\)$/.test(l));
    for (let i = 0; i < lines.length - 1; i++) {
      if (!/\$/.test(lines[i]) && RV4_CURRENCY.test(lines[i + 1]) && !map.has(lines[i])) {
        map.set(lines[i], rv4Amount(lines[i + 1]));
      }
    }
    // a one-line hint between label and value: "Tax Collected" / "Sales tax collected, …" / "$0.00"
    for (let i = 0; i < lines.length - 2; i++) {
      const [label, hint, value] = [lines[i], lines[i + 1], lines[i + 2]];
      if (map.has(label) || /\$/.test(label) || /\$/.test(hint)) continue;
      if (RV4_CURRENCY.test(value) && map.get(hint) === rv4Amount(value))
        map.set(label, rv4Amount(value));
    }
    return map;
  }

  async mainAmounts(): Promise<Map<string, number>> {
    return ReportsV4Page.amounts(await this.page.locator('#pos-main').innerText());
  }

  // ---- chart -------------------------------------------------------------

  /** The first Recharts chart on the page. */
  get chart(): Locator {
    return this.page.locator('#pos-main .recharts-wrapper').first();
  }

  get chartLegendItems(): Locator {
    return this.chart.locator('.recharts-legend-item');
  }

  /**
   * Hover the chart at a horizontal fraction of its width and return the tooltip text
   * (`"3 PM\n\nSale : $554.00"`), '' when no tooltip shows.
   */
  async chartTooltipAt(fraction: number): Promise<string> {
    const box = await this.chart.boundingBox();
    if (!box) return '';
    await this.page.mouse.move(box.x + box.width * fraction, box.y + box.height * 0.6);
    const tip = this.chart.locator('.recharts-tooltip-wrapper');
    await expect(tip).toBeVisible({ timeout: Timeouts.SHORT });
    return (await tip.innerText()).trim();
  }

  // ---- report API (volt-pos host) ------------------------------------------

  /**
   * GET a V4 report endpoint with this browser session's cookies. `merchant`
   * becomes the `x-merch-id` header the portal sends (omit with `null`).
   */
  async api(path: string, merchant: string | null = env.STORE_ID): Promise<APIResponse> {
    return this.page.request.get(`${env.API_URL}${path}`, {
      headers: merchant ? { 'x-merch-id': merchant } : {},
      failOnStatusCode: false,
    });
  }

  /**
   * Precondition for tests that assert the DEFAULT layout of a page: fail loudly (not with a
   * misleading data mismatch) when someone left a merchant override of it on the suite store.
   */
  async expectDefaultLayout(slug: string): Promise<void> {
    const res = await this.api(`/v4/report_pages/${slug}/layout`);
    const body = (await res.json()) as { scope?: string; version?: number; publishedAt?: string };
    expect(
      body.scope,
      `ENV: "${slug}" on store ${env.STORE_ID} is a merchant override (v${body.version}, published ` +
        `${body.publishedAt}) — someone customised it; revert it in Report Configuration V4 › Pages`,
    ).not.toBe('merchant');
  }

  // ---- export / print ----------------------------------------------------

  exportMenuItem(name: (typeof RV4_EXPORT_ITEMS)[number]): Locator {
    return this.page.getByRole('menuitem', { name });
  }

  async download(format: Rv4ExportFormat): Promise<Download> {
    await this.exportButton.click();
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: Timeouts.LONG }),
      this.exportMenuItem(`Download ${format}`).click(),
    ]);
    return download;
  }

  async downloadText(format: Rv4ExportFormat): Promise<{ name: string; text: string }> {
    const dl = await this.download(format);
    const fs = await import('node:fs');
    return {
      name: dl.suggestedFilename(),
      text: fs.readFileSync(await dl.path()).toString('utf8'),
    };
  }

  /** Stub `print()` (page + iframes) so Print is assertable headlessly. Call before navigating. */
  async installPrintSpy(): Promise<void> {
    await this.page.addInitScript(() => {
      const w = window as unknown as { __rv4Print: number };
      w.__rv4Print = 0;
      window.print = () => {
        w.__rv4Print++;
      };
      const desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (!desc?.get) return;
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        configurable: true,
        get() {
          const fw = desc.get!.call(this) as (Window & { __rv4Patched?: boolean }) | null;
          if (fw && !fw.__rv4Patched) {
            try {
              fw.__rv4Patched = true;
              fw.print = () => {
                w.__rv4Print++;
              };
            } catch {
              /* cross-origin frame */
            }
          }
          return fw;
        },
      });
    });
  }

  async printCount(): Promise<number> {
    return this.page.evaluate(() => (window as unknown as { __rv4Print?: number }).__rv4Print ?? 0);
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
