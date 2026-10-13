import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls, posAdminBase } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { addDays, toIsoDate } from '@utils/dateUtils';

/* ------------------------------------------------------------------------- *
 * Screen facts (scanned 2026-08-21 — docs/test-cases/income.md)
 *
 * Two facts shape every locator below:
 *
 *  1. There is NOT ONE heading (`h1`–`h6`) and NOT ONE `data-testid` on the
 *     whole screen. Everything is reached by role, text or placeholder.
 *  2. All three tab panels stay MOUNTED at once — the scan found three
 *     `<table>` elements while the Daily tab was showing, plus a hidden
 *     `Income period` combobox, a hidden `Search by staff name...` input and a
 *     hidden `Clear filters` button. Page-level locators therefore have to be
 *     narrowed with `filter({ visible: true })` (or scoped to
 *     {@link IncomePage.activePanel}) or they resolve against another tab's
 *     hidden copy.
 * ------------------------------------------------------------------------- */

/** `document.title` for the screen. */
export const INCOME_PAGE_TITLE = 'Income Reports | Portal';

/** The on-page label. Rendered as loose text, not a heading. */
export const INCOME_SCREEN_LABEL = 'Income Reports (Legacy)';

/** Store-scoped route matcher — the app injects the `nail` vertical segment. */
export const INCOME_URL_PATTERN = /\/pos\/nail\/\d+\/income/;

/** `?tab=` values. Anything else is normalised back to `daily`. */
export const IncomeTab = {
  DAILY: 'daily',
  SUMMARY: 'summary',
  STAFF: 'staff',
} as const;

/** The tab strip, in render order: `role="tab"` on `<button>` elements. */
export const INCOME_TABS = [
  { value: IncomeTab.DAILY, label: 'Daily Sale Report' },
  { value: IncomeTab.SUMMARY, label: 'Income Summary' },
  { value: IncomeTab.STAFF, label: 'Staff Income' },
] as const;

export type IncomeTabValue = (typeof INCOME_TABS)[number]['value'];

/** Just the labels, in order — asserted by the tab-strip cases. */
export const INCOME_TAB_LABELS = INCOME_TABS.map((tab) => tab.label);

/** URL matcher for one tab, e.g. `/pos/nail/14/income?tab=summary`. */
export function incomeTabUrlPattern(tab: IncomeTabValue): RegExp {
  return new RegExp(`/pos/nail/\\d+/income\\?[^#]*tab=${tab}`);
}

/** Visible label for a `?tab=` value. */
export function incomeTabLabel(tab: IncomeTabValue): string {
  const found = INCOME_TABS.find((entry) => entry.value === tab);
  if (!found) throw new Error(`Unknown income tab: ${tab}`);
  return found.label;
}

/**
 * The four Daily KPI cards, in render order.
 *
 * Each card is a `<button>` whose accessible name concatenates everything it
 * shows — `"Total Orders 2 -95% vs Yesterday"` — and which carries
 * `aria-pressed` for the currently charted series. `About <label>` is a
 * separate info button beside it.
 *
 * `chartTitle` follows the rule TC-INC-041 states (`<label> by Hour`);
 * `Sale Income by Hour` and `Total Tip by Hour` are the two the scan saw
 * rendered. `legend` / `emptyState` are recorded only where observed.
 */
export const INCOME_KPI_CARDS = [
  {
    label: 'Total Orders',
    stat: 'totalOrders',
    chartTitle: 'Total Orders by Hour',
    tooltip: 'Total number of orders (exclude refunds, and manual refunds).',
  },
  {
    label: 'Sale Income',
    stat: 'saleIncome',
    chartTitle: 'Sale Income by Hour',
    legend: 'Sale',
    tooltip:
      'Total sale amount of the order, including refund/partial refund values after discount is applied, excluding Tax and Tip.',
  },
  {
    label: 'Total Tip',
    stat: 'totalTip',
    chartTitle: 'Total Tip by Hour',
    legend: 'Total Tips',
    emptyState: 'No total tip recorded for this day yet.',
    tooltip: 'Total tips received, not included in sales revenue but counted in collected amounts.',
  },
  {
    label: 'Total Payment',
    stat: 'totalPayment',
    chartTitle: 'Total Payment by Hour',
    tooltip: 'The final revenue includes Gift Card Redemption.',
  },
] as const;

export type IncomeKpiLabel = (typeof INCOME_KPI_CARDS)[number]['label'];
/** `?stat=` values the Daily tab accepts. */
export type IncomeStatValue = (typeof INCOME_KPI_CARDS)[number]['stat'];

/** KPI descriptor for a label. */
export function incomeKpiCard(label: IncomeKpiLabel): (typeof INCOME_KPI_CARDS)[number] {
  const found = INCOME_KPI_CARDS.find((card) => card.label === label);
  if (!found) throw new Error(`Unknown income KPI card: ${label}`);
  return found;
}

/** `?period=` values on the Summary tab. Anything else falls back to `day`. */
export const IncomePeriod = { DAY: 'day', WEEK: 'week', MONTH: 'month' } as const;

export type IncomePeriodValue = (typeof IncomePeriod)[keyof typeof IncomePeriod];

/** The three `role="option"` labels behind the `Income period` combobox. */
export const INCOME_PERIOD_OPTIONS = ['Day', 'Week', 'Month'] as const;

export type IncomePeriodOption = (typeof INCOME_PERIOD_OPTIONS)[number];

/**
 * Daily `Order Details` headers **as the DOM holds them**.
 *
 * The screen renders them upper-cased (`ORDER #`), but that is CSS
 * `text-transform` — `textContent` is title case, which is what a
 * `getByRole('columnheader', { name })` match sees. Compare case-insensitively.
 */
export const INCOME_DAILY_COLUMNS = ['Order #', 'Sale/Refund', 'Tax', 'Tip', 'Total'] as const;

export const IncomeDailyColumn = {
  ORDER: 0,
  SALE_REFUND: 1,
  TAX: 2,
  TIP: 3,
  TOTAL: 4,
} as const;

/** Summary `Total Income Table` headers (title case in the DOM, upper-cased by CSS). */
export const INCOME_SUMMARY_COLUMNS = ['Date', 'Sale', 'Tip', 'Tax', 'Total Payment'] as const;

export const IncomeSummaryColumn = {
  DATE: 0,
  SALE: 1,
  TIP: 2,
  TAX: 3,
  TOTAL_PAYMENT: 4,
} as const;

/** Staff Income headers — these really are upper-case in the DOM. */
export const INCOME_STAFF_COLUMNS = [
  'STAFF',
  'ORDERS',
  'SUBTOTAL',
  'SUPPLY FEE',
  'TIP',
  'TOTAL INCOME',
] as const;

export const IncomeStaffColumn = {
  STAFF: 0,
  ORDERS: 1,
  SUBTOTAL: 2,
  SUPPLY_FEE: 3,
  TIP: 4,
  TOTAL_INCOME: 5,
} as const;

/** Staff Income page size (verified: 30 rows/page, 244 results → `1 / 9`). */
export const INCOME_STAFF_PAGE_SIZE = 30;

/** Daily right-rail `INCOME DETAIL` rows, in order. */
export const INCOME_DETAIL_ROWS = ['Sale', 'Tip', 'Tax Collected', 'Total Payment'] as const;

/** Daily right-rail `PAYMENT DETAIL` rows, in order. */
export const INCOME_PAYMENT_DETAIL_ROWS = [
  'Card',
  'Cash',
  'Others',
  'Amount Collected',
  'Gift Card Redemption',
  'Total Payment',
] as const;

/** Summary chart legend — four series. */
export const INCOME_SUMMARY_CHART_SERIES = [
  'Total Income',
  'Gross Income',
  'Net Income',
  'Total Tip',
] as const;

/**
 * Group headings inside the Summary right panel, in order.
 *
 * Upper-case *in the rendered text*, which matters: `SUPPLY FEE` the heading
 * and `Total Supply Fee` the row are told apart by case, so the section
 * slicers below match these case-sensitively.
 */
export const INCOME_SUMMARY_PANEL_GROUPS = [
  'SALE DETAILS',
  'SUPPLY FEE',
  'STAFF PAYOUT',
  'SPLIT PAY',
  'SALON EARNINGS',
] as const;

export type IncomeSummaryGroup = (typeof INCOME_SUMMARY_PANEL_GROUPS)[number];

export const INCOME_SALE_DETAILS_ROWS = [
  'Total Sale',
  'Service Sale',
  'Product Sale',
  'Gift Card Sale',
  'Total Refund',
  'Service Refund',
  'Product Refund',
  'Subtotal',
  'Total Discount',
  'Discount',
  'Discount Reversed',
  'Service Fee',
  'Cash Discount',
  'Net Total',
  'Tip',
  'Tax Collected',
  'TOTAL PAYMENT',
] as const;

export const INCOME_SUPPLY_FEE_ROWS = [
  'Total Supply Fee',
  'Staff Supply Share',
  'Salon Supply Share',
] as const;

export const INCOME_STAFF_PAYOUT_ROWS = [
  'Total Service',
  'Staff Supply Share',
  'Staff Commission',
  'Tip',
  'Clean up fee',
  'Staff Discount Charge',
  'Staff Card Charge Commission',
  'Staff Card Charge Tip',
  'Staff Salary',
  'TOTAL STAFF PAYOUT',
] as const;

export const INCOME_SPLIT_PAY_ROWS = ['Pay 1', 'Pay 2'] as const;

export const INCOME_SALON_EARNINGS_ROWS = [
  'Total Service',
  'Salon Supply Share',
  'Salon Commission',
  'Product Sale',
  'Product Refund',
  'Total Discount',
  'Discount',
  'Discount Reversed',
  'Service Fee',
  'Cash Discount',
  'Net Earnings',
  'Staff Supply Share',
  'Clean up fee',
  'Staff Discount Charge',
  'Staff Card Charge Commission',
  'Staff Card Charge Tip',
  'Staff Salary',
  'TOTAL EARNINGS',
] as const;

/** Staff tab `STAFF SUMMARY` rows, in order. First two are counts, not money. */
export const INCOME_STAFF_SUMMARY_ROWS = [
  'Total Staff',
  'Total Orders',
  'Total Subtotal',
  'Total Supply Fee',
  'Total Tip',
  'TOTAL INCOME',
] as const;

/** Section headings inside the `Order detail #OD…` dialog. */
export const INCOME_ORDER_DETAIL_SECTIONS = [
  'Order Information',
  'Service Details',
  'Payment Details',
  'Activity Log',
] as const;

/** `Order Information` field labels. */
export const INCOME_ORDER_INFORMATION_FIELDS = [
  'Order ID',
  'Order Date',
  'Merchant',
  'WHMCS ID',
  'Customer',
  'Order Note',
] as const;

/** `Activity Log` sub-tabs, in order. */
export const INCOME_ACTIVITY_LOG_TABS = [
  'All',
  'Order',
  'Item',
  'Tender',
  'Tip',
  'Gateway',
  'JSON',
] as const;

/** Exact empty-state / placeholder strings the screen renders. */
export const INCOME_EMPTY_STATES = {
  NO_STAFF_INCOME: 'No staff income found.',
  NO_ROW_SELECTED: 'No row selected',
  NO_ROW_SELECTED_HINT:
    'Select a date, week, or month from the Total Income Table to view its summary.',
  TIP_CHART: 'No total tip recorded for this day yet.',
  NO_CUSTOMER: 'No customer is available',
  NO_NOTE: 'No note is available.',
  /** The intermittent dynamic-import failure the scan hit on DEV. */
  UNAVAILABLE: 'POS is unavailable right now',
} as const;

/** Sidebar `Operations` group: label + store-scoped href. */
export const INCOME_SIDEBAR_OPERATIONS = [
  { label: 'Overview', href: Urls.DASHBOARD },
  { label: 'Orders', href: Urls.ORDERS },
  { label: 'Batches', href: Urls.BATCH_HISTORY },
  { label: 'Income Reports (Legacy)', href: Urls.INCOME },
  { label: 'Payroll', href: Urls.PAYROLL },
] as const;

/** Sidebar `Management` group. */
export const INCOME_SIDEBAR_MANAGEMENT = [
  { label: 'Staff Members', href: Urls.STAFFS },
  { label: 'Services', href: Urls.PRODUCTS },
  { label: 'Customers', href: Urls.CUSTOMERS },
  { label: 'Store Settings', href: Urls.SETTINGS },
] as const;

/**
 * Sidebar `Internal` group — admin routes, not store-scoped but carrying the
 * `nail` vertical segment (`/pos/nail/admin/...`). The former `Monitor`,
 * `Versions` and admin `Settings` links are no longer anchors — the group now
 * exposes `System` / `Users & Roles` buttons instead — so only the five real
 * links remain inventoried here.
 */
export const INCOME_SIDEBAR_INTERNAL = [
  { label: 'Merchants', href: Urls.MERCHANTS },
  { label: 'Onboarding', href: Urls.ONBOARDING },
  { label: 'Packages', href: `${posAdminBase}/packages` },
  { label: 'All Orders', href: `${posAdminBase}/orders` },
  { label: 'Devices', href: `${posAdminBase}/devices` },
] as const;

/** Icon-rail buttons (aria-label only, no text). */
export const INCOME_PRODUCT_RAIL_BUTTONS = ['POS', 'Payment', 'Business', 'Gift Card'] as const;

/* ------------------------------- formats -------------------------------- */

/** `$1,234.56` / `-$68.22` — a whole cell. */
export const INCOME_CURRENCY_PATTERN = /^-?\$\d{1,3}(?:,\d{3})*\.\d{2}$/;

/** The same, unanchored — for `toContainText` / text-slice matching. */
export const INCOME_CURRENCY_TEXT_PATTERN = /-?\$[\d,]+\.\d{2}/;

/** `5,324` — a count with thousands separators. */
export const INCOME_COUNT_PATTERN = /^-?\d{1,3}(?:,\d{3})*$/;

/** `-95%` / `+14%` on the KPI badges. */
export const INCOME_PERCENT_BADGE_PATTERN = /[+-]?\d+%/;

/** `#OD260821-10899305` or `#OD260817-38140723 (Refund)`. */
export const INCOME_ORDER_CODE_PATTERN = /^#OD\d{6}-\d{8}(?: \(Refund\))?$/;

/** `Aug 21, 2026`. */
export const INCOME_DATE_LABEL_PATTERN = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;

/** `Aug 1, 2026 - Aug 21, 2026`. */
export const INCOME_DATE_RANGE_LABEL_PATTERN =
  /^[A-Z][a-z]{2} \d{1,2}, \d{4} - [A-Z][a-z]{2} \d{1,2}, \d{4}$/;

/**
 * Every label the date trigger can carry: `Today` (default), a single date, a
 * range, or `Pick a date range` once filters are cleared. This is also how the
 * trigger is *found* — it has no accessible name of its own.
 */
export const INCOME_DATE_TRIGGER_PATTERN =
  /^(?:Today|Pick a date range|[A-Z][a-z]{2} \d{1,2}, \d{4}(?: - [A-Z][a-z]{2} \d{1,2}, \d{4})?)$/;

/** `Week 23 (Jun 1 – Jun 7, 2026)` — note the EN DASH inside the parentheses. */
export const INCOME_WEEK_LABEL_PATTERN =
  /^Week \d+ \([A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}, \d{4}\)$/;

/** `Jun 2026`. */
export const INCOME_MONTH_LABEL_PATTERN = /^[A-Z][a-z]{2} \d{4}$/;

/** `Aug 20, 2026, 6:22 PM (UTC+7)` — dialog timestamps. */
export const INCOME_TIMESTAMP_PATTERN =
  /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (?:AM|PM) \(UTC[+-]\d+\)$/;

/** `9 AM` … `7 PM` — chart X axis. */
export const INCOME_HOUR_AXIS_PATTERN = /^\d{1,2} (?:AM|PM)$/;

/** `Showing 1 to 30 of 244 results`. */
export const INCOME_RESULTS_FOOTER_PATTERN = /showing \d+ to \d+ of \d+ results/i;

/** `1 / 9` between Previous and Next. */
export const INCOME_PAGE_INDICATOR_PATTERN = /^\s*\d+\s*\/\s*\d+\s*$/;

/** `3 orders` beside the `Order Details` title. */
export const INCOME_ORDER_COUNT_PATTERN = /^\d+ orders?$/;

/** `1 entry` / `21 entries` beside the `Total Income Table` title. */
export const INCOME_ENTRY_COUNT_PATTERN = /^\d+ (?:entry|entries)$/;

/** `August 2026` — the one-month calendar caption. */
export const INCOME_CALENDAR_CAPTION_PATTERN = /^[A-Z][a-z]+ \d{4}$/;

/**
 * Y-axis ticks, which are the one deliberate exception to
 * {@link INCOME_CURRENCY_PATTERN}: the chart abbreviates (`$1.2K`, `$1.6K`) and
 * drops the cents (`$0`, `$400`). Counts (`stat=totalOrders`) tick bare.
 */
export const INCOME_ABBREVIATED_AXIS_PATTERN = /^-?\$?\d+(?:\.\d+)?[KMB]?$/;

/** `1 payment` / `2 payments` in the order dialog. */
export const INCOME_PAYMENT_COUNT_PATTERN = /^\d+ payments?$/;

/** `Received: $68.22 · Change: $0.00` — the separator is a middle dot. */
export const INCOME_RECEIVED_CHANGE_PATTERN =
  /Received:\s*-?\$[\d,]+\.\d{2}[^A-Za-z]*Change:\s*-?\$[\d,]+\.\d{2}/;

/** `Order detail #OD260820-40932030` — the dialog title. */
export const INCOME_ORDER_DIALOG_TITLE_PATTERN = /^Order detail #OD\d{6}-\d{8}$/;

/** The weekday header row of the one-month calendar, in order. */
export const INCOME_CALENDAR_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

/**
 * Store-switcher label matcher.
 *
 * DYNAMIC: the button reads `<store name>#<store id>` — `Volt POS 14 Dev#14` on
 * DEV — so only the trailing `#<id>` is stable enough to assert. Never assert
 * the numeric id itself; it comes from `env.STORE_ID`.
 */
export const INCOME_STORE_SWITCHER_PATTERN = /#\d+\s*$/;

/** The header each tab's table is found by — all three stay mounted at once. */
export const INCOME_TABLE_ANCHORS = {
  daily: /^order #$/i,
  summary: /^total payment$/i,
  staff: /^total income$/i,
} as const;

export type IncomeTableKey = keyof typeof INCOME_TABLE_ANCHORS;

/** Sidebar group headings, in render order. */
export const INCOME_SIDEBAR_GROUPS = ['Operations', 'Management', 'Internal'] as const;

export type IncomeSidebarGroup = (typeof INCOME_SIDEBAR_GROUPS)[number];

/**
 * Every sidebar item, group by group — `Settings` appears twice (store vs
 * admin), which is why the href, not the label, is the identity here.
 */
export const INCOME_SIDEBAR_ITEMS = [
  ...INCOME_SIDEBAR_OPERATIONS,
  ...INCOME_SIDEBAR_MANAGEMENT,
  ...INCOME_SIDEBAR_INTERNAL,
] as const;

/** Viewports the responsive cases use (no matching Playwright projects exist). */
export const INCOME_VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

/** `/login` — where an expired or absent session lands. */
export const INCOME_LOGIN_URL_PATTERN = /\/login/;

/** Store ids for the bad-route cases: one that does not exist, one not numeric. */
export const INCOME_BAD_STORE_IDS = { missing: '999999', nonNumeric: 'abc' } as const;

/** Payloads the XSS cases feed the staff search box and the `search=` param. */
export const INCOME_XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
] as const;

/** Literal-match probes for the special-character search case. */
export const INCOME_SPECIAL_SEARCH_TERMS = ['%', '_', "'", '<script>', "a%' OR '1'='1"] as const;

/** The 500-character term the long-input case types. */
export const INCOME_LONG_SEARCH_TERM = 'a'.repeat(500);

/**
 * How long to wait after typing in the staff search box.
 *
 * The screen debounces `search=`; this is comfortably past the window observed
 * on DEV, so "the table has updated" is expressible as a wait.
 */
export const INCOME_SEARCH_SETTLE_MS = 1_500;

/** `2026-09-20` — today shifted by `days`, for the future / far-past date cases. */
export function incomeIsoDateFromToday(days: number): string {
  return toIsoDate(addDays(new Date(), days));
}

/**
 * `Aug 21, 2026` — the label the date trigger and the `Day` rows carry.
 *
 * Accepts a `YYYY-MM-DD` string (parsed at local midnight so the label cannot
 * slip a day) or a `Date`.
 */
export function incomeDateLabel(date: Date | string = new Date()): string {
  const value = typeof date === 'string' ? new Date(`${date}T00:00:00`) : date;
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** `Aug 1, 2026 - Aug 21, 2026` — the range trigger's label. */
export function incomeDateRangeLabel(after: Date | string, before: Date | string): string {
  return `${incomeDateLabel(after)} - ${incomeDateLabel(before)}`;
}

/* ---------------------------- value parsing ----------------------------- */

/** One `label → value` pair read out of a rendered summary panel. */
export interface IncomeValueRow {
  label: string;
  value: string;
}

/**
 * Split a flat panel string into `label → value` pairs.
 *
 * The right-hand panels are plain text with no per-row markup, so they read as
 * `"INCOME DETAIL -$9.37 Sale -$14.72 Tip $0.00 …"`. Rather than regex each
 * label (which mis-fires: `Discount` is a substring of `Total Discount`, `Card`
 * of `Gift Card Redemption`), this walks the *values* and takes whatever text
 * sits between two of them as the label — so every pair is exact and ordered.
 *
 * `counts: true` also treats bare integers as values, which is needed for
 * `STAFF SUMMARY` (`Total Staff 250`, `Total Orders 5,324`) and wrong
 * everywhere else (it would split `Pay 1 $87.20` on the `1`).
 */
export function parseIncomeRows(section: string, opts?: { counts?: boolean }): IncomeValueRow[] {
  const value = opts?.counts ? /(-?\$[\d,]+\.\d{2}|-?\d[\d,]*)/g : /(-?\$[\d,]+\.\d{2})/g;
  const rows: IncomeValueRow[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = value.exec(section)) !== null) {
    rows.push({ label: section.slice(cursor, match.index).trim(), value: match[1] });
    cursor = match.index + match[0].length;
  }
  return rows;
}

/**
 * Value for one label out of {@link parseIncomeRows} output, '' when absent.
 *
 * Exact label first; then a suffix match, because the first pair of a section
 * glues the heading onto the first row (`"STAFF SUMMARY Total Staff"`).
 */
export function incomeRowValue(rows: IncomeValueRow[], label: string): string {
  return (
    rows.find((row) => row.label === label)?.value ??
    rows.find((row) => row.label.endsWith(label))?.value ??
    ''
  );
}

/** `-$1,234.56` → `-1234.56`; `5,324` → `5324`; unparseable → `NaN`. */
export function parseIncomeAmount(text: string): number {
  const cleaned = (text ?? '').replace(/[\s$,]/g, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

/** One Daily `Order Details` row, parsed — `text` keeps the rendered cell. */
export interface IncomeDailyOrderRow {
  orderCode: string;
  isRefund: boolean;
  saleRefund: number;
  tax: number;
  tip: number;
  total: number;
}

/** One `Total Income Table` row, parsed. `date` stays a string: its format is period-dependent. */
export interface IncomeSummaryTableRow {
  date: string;
  sale: number;
  tip: number;
  tax: number;
  totalPayment: number;
}

/** One Staff Income row, parsed. `orders` is a count, the rest are money. */
export interface IncomeStaffTableRow {
  staff: string;
  orders: number;
  subtotal: number;
  supplyFee: number;
  tip: number;
  totalIncome: number;
}

/* ------------------------------------------------------------------------- */

/**
 * Income Reports (`/pos/<storeId>/income`) — a three-tab reporting screen that
 * normalises a bare visit to `?tab=daily`.
 *
 * Every filter is URL state (`tab`, `date`, `stat`, `period`, `dateAfter`,
 * `dateBefore`, `selectedDate`, `search`, `showStaffNoIncome`, `page`), so
 * {@link gotoWithQuery} is the fastest way into any state and the params are
 * the assertion surface.
 */
export class IncomePage extends BasePage {
  protected readonly path = Urls.INCOME;

  readonly sidebar: Sidebar;
  readonly orderDetailDialog: OrderDetailDialog;

  /** Icon-rail logo, `link "FastboyPay home"` → `/`. */
  readonly homeLink: Locator;
  /** Avatar trigger, `aria-haspopup="menu"`. */
  readonly userMenuButton: Locator;
  /** Store switcher, `aria-haspopup="dialog"` — text is `Volt POS 14 Dev#14`. */
  readonly storeSwitcherButton: Locator;
  /** Sidebar collapse control; only visible below the tablet breakpoint. */
  readonly toggleSidebarButton: Locator;
  /** The sonner outlet, `region "Notifications alt+T"`. */
  readonly notificationsRegion: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.orderDetailDialog = new OrderDetailDialog(page);
    this.homeLink = page.getByRole('link', { name: 'FastboyPay home' });
    // Located by its popup attribute, not role/name: opening the menu makes Radix
    // mark the rest of the page `aria-hidden`, which drops the trigger out of the
    // accessibility tree — a `getByRole` lookup then cannot read its
    // `aria-expanded` while the menu is open. A CSS attribute locator still can
    // (this mirrors how `storeSwitcherButton` is reached).
    this.userMenuButton = page.locator('button[aria-haspopup="menu"]').first();
    this.storeSwitcherButton = page.locator('button[aria-haspopup="dialog"]').first();
    this.toggleSidebarButton = page.getByRole('button', { name: 'Toggle Sidebar' });
    this.notificationsRegion = page.getByRole('region', { name: /notifications/i });
  }

  /**
   * Ready = the screen chrome is up (tab strip + the "Income Reports" label).
   *
   * Deliberately not keyed on data: the same wait has to hold for all three
   * tabs and for the empty-result cases. Use {@link waitForDataSettled} when a
   * case needs the table/chart to have actually loaded.
   */
  async waitForReady(): Promise<void> {
    await expect(this.tabList).toBeVisible({ timeout: Timeouts.LONG });
    await expect(this.pageTitle).toBeVisible({ timeout: Timeouts.LONG });
  }

  /** Skeletons gone and the pagination footer rendered — data has arrived. */
  async waitForDataSettled(): Promise<void> {
    await expect(this.page.locator('[data-slot="skeleton"]').filter({ visible: true })).toHaveCount(
      0,
      { timeout: Timeouts.NAVIGATION },
    );
    await expect(this.resultsFooter).toBeVisible({ timeout: Timeouts.NAVIGATION });
  }

  // ---- navigation --------------------------------------------------------

  /** Navigate, absorb the flaky chunk error, then wait for the chrome. */
  private async open(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.recoverIfUnavailable();
    await this.waitForReady();
  }

  /** `/pos/<storeId>/income` — the app redirects it to `?tab=daily`. */
  async goto(): Promise<void> {
    await this.open(this.path);
  }

  /** Deep-link one tab. */
  async gotoTab(tab: IncomeTabValue): Promise<void> {
    await this.open(`${this.path}?tab=${tab}`);
  }

  /**
   * Deep-link arbitrary query params — the way into every filter state, and
   * how the negative cases feed in `tab=bogus` / `date=not-a-date` / `page=999`.
   * Does NOT assert the params survived: the app strips invalid ones.
   */
  async gotoWithQuery(query: Record<string, string>): Promise<void> {
    await this.open(`${this.path}?${new URLSearchParams(query).toString()}`);
  }

  /** Click a tab and wait for its `?tab=` to land. */
  async openTab(tab: IncomeTabValue): Promise<void> {
    await this.tab(incomeTabLabel(tab)).click();
    await this.page.waitForURL(incomeTabUrlPattern(tab), { timeout: Timeouts.NAVIGATION });
    await this.waitForDataSettled();
  }

  /** Current `?tab=` value ('' when the URL has none yet). */
  currentTab(): string {
    return this.param('tab');
  }

  /** One query param off the current URL, '' when absent. */
  param(name: string): string {
    return new URL(this.page.url()).searchParams.get(name) ?? '';
  }

  /** Whether a query param is present at all (distinct from empty). */
  hasParam(name: string): boolean {
    return new URL(this.page.url()).searchParams.has(name);
  }

  // ---- chrome ------------------------------------------------------------

  /**
   * The on-page "Income Reports" label.
   *
   * There is no heading on this screen, and the sidebar link carries the exact
   * same text and comes first in DOM order — so the page label is the *last*
   * match.
   */
  get pageTitle(): Locator {
    return this.page.getByText(INCOME_SCREEN_LABEL, { exact: true }).last();
  }

  /** The tab strip. `.first()` because the order dialog has a tablist too. */
  get tabList(): Locator {
    return this.page.getByRole('tablist').first();
  }

  /** All three tabs, in DOM order. */
  get tabs(): Locator {
    return this.tabList.getByRole('tab');
  }

  tab(name: string | RegExp): Locator {
    return this.page.getByRole('tab', { name });
  }

  /** The tab carrying `aria-selected="true"`. */
  get selectedTab(): Locator {
    return this.page.getByRole('tab', { selected: true });
  }

  /**
   * The mounted-and-visible tab panel.
   *
   * The chart, filters, table, pagination and the right-hand rail all live
   * inside it, so it is the cleanest scope when a label repeats between the
   * panel and the sidebar. The other two panels stay in the DOM but `hidden`,
   * which keeps them out of the accessibility tree.
   */
  get activePanel(): Locator {
    return this.page.getByRole('tabpanel').filter({ visible: true }).first();
  }

  /** Icon-rail button — see {@link INCOME_PRODUCT_RAIL_BUTTONS}. */
  productRailButton(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  /** Sidebar link addressed by exact href — the way to split the two `Settings`. */
  navLinkByHref(href: string): Locator {
    return this.page.locator(`a[href="${href}"]`);
  }

  /** Every sidebar href, in DOM order (nav items are `li > a`). */
  async navHrefs(): Promise<string[]> {
    return this.page
      .locator('li a[href]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
  }

  /** Links the nav marks as current — `aria-current="page"`. */
  get activeNavLinks(): Locator {
    return this.page.locator('li a[aria-current="page"]');
  }

  /** `POS is unavailable right now` — the intermittent dynamic-import failure. */
  get unavailableMessage(): Locator {
    return this.page.getByText(INCOME_EMPTY_STATES.UNAVAILABLE);
  }

  get tryAgainButton(): Locator {
    return this.page.getByRole('button', { name: /try again/i });
  }

  /**
   * Click `Try again` if the bundle failed to load. Returns true when it did.
   *
   * DEV drops a route chunk now and then (documented on the screen as a real
   * defect); every navigation helper runs this so one bad chunk does not read
   * as a failing assertion.
   */
  async recoverIfUnavailable(): Promise<boolean> {
    if (!(await this.unavailableMessage.isVisible().catch(() => false))) return false;
    await this.tryAgainButton.click().catch(() => {});
    await this.page.waitForTimeout(Timeouts.SHORT);
    return true;
  }

  // ---- shared filters ----------------------------------------------------

  /**
   * The date trigger of whichever tab is showing.
   *
   * A bare `<button aria-haspopup="dialog">` with no accessible name of its
   * own — its name IS its current label (`Today`, `Aug 18, 2026`,
   * `Aug 1, 2026 - Aug 21, 2026`, `Pick a date range`). Matching the label
   * family also keeps the sidebar's store switcher (same `aria-haspopup`) out.
   */
  get dateTrigger(): Locator {
    return this.page
      .getByRole('button', { name: INCOME_DATE_TRIGGER_PATTERN })
      .filter({ visible: true })
      .first();
  }

  /** Current label on the date trigger, e.g. `Today`. */
  async dateTriggerLabel(): Promise<string> {
    return ((await this.dateTrigger.textContent()) ?? '').replace(/\s+/g, ' ').trim();
  }

  /**
   * The calendar popover: a Radix popper holding one month of react-day-picker.
   * Keyed on the `Su` weekday header so it cannot collide with the store
   * switcher's dialog or the order-detail dialog.
   */
  get calendarPopover(): Locator {
    return this.page
      .locator('[data-radix-popper-content-wrapper], [role="dialog"]')
      .filter({ has: this.page.getByText('Su', { exact: true }) })
      .first();
  }

  /** `August 2026` caption inside the calendar. */
  get calendarCaption(): Locator {
    return this.calendarPopover.getByText(INCOME_CALENDAR_CAPTION_PATTERN).first();
  }

  /**
   * A day cell in the open calendar.
   *
   * Day cells are plain `<button>`s labelled with the number. The grid also
   * renders the adjacent months' tail/head (`26 … 31`, `1 … 5`), so
   * `:not([data-outside])` keeps `26`–`31` on the displayed month; if the build
   * marks outside days some other way, prefer a day between 6 and 25.
   */
  calendarDay(day: number): Locator {
    return this.calendarPopover
      .locator('button:not([data-outside])')
      .filter({ hasText: new RegExp(`^\\s*${day}\\s*$`) })
      .first();
  }

  /** Previous/next month arrows inside the calendar (icon-only buttons). */
  get calendarPreviousMonthButton(): Locator {
    return this.calendarPopover.getByRole('button', { name: /previous( month)?/i }).first();
  }

  get calendarNextMonthButton(): Locator {
    return this.calendarPopover.getByRole('button', { name: /next( month)?/i }).first();
  }

  async openDatePicker(): Promise<void> {
    await this.dateTrigger.click();
    await expect(this.calendarPopover).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  async closeDatePicker(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.calendarPopover).toBeHidden({ timeout: Timeouts.MEDIUM });
  }

  /** Open the calendar, pick a day of the displayed month, wait for the reload. */
  async selectDay(day: number): Promise<void> {
    await this.openDatePicker();
    await this.calendarDay(day).click();
    await this.waitForDataSettled();
  }

  /**
   * `Clear filters` — present on the Summary and Staff tabs once a filter is
   * off default. The Daily tab has none (verified even with `date` set), and a
   * hidden copy belonging to another panel is always in the DOM, hence the
   * visible filter.
   */
  get clearFiltersButton(): Locator {
    return this.page.getByRole('button', { name: /^clear filters$/i }).filter({ visible: true });
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.first().click();
    await this.waitForDataSettled();
  }

  // ---- pagination (same shape on all three tabs) -------------------------

  get previousPageButton(): Locator {
    return this.page
      .getByRole('button', { name: /^previous$/i })
      .filter({ visible: true })
      .first();
  }

  get nextPageButton(): Locator {
    return this.page
      .getByRole('button', { name: /^next$/i })
      .filter({ visible: true })
      .first();
  }

  /** `Showing 1 to 30 of 244 results`. */
  get resultsFooter(): Locator {
    return this.page.getByText(INCOME_RESULTS_FOOTER_PATTERN).filter({ visible: true }).first();
  }

  /** `1 / 9`. */
  get pageIndicator(): Locator {
    return this.page.getByText(INCOME_PAGE_INDICATOR_PATTERN).filter({ visible: true }).first();
  }

  /** `Z` out of `Showing X to Y of Z results`, `NaN` when unreadable. */
  async totalResults(): Promise<number> {
    const text = (await this.resultsFooter.textContent()) ?? '';
    return Number(text.replace(/,/g, '').match(/of (\d+) results/i)?.[1] ?? Number.NaN);
  }

  /** `[X, Y, Z]` out of `Showing X to Y of Z results`. */
  async resultsRange(): Promise<[number, number, number]> {
    const text = ((await this.resultsFooter.textContent()) ?? '').replace(/,/g, '');
    const m = text.match(/showing (\d+) to (\d+) of (\d+) results/i);
    return [Number(m?.[1]), Number(m?.[2]), Number(m?.[3])];
  }

  /** `[current, total]` out of the `1 / 9` indicator. */
  async pagePosition(): Promise<[number, number]> {
    const text = (await this.pageIndicator.textContent()) ?? '';
    const m = text.match(/(\d+)\s*\/\s*(\d+)/);
    return [Number(m?.[1]), Number(m?.[2])];
  }

  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.waitForDataSettled();
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
    await this.waitForDataSettled();
  }

  // ---- Daily tab: chart --------------------------------------------------

  /** `Sale Income by Hour` / `Total Tip by Hour` — the Daily chart title. */
  get chartTitle(): Locator {
    return this.page
      .getByText(/ by Hour$/)
      .filter({ visible: true })
      .first();
  }

  /**
   * The plot area. Both charts expose `role="application"` (the axis labels are
   * its text), so the visible filter picks the one on the active tab.
   */
  get chartRegion(): Locator {
    return this.page.getByRole('application').filter({ visible: true }).first();
  }

  /**
   * A legend label, e.g. `Sale`, `Total Tips`, `Gross Income`.
   *
   * On the Daily tab `Sale` and `Tip` also label right-rail rows; the legend
   * sits above the plot and therefore wins DOM order, hence `.first()`.
   */
  chartLegend(name: string): Locator {
    return this.page.getByText(name, { exact: true }).filter({ visible: true }).first();
  }

  /** `No total tip recorded for this day yet.` and its siblings. */
  get chartEmptyState(): Locator {
    return this.page
      .getByText(/recorded for this (?:day|period) yet\./i)
      .filter({ visible: true })
      .first();
  }

  /** Every text label the plot renders (both axes, in DOM order). */
  async chartAxisLabels(): Promise<string[]> {
    // Axis ticks render as SVG `<text>` nodes; `innerText` does not reliably
    // surface SVG text, so read the text nodes directly (`textContent` works on
    // SVG) and fall back to `innerText` for any build that keeps the labels in
    // HTML. DOM order still runs left-to-right / top-to-bottom per axis.
    const svgText = (
      await this.chartRegion
        .locator('text')
        .allTextContents()
        .catch(() => [])
    )
      .map((label) => label.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (svgText.length > 0) return svgText;
    const text = (await this.chartRegion.innerText().catch(() => '')) ?? '';
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  /** Just the X-axis hour ticks, e.g. `['9 AM', '10 AM', …]`. */
  async chartHourLabels(): Promise<string[]> {
    return (await this.chartAxisLabels()).filter((label) => INCOME_HOUR_AXIS_PATTERN.test(label));
  }

  /**
   * Hover inside the plot at a relative position, to raise the bar tooltip.
   *
   * Bars carry no test id and no accessible name, so a geometric hover is the
   * only stable way in; `0.5 / 0.6` lands mid-plot, above the zero line.
   */
  async hoverChartAt(xFraction = 0.5, yFraction = 0.6): Promise<void> {
    const box = await this.chartRegion.boundingBox();
    if (!box) throw new Error('Chart plot area has no bounding box');
    await this.page.mouse.move(box.x + box.width * xFraction, box.y + box.height * yFraction);
  }

  /** The hover tooltip, e.g. `Sale $1,490.68`. */
  get chartTooltip(): Locator {
    return this.page
      .locator('.recharts-tooltip-wrapper, [role="tooltip"]')
      .filter({ visible: true })
      .first();
  }

  // ---- Daily tab: KPI cards ---------------------------------------------

  /** All four KPI cards — they are the buttons that say `vs Yesterday`. */
  get kpiCards(): Locator {
    return this.page.getByRole('button', { name: /vs Yesterday/i }).filter({ visible: true });
  }

  /** One KPI card. Anchored at `^` so `About <label>` cannot match. */
  kpiCard(label: IncomeKpiLabel): Locator {
    return this.page
      .getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}\\b`) })
      .filter({ visible: true })
      .first();
  }

  /** The `aria-pressed="true"` card — the series the chart is showing. */
  get selectedKpiCard(): Locator {
    return this.kpiCards.and(this.page.locator('[aria-pressed="true"]'));
  }

  /** The separate info button, `About Total Orders`. */
  kpiInfoButton(label: IncomeKpiLabel): Locator {
    return this.page.getByRole('button', { name: `About ${label}`, exact: true });
  }

  /** The tooltip a `About …` button opens. */
  tooltip(text?: string | RegExp): Locator {
    const tip = this.page.getByRole('tooltip');
    return (text === undefined ? tip : tip.filter({ hasText: text })).first();
  }

  /** Show a KPI tooltip by hovering its info button, then return the tooltip. */
  async openKpiTooltip(label: IncomeKpiLabel): Promise<Locator> {
    await this.kpiInfoButton(label).hover();
    const tip = this.tooltip(incomeKpiCard(label).tooltip);
    await expect(tip).toBeVisible({ timeout: Timeouts.MEDIUM });
    return tip;
  }

  /** The card's headline figure (`$3,279.37` / `23`), parsed off the card text. */
  async kpiValue(label: IncomeKpiLabel): Promise<string> {
    const text = await this.cardText(label);
    // The comparison badge is optional: a day with no prior-day baseline (an
    // empty far-past date, or a brand-new store) renders the value and
    // `vs Yesterday` with no `%` at all, so requiring the badge would miss the
    // figure entirely and read back as `NaN`.
    return text.match(/(-?\$[\d,]+\.\d{2}|-?[\d,]+)(?:\s*[+-]?\d+%)?/)?.[1] ?? '';
  }

  /** The card's comparison badge, e.g. `-95%`. */
  async kpiPercent(label: IncomeKpiLabel): Promise<string> {
    const text = await this.cardText(label);
    return text.match(/([+-]?\d+%)/)?.[1] ?? '';
  }

  private async cardText(label: IncomeKpiLabel): Promise<string> {
    return ((await this.kpiCard(label).innerText()) ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Click a KPI card and wait for its `stat=` to land on the URL. */
  async selectKpiCard(label: IncomeKpiLabel): Promise<void> {
    const card = incomeKpiCard(label);
    await this.kpiCard(label).click();
    await this.page.waitForURL(new RegExp(`stat=${card.stat}`), { timeout: Timeouts.NAVIGATION });
    await this.waitForDataSettled();
  }

  // ---- Daily tab: Order Details table -----------------------------------

  /** `Order Details` card title. */
  get orderDetailsTitle(): Locator {
    return this.page.getByText('Order Details', { exact: true }).filter({ visible: true }).first();
  }

  /** `3 orders` beside the title. */
  get orderCountLabel(): Locator {
    return this.page.getByText(INCOME_ORDER_COUNT_PATTERN).filter({ visible: true }).first();
  }

  /** `N` out of `N orders`. */
  async orderCount(): Promise<number> {
    const text = (await this.orderCountLabel.textContent()) ?? '';
    return Number(text.replace(/,/g, '').match(/(\d+)/)?.[1] ?? Number.NaN);
  }

  /** The Daily table, found by the header only it has. */
  get orderDetailsTable(): DataTable {
    return new DataTable(this.page, this.tableWithHeader(/^order #$/i));
  }

  /** Rows whose order code carries the ` (Refund)` suffix. */
  get refundRows(): Locator {
    return this.orderDetailsTable.rows.filter({ hasText: /\(Refund\)/ });
  }

  /** `<a href>` inside the Daily table — expected to be 0; codes only look like links. */
  get orderTableLinks(): Locator {
    return this.tableWithHeader(/^order #$/i).locator('a[href]');
  }

  /** Click a row to open its detail dialog. */
  async openOrderRow(index = 0): Promise<OrderDetailDialog> {
    await this.orderDetailsTable.rows.nth(index).click();
    await this.orderDetailDialog.waitForReady();
    return this.orderDetailDialog;
  }

  // ---- Daily tab: right rail -------------------------------------------

  /** `INCOME DETAIL` heading. */
  get incomeDetailHeading(): Locator {
    return this.page
      .getByText(/^income detail$/i)
      .filter({ visible: true })
      .first();
  }

  /** `PAYMENT DETAIL` heading. */
  get paymentDetailHeading(): Locator {
    return this.page
      .getByText(/^payment detail$/i)
      .filter({ visible: true })
      .first();
  }

  /**
   * The right rail's empty state on a day/period with no income — the rail
   * swaps its `INCOME DETAIL` breakdown for this sentence when there is nothing
   * to break down (e.g. a day the store never traded).
   */
  get incomeDetailEmptyState(): Locator {
    return this.page
      .getByText(/no income data for this (?:day|period) yet/i)
      .filter({ visible: true })
      .first();
  }

  /** The `PAYMENT DETAIL` rail's matching empty state. */
  get paymentDetailEmptyState(): Locator {
    return this.page
      .getByText(/no payment data for this (?:day|period) yet/i)
      .filter({ visible: true })
      .first();
  }

  /**
   * `INCOME DETAIL` as `label → value` pairs, heading total included
   * (`incomeRowValue(rows, 'INCOME DETAIL')`).
   *
   * The rail has no row markup, so this reads the panel text — see
   * {@link parseIncomeRows}.
   */
  async incomeDetailRows(): Promise<IncomeValueRow[]> {
    return parseIncomeRows(await this.section(/INCOME DETAIL/i, /PAYMENT DETAIL/i));
  }

  /** `PAYMENT DETAIL` as `label → value` pairs. */
  async paymentDetailRows(): Promise<IncomeValueRow[]> {
    return parseIncomeRows(await this.section(/PAYMENT DETAIL/i));
  }

  /** One `INCOME DETAIL` value, e.g. `incomeDetailValue('Tax Collected')`. */
  async incomeDetailValue(label: string): Promise<string> {
    return incomeRowValue(await this.incomeDetailRows(), label);
  }

  /** One `PAYMENT DETAIL` value, e.g. `paymentDetailValue('Gift Card Redemption')`. */
  async paymentDetailValue(label: string): Promise<string> {
    return incomeRowValue(await this.paymentDetailRows(), label);
  }

  // ---- Summary tab -----------------------------------------------------

  /**
   * `Income period` — `role="combobox"` whose accessible name is its
   * `aria-label` and whose text is the current value (`Day`).
   *
   * While the listbox is open Radix marks the rest of the page `aria-hidden`,
   * so this cannot be resolved by role in that window — read the current value
   * with {@link incomePeriodValue} instead.
   */
  get incomePeriodCombobox(): Locator {
    return this.page
      .getByRole('combobox', { name: /income period/i })
      .filter({ visible: true })
      .first();
  }

  /** The listbox options (`Day`, `Week`, `Month`) while the combobox is open. */
  get incomePeriodOptions(): Locator {
    return this.page.getByRole('option');
  }

  /** The value shown on the trigger, read through the attribute selector. */
  async incomePeriodValue(): Promise<string> {
    const text = await this.page
      .locator('[aria-label="Income period"]')
      .first()
      .textContent()
      .catch(() => '');
    return (text ?? '').trim();
  }

  async openIncomePeriod(): Promise<void> {
    await this.incomePeriodCombobox.click();
    await expect(this.incomePeriodOptions.first()).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  /** Pick `Day` / `Week` / `Month` and wait for the table to reload. */
  async selectIncomePeriod(option: IncomePeriodOption): Promise<void> {
    await this.openIncomePeriod();
    await this.page.getByRole('option', { name: option, exact: true }).click();
    await this.waitForDataSettled();
  }

  /** `Total Income Table` card title. */
  get totalIncomeTableTitle(): Locator {
    return this.page
      .getByText('Total Income Table', { exact: true })
      .filter({ visible: true })
      .first();
  }

  /** `1 entry` / `21 entries` beside the title. */
  get entryCountLabel(): Locator {
    return this.page.getByText(INCOME_ENTRY_COUNT_PATTERN).filter({ visible: true }).first();
  }

  /** The Summary table, found by its `Total Payment` header. */
  get summaryTable(): DataTable {
    return new DataTable(this.page, this.tableWithHeader(/^total payment$/i));
  }

  /** Rows the table marks selected — `data-state="selected"`. */
  get selectedTableRow(): Locator {
    return this.page.locator('tr[data-state="selected"]');
  }

  /** Click a Summary row and wait for `selectedDate=` to land. */
  async selectSummaryRow(index = 0): Promise<void> {
    await this.summaryTable.rows.nth(index).click();
    await this.page.waitForURL(/selectedDate=/, { timeout: Timeouts.NAVIGATION });
  }

  /** `No row selected` — the right panel before a row is picked. */
  get noRowSelectedTitle(): Locator {
    return this.page.getByText(INCOME_EMPTY_STATES.NO_ROW_SELECTED, { exact: true });
  }

  get noRowSelectedHint(): Locator {
    return this.page.getByText(INCOME_EMPTY_STATES.NO_ROW_SELECTED_HINT);
  }

  /**
   * A group heading in the Summary breakdown panel.
   *
   * Matched case-sensitively: `SUPPLY FEE` the heading and `Total Supply Fee`
   * the row differ only by case.
   */
  summaryGroupHeading(group: IncomeSummaryGroup): Locator {
    return this.page
      .getByText(new RegExp(`^${escapeRegExp(group)}$`))
      .filter({ visible: true })
      .first();
  }

  /** One breakdown group as `label → value` pairs, in render order. */
  async summaryGroupRows(group: IncomeSummaryGroup): Promise<IncomeValueRow[]> {
    const index = INCOME_SUMMARY_PANEL_GROUPS.indexOf(group);
    const next = INCOME_SUMMARY_PANEL_GROUPS[index + 1];
    const end = next === undefined ? undefined : new RegExp(escapeRegExp(next));
    return parseIncomeRows(await this.section(new RegExp(escapeRegExp(group)), end));
  }

  /** One value inside a breakdown group. */
  async summaryGroupValue(group: IncomeSummaryGroup, label: string): Promise<string> {
    return incomeRowValue(await this.summaryGroupRows(group), label);
  }

  // ---- Staff tab -------------------------------------------------------

  /** `Search by staff name...` — a hidden copy always exists on other tabs. */
  get staffSearchInput(): Locator {
    return this.page.getByPlaceholder('Search by staff name...').filter({ visible: true }).first();
  }

  /**
   * `Show staff with no income` — a `<button role="checkbox" aria-checked>`.
   *
   * The visible text is a sibling label, not the button's accessible name, so
   * the named lookup is only a best case and the bare visible checkbox is the
   * fallback (the Staff panel is the only one with a checkbox).
   */
  get showStaffWithNoIncomeCheckbox(): Locator {
    return this.page
      .getByRole('checkbox', { name: /show staff with no income/i })
      .or(this.page.getByRole('checkbox'))
      .filter({ visible: true })
      .first();
  }

  /** The label beside the checkbox. */
  get showStaffWithNoIncomeLabel(): Locator {
    return this.page.getByText('Show staff with no income', { exact: true });
  }

  /** Flip the checkbox and wait for the reload. */
  async toggleShowStaffWithNoIncome(): Promise<void> {
    await this.showStaffWithNoIncomeCheckbox.click();
    await this.waitForDataSettled();
  }

  /** The Staff table, found by its `TOTAL INCOME` header. */
  get staffTable(): DataTable {
    return new DataTable(this.page, this.tableWithHeader(/^total income$/i));
  }

  /** `No staff income found.` placeholder row. */
  get staffEmptyState(): Locator {
    return this.page.getByText(INCOME_EMPTY_STATES.NO_STAFF_INCOME);
  }

  staffRow(name: string): Locator {
    return this.staffTable.rowContaining(name);
  }

  /**
   * Type a search term and let the debounce settle.
   *
   * The screen debounces the `search=` param, so a fixed wait past the window
   * is what "the table has updated" means here.
   */
  async searchStaff(term: string): Promise<void> {
    await this.staffSearchInput.fill(term);
    await this.page.waitForTimeout(1_500);
  }

  async clearStaffSearch(): Promise<void> {
    await this.searchStaff('');
  }

  /** `STAFF SUMMARY` heading. */
  get staffSummaryHeading(): Locator {
    return this.page
      .getByText(/^staff summary$/i)
      .filter({ visible: true })
      .first();
  }

  /** `STAFF SUMMARY` as `label → value` pairs; counts and money both parse. */
  async staffSummaryRows(): Promise<IncomeValueRow[]> {
    return parseIncomeRows(await this.section(/STAFF SUMMARY/i), { counts: true });
  }

  /** One `STAFF SUMMARY` value, e.g. `staffSummaryValue('Total Staff')`. */
  async staffSummaryValue(label: string): Promise<string> {
    return incomeRowValue(await this.staffSummaryRows(), label);
  }

  // ---- table helpers ---------------------------------------------------

  /**
   * Header cells of the visible table that owns `header`, in order.
   *
   * Remember the Daily and Summary headers are title case in the DOM and only
   * *rendered* upper case — compare against {@link INCOME_DAILY_COLUMNS} /
   * {@link INCOME_SUMMARY_COLUMNS}, or case-insensitively.
   */
  headersOf(header: RegExp): Locator {
    return this.tableWithHeader(header).getByRole('columnheader');
  }

  /** `Order #`, `Sale/Refund`, `Tax`, `Tip`, `Total`. */
  get orderDetailsHeaders(): Locator {
    return this.headersOf(/^order #$/i);
  }

  /** `Date`, `Sale`, `Tip`, `Tax`, `Total Payment`. */
  get summaryHeaders(): Locator {
    return this.headersOf(/^total payment$/i);
  }

  /** `STAFF`, `ORDERS`, `SUBTOTAL`, `SUPPLY FEE`, `TIP`, `TOTAL INCOME`. */
  get staffHeaders(): Locator {
    return this.headersOf(/^total income$/i);
  }

  /** Trimmed cell texts of one row. */
  async rowValues(table: DataTable, rowIndex = 0): Promise<string[]> {
    const cells = table.rows.nth(rowIndex).getByRole('cell');
    return (await cells.allTextContents()).map((text) => text.replace(/\s+/g, ' ').trim());
  }

  /**
   * Trimmed texts of one column, top to bottom.
   *
   * `td:nth-child()` is evaluated per row — a chained `nth=` would index the
   * flattened set of every cell in the table instead.
   */
  async columnValues(table: DataTable, columnIndex: number): Promise<string[]> {
    const cells = table.rows.locator(`td:nth-child(${columnIndex + 1})`);
    return (await cells.allTextContents()).map((text) => text.replace(/\s+/g, ' ').trim());
  }

  /**
   * The visible table owning a given header.
   *
   * All three tables stay mounted, so `getByRole('table')` would keep resolving
   * to the Daily one; keying on a header a tab owns is unambiguous.
   */
  private tableWithHeader(header: RegExp): Locator {
    return this.page
      .locator('table')
      .filter({ has: this.page.getByRole('columnheader', { name: header }) })
      .filter({ visible: true })
      .first();
  }

  // ---- chrome: switcher, user menu, sidebar groups ----------------------

  /**
   * The panel {@link storeSwitcherButton} opens.
   *
   * The scan captured no heading inside it, so it is identified by exclusion:
   * a `role="dialog"` that is not the order-detail dialog. Only read it while
   * the switcher is the thing that is open — the calendar popover and the order
   * dialog are dialogs too.
   */
  get storeSwitcherDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ hasNotText: /order detail #OD/i })
      .first();
  }

  async openStoreSwitcher(): Promise<void> {
    await this.storeSwitcherButton.click();
    await expect(this.storeSwitcherDialog).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  async closeStoreSwitcher(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.storeSwitcherDialog).toBeHidden({ timeout: Timeouts.MEDIUM });
  }

  /** The menu {@link userMenuButton} opens (`aria-haspopup="menu"`). */
  get userMenu(): Locator {
    return this.page.getByRole('menu').first();
  }

  async openUserMenu(): Promise<void> {
    await this.userMenuButton.click();
    await expect(this.userMenu).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  async closeUserMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.userMenu).toBeHidden({ timeout: Timeouts.MEDIUM });
  }

  /** `Operations` / `Management` / `Internal` — the sidebar group labels. */
  sidebarGroupHeading(group: IncomeSidebarGroup): Locator {
    return this.page.getByText(group, { exact: true }).first();
  }

  /**
   * Hrefs of the links the nav marks current.
   *
   * Both signals are read (`aria-current` and `data-active="true"`) because the
   * screen must not be checked by Tailwind class: every link carries `active:`
   * utilities regardless of state.
   */
  async navActiveHrefs(): Promise<string[]> {
    return this.page
      .locator('li a[aria-current], li a[data-active="true"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
  }

  /** Whether the nav marks the item with this exact href as current. */
  async isNavItemActive(href: string): Promise<boolean> {
    return (await this.navActiveHrefs()).includes(href);
  }

  // ---- navigation extras ------------------------------------------------

  /** Reload and wait for the chrome — the "state survives F5" cases. */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.recoverIfUnavailable();
    await this.waitForReady();
  }

  /** Browser Back, then wait for the chrome (history walks through filter states). */
  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
    // A Back/Forward can land on the same flaky DEV route chunk that `open()`
    // recovers from; without this the chrome never paints and `waitForReady`
    // times out on the missing tab strip.
    await this.recoverIfUnavailable();
    await this.waitForReady();
  }

  /** Browser Forward, then wait for the chrome. */
  async goForward(): Promise<void> {
    await this.page.goForward({ waitUntil: 'domcontentloaded' });
    await this.recoverIfUnavailable();
    await this.waitForReady();
  }

  /**
   * `/pos/nail/<storeId>/income` for an arbitrary store id — the cross-store and
   * malformed-id cases (`999999`, `abc`). Keeps the `nail` vertical segment so
   * the route exercises the store-id path, not vertical-segment parsing.
   *
   * Deliberately does NOT wait for the chrome: the point of those cases is that
   * the screen may legitimately refuse to render.
   */
  async gotoStore(storeId: string | number, query?: Record<string, string>): Promise<void> {
    const suffix = query ? `?${new URLSearchParams(query).toString()}` : '';
    await this.page.goto(`/pos/nail/${storeId}/income${suffix}`, { waitUntil: 'domcontentloaded' });
  }

  /** Assert the visit bounced to `/login` — see {@link INCOME_LOGIN_URL_PATTERN}. */
  async expectRedirectedToLogin(): Promise<void> {
    await expect(this.page).toHaveURL(INCOME_LOGIN_URL_PATTERN, { timeout: Timeouts.LONG });
  }

  // ---- tabs & panels ----------------------------------------------------

  /** Visible label of the selected tab, '' when none is marked. */
  async selectedTabLabel(): Promise<string> {
    const text = await this.selectedTab
      .first()
      .textContent()
      .catch(() => '');
    return (text ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Focus a tab without clicking it — the ARIA tablist keyboard case. */
  async focusTab(tab: IncomeTabValue): Promise<void> {
    await this.tab(incomeTabLabel(tab)).focus();
  }

  /** Tab panels currently rendered *and* visible — must always be exactly one. */
  get visibleTabPanels(): Locator {
    return this.page.getByRole('tabpanel').filter({ visible: true });
  }

  /** Tables currently visible — must be one, the active tab's. */
  get visibleTables(): Locator {
    return this.page.locator('table').filter({ visible: true });
  }

  /** The Portal's loading placeholders, visible ones only (hidden copies stay mounted). */
  get skeletons(): Locator {
    return this.page.locator('[data-slot="skeleton"]').filter({ visible: true });
  }

  // ---- date pickers -----------------------------------------------------

  /**
   * The weekday header cells of the open calendar — `Su Mo Tu We Th Fr Sa`.
   *
   * react-day-picker renders them as `th` in this build; `role="columnheader"`
   * is accepted too so a markup change degrades to a miss rather than a wrong
   * match.
   */
  get calendarWeekdayHeaders(): Locator {
    return this.calendarPopover.locator('th, [role="columnheader"]');
  }

  /** The weekday labels, trimmed and in order. */
  async calendarWeekdayLabels(): Promise<string[]> {
    return (await this.calendarWeekdayHeaders.allTextContents())
      .map((label) => label.trim())
      .filter(Boolean);
  }

  /** Close the calendar only if it is open — safe after a range selection. */
  async closeDatePickerIfOpen(): Promise<void> {
    if (!(await this.calendarPopover.isVisible().catch(() => false))) return;
    await this.page.keyboard.press('Escape');
    await expect(this.calendarPopover).toBeHidden({ timeout: Timeouts.MEDIUM });
  }

  /**
   * Pick a start and an end day IN THE DISPLAYED MONTH — the Summary and Staff
   * range trigger (`dateAfter`/`dateBefore`).
   *
   * The scan verified single-day selection on the Daily tab only, so the range
   * flow here is two clicks in the same month; cross-month ranges need the
   * month arrows first ({@link calendarPreviousMonthButton}).
   */
  async selectDayRange(startDay: number, endDay: number): Promise<void> {
    await this.openDatePicker();
    await this.calendarDay(startDay).click();
    await this.calendarDay(endDay).click();
    await this.closeDatePickerIfOpen();
    await this.waitForDataSettled();
  }

  // ---- pagination extras ------------------------------------------------

  /** Real `disabled` state of both pager buttons — the boundary cases' check. */
  async paginationDisabled(): Promise<{ previous: boolean; next: boolean }> {
    return {
      previous: await this.previousPageButton.isDisabled(),
      next: await this.nextPageButton.isDisabled(),
    };
  }

  // ---- Daily: chart extras ----------------------------------------------

  /**
   * Value-axis ticks only — the labels that are not hours.
   *
   * Currency for three of the four series, bare counts for `totalOrders`, and
   * abbreviated at scale (`$1.2K`), so match with
   * {@link INCOME_ABBREVIATED_AXIS_PATTERN} rather than the strict currency one.
   */
  async chartValueAxisLabels(): Promise<string[]> {
    return (await this.chartAxisLabels()).filter(
      (label) =>
        !INCOME_HOUR_AXIS_PATTERN.test(label) && INCOME_ABBREVIATED_AXIS_PATTERN.test(label),
    );
  }

  /** Text of the hover tooltip, e.g. `Sale $1,490.68`; '' when none is up. */
  async chartTooltipText(): Promise<string> {
    const text = await this.chartTooltip.innerText().catch(() => '');
    return (text ?? '').replace(/\s+/g, ' ').trim();
  }

  /**
   * The plot's accessible name (`aria-label`, else `aria-roledescription`).
   *
   * '' means the chart offers no non-visual alternative — which is the finding
   * the accessibility case is looking for, not a locator failure.
   */
  async chartAccessibleName(): Promise<string> {
    const region = this.chartRegion.first();
    const label = await region.getAttribute('aria-label');
    if (label && label.trim()) return label.trim();
    const roleDescription = await region.getAttribute('aria-roledescription');
    return (roleDescription ?? '').trim();
  }

  // ---- Daily: KPI extras ------------------------------------------------

  /** Whether a card is the charted series (`aria-pressed="true"`). */
  async isKpiCardSelected(label: IncomeKpiLabel): Promise<boolean> {
    return (await this.kpiCard(label).getAttribute('aria-pressed')) === 'true';
  }

  /** Focus a card without clicking — the keyboard-activation case. */
  async focusKpiCard(label: IncomeKpiLabel): Promise<void> {
    await this.kpiCard(label).focus();
  }

  /** Focus a card and activate it with the keyboard, then wait for `stat=`. */
  async activateKpiCardWithKeyboard(
    label: IncomeKpiLabel,
    key: 'Enter' | 'Space' = 'Enter',
  ): Promise<void> {
    await this.focusKpiCard(label);
    await this.page.keyboard.press(key);
    await this.page.waitForURL(new RegExp(`stat=${incomeKpiCard(label).stat}`), {
      timeout: Timeouts.NAVIGATION,
    });
    await this.waitForDataSettled();
  }

  /** Raise a KPI tooltip by FOCUS rather than hover, then return it. */
  async focusKpiTooltip(label: IncomeKpiLabel): Promise<Locator> {
    await this.kpiInfoButton(label).focus();
    const tip = this.tooltip(incomeKpiCard(label).tooltip);
    await expect(tip).toBeVisible({ timeout: Timeouts.MEDIUM });
    return tip;
  }

  // ---- Daily: Order Details extras --------------------------------------

  /** The `ORDER #` column top to bottom, e.g. `#OD260821-10899305 (Refund)`. */
  async orderCodes(): Promise<string[]> {
    return this.columnValues(this.orderDetailsTable, IncomeDailyColumn.ORDER);
  }

  /** One Daily row parsed into numbers — the `SALE + TAX + TIP = TOTAL` case. */
  async dailyRowAmounts(rowIndex = 0): Promise<IncomeDailyOrderRow> {
    const cells = await this.rowValues(this.orderDetailsTable, rowIndex);
    const code = cells[IncomeDailyColumn.ORDER] ?? '';
    return {
      orderCode: code,
      isRefund: /\(Refund\)/.test(code),
      saleRefund: parseIncomeAmount(cells[IncomeDailyColumn.SALE_REFUND] ?? ''),
      tax: parseIncomeAmount(cells[IncomeDailyColumn.TAX] ?? ''),
      tip: parseIncomeAmount(cells[IncomeDailyColumn.TIP] ?? ''),
      total: parseIncomeAmount(cells[IncomeDailyColumn.TOTAL] ?? ''),
    };
  }

  /** Every Daily row parsed, top to bottom. */
  async dailyRows(): Promise<IncomeDailyOrderRow[]> {
    const total = await this.orderDetailsTable.rowCount();
    const rows: IncomeDailyOrderRow[] = [];
    for (let index = 0; index < total; index += 1) rows.push(await this.dailyRowAmounts(index));
    return rows;
  }

  /** Open the dialog for the row carrying a given order code. */
  async openOrderRowByCode(code: string): Promise<OrderDetailDialog> {
    await this.orderDetailsTable.rowContaining(code).click();
    await this.orderDetailDialog.waitForReady();
    return this.orderDetailDialog;
  }

  /** Open the first ` (Refund)` row's dialog — the refund-badge case. */
  async openFirstRefundRow(): Promise<OrderDetailDialog> {
    await this.refundRows.first().click();
    await this.orderDetailDialog.waitForReady();
    return this.orderDetailDialog;
  }

  /**
   * `tabindex` of a Daily row — '' when the row is not focusable.
   *
   * The row IS the only way into the order dialog (the codes are not links), so
   * '' is itself the accessibility finding the keyboard case reports.
   */
  async orderRowTabIndex(rowIndex = 0): Promise<string> {
    return (await this.orderDetailsTable.rows.nth(rowIndex).getAttribute('tabindex')) ?? '';
  }

  // ---- Summary extras ---------------------------------------------------

  /** `N` out of `1 entry` / `21 entries`. */
  async entryCount(): Promise<number> {
    const text = (await this.entryCountLabel.textContent()) ?? '';
    return Number(text.replace(/,/g, '').match(/(\d+)/)?.[1] ?? Number.NaN);
  }

  /** The `DATE` column top to bottom — day, week or month labels per `period=`. */
  async summaryDateLabels(): Promise<string[]> {
    return this.columnValues(this.summaryTable, IncomeSummaryColumn.DATE);
  }

  /** One Summary row parsed — the `SALE + TIP + TAX = TOTAL PAYMENT` case. */
  async summaryRowAmounts(rowIndex = 0): Promise<IncomeSummaryTableRow> {
    const cells = await this.rowValues(this.summaryTable, rowIndex);
    return {
      date: cells[IncomeSummaryColumn.DATE] ?? '',
      sale: parseIncomeAmount(cells[IncomeSummaryColumn.SALE] ?? ''),
      tip: parseIncomeAmount(cells[IncomeSummaryColumn.TIP] ?? ''),
      tax: parseIncomeAmount(cells[IncomeSummaryColumn.TAX] ?? ''),
      totalPayment: parseIncomeAmount(cells[IncomeSummaryColumn.TOTAL_PAYMENT] ?? ''),
    };
  }

  /** Click the Summary row containing `text` (e.g. `Aug 4, 2026`), wait for `selectedDate=`. */
  async selectSummaryRowContaining(text: string): Promise<void> {
    await this.summaryTable.rowContaining(text).click();
    await this.page.waitForURL(/selectedDate=/, { timeout: Timeouts.NAVIGATION });
  }

  /** Numeric form of one breakdown value, `NaN` when the row is absent. */
  async summaryGroupAmount(group: IncomeSummaryGroup, label: string): Promise<number> {
    return parseIncomeAmount(await this.summaryGroupValue(group, label));
  }

  /**
   * `data-state` plus the ARIA the selected row should carry.
   *
   * The scan only saw `data-state="selected"`; empty `ariaSelected` /
   * `ariaCurrent` is the finding, not a broken locator.
   */
  async selectedRowAttributes(): Promise<{
    state: string;
    ariaSelected: string;
    ariaCurrent: string;
  }> {
    const row = this.selectedTableRow.first();
    return {
      state: (await row.getAttribute('data-state')) ?? '',
      ariaSelected: (await row.getAttribute('aria-selected')) ?? '',
      ariaCurrent: (await row.getAttribute('aria-current')) ?? '',
    };
  }

  // ---- Staff extras -----------------------------------------------------

  /** `aria-checked` of the `Show staff with no income` control. */
  async isShowStaffWithNoIncomeChecked(): Promise<boolean> {
    return (await this.showStaffWithNoIncomeCheckbox.getAttribute('aria-checked')) === 'true';
  }

  /** Drive the checkbox to a state; no-op when it is already there. */
  async setShowStaffWithNoIncome(checked: boolean): Promise<void> {
    if ((await this.isShowStaffWithNoIncomeChecked()) === checked) return;
    await this.toggleShowStaffWithNoIncome();
  }

  /** Flip the checkbox with the keyboard (Space) — the a11y case. */
  async toggleShowStaffWithNoIncomeWithKeyboard(): Promise<void> {
    await this.showStaffWithNoIncomeCheckbox.focus();
    await this.page.keyboard.press('Space');
    await this.waitForDataSettled();
  }

  /** Current text in the search box — used after reload to prove state survived. */
  async staffSearchValue(): Promise<string> {
    return this.staffSearchInput.inputValue();
  }

  /**
   * Type into the search box key by key WITHOUT waiting for the debounce.
   *
   * The debounce case counts requests while typing, so the settle wait has to
   * be a separate step — see {@link waitForSearchSettled}. Use
   * {@link searchStaff} when you just want the filtered result.
   */
  async typeStaffSearch(term: string, delayMs = 60): Promise<void> {
    await this.staffSearchInput.click();
    await this.staffSearchInput.pressSequentially(term, { delay: delayMs });
  }

  /** Wait out the search debounce — {@link INCOME_SEARCH_SETTLE_MS}. */
  async waitForSearchSettled(): Promise<void> {
    await this.page.waitForTimeout(INCOME_SEARCH_SETTLE_MS);
  }

  /** The `STAFF` column top to bottom. */
  async staffNames(): Promise<string[]> {
    return this.columnValues(this.staffTable, IncomeStaffColumn.STAFF);
  }

  /** One Staff row parsed; `orders` is a count, the rest money. */
  async staffRowAmounts(rowIndex = 0): Promise<IncomeStaffTableRow> {
    const cells = await this.rowValues(this.staffTable, rowIndex);
    return {
      staff: cells[IncomeStaffColumn.STAFF] ?? '',
      orders: parseIncomeAmount(cells[IncomeStaffColumn.ORDERS] ?? ''),
      subtotal: parseIncomeAmount(cells[IncomeStaffColumn.SUBTOTAL] ?? ''),
      supplyFee: parseIncomeAmount(cells[IncomeStaffColumn.SUPPLY_FEE] ?? ''),
      tip: parseIncomeAmount(cells[IncomeStaffColumn.TIP] ?? ''),
      totalIncome: parseIncomeAmount(cells[IncomeStaffColumn.TOTAL_INCOME] ?? ''),
    };
  }

  /** Numeric form of one `STAFF SUMMARY` value, `NaN` when absent. */
  async staffSummaryNumber(label: string): Promise<number> {
    return parseIncomeAmount(await this.staffSummaryValue(label));
  }

  // ---- table & amount helpers ------------------------------------------

  /**
   * The visible `<table>` element owning `header` — see
   * {@link INCOME_TABLE_ANCHORS} for the three anchors.
   */
  tableElement(header: RegExp): Locator {
    return this.tableWithHeader(header);
  }

  /** Semantic shape of one table — the screen-reader-structure case. */
  async tableStructure(header: RegExp): Promise<{
    thead: number;
    tbody: number;
    headerCells: number;
    dataCells: number;
    scopedHeaderCells: number;
  }> {
    return this.tableElement(header).evaluate((table) => ({
      thead: table.querySelectorAll('thead').length,
      tbody: table.querySelectorAll('tbody').length,
      headerCells: table.querySelectorAll('th').length,
      dataCells: table.querySelectorAll('td').length,
      scopedHeaderCells: table.querySelectorAll('th[scope]').length,
    }));
  }

  /** One column parsed to numbers (`NaN` for non-numeric cells). */
  async columnAmounts(table: DataTable, columnIndex: number): Promise<number[]> {
    return (await this.columnValues(table, columnIndex)).map(parseIncomeAmount);
  }

  /** Sum of one column, rounded to cents; unparseable cells count as 0. */
  async sumColumnAmounts(table: DataTable, columnIndex: number): Promise<number> {
    const amounts = await this.columnAmounts(table, columnIndex);
    const total = amounts.reduce((sum, value) => sum + (Number.isNaN(value) ? 0 : value), 0);
    return Number(total.toFixed(2));
  }

  /**
   * Every money-looking cell of the visible table, in DOM order.
   *
   * The strict half of the currency-format case: these must all match
   * {@link INCOME_CURRENCY_PATTERN}. Chart ticks are excluded by construction —
   * they are not table cells — so the `$1.2K` exception cannot leak in.
   */
  async tableCurrencyCells(): Promise<string[]> {
    const cells = await this.page.locator('table:visible td').allTextContents();
    return cells
      .map((text) => text.replace(/\s+/g, ' ').trim())
      .filter((text) => text.includes('$'));
  }

  /**
   * Every `$…` token anywhere in the visible text, chart ticks included.
   *
   * Pair with {@link chartValueAxisLabels} to split the abbreviated axis
   * exception from the strict cells.
   */
  async currencyTokens(): Promise<string[]> {
    return (await this.visibleText()).match(/-?\$[\d.,]+[KMB]?/g) ?? [];
  }

  // ---- layout / responsive ---------------------------------------------

  /** Whether the document scrolls sideways — the responsive cases' red line. */
  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
  }

  /**
   * Whether a table (or one of its ancestors) takes the sideways scroll itself
   * instead of pushing the page wide — the wide-table-at-390px case.
   */
  async tableScrollsHorizontally(header: RegExp): Promise<boolean> {
    return this.tableElement(header).evaluate((table) => {
      let node: Element | null = table;
      while (node) {
        const style = getComputedStyle(node);
        if (/auto|scroll/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    });
  }

  /** Whether a locator's box sits inside the viewport — the mobile dialog case. */
  async isWithinViewport(locator: Locator): Promise<boolean> {
    const box = await locator.first().boundingBox();
    const size = this.page.viewportSize();
    if (!box || !size) return false;
    return (
      box.x >= -1 &&
      box.y >= -1 &&
      box.x + box.width <= size.width + 1 &&
      box.y + box.height <= size.height + 1
    );
  }

  // ---- accessibility ---------------------------------------------------

  /**
   * Every rendered heading as `{ level, text }`.
   *
   * Expected to come back EMPTY on this screen: the scan found no `h1`–`h6` at
   * all, which the heading case tracks as a defect.
   */
  async headingOutline(): Promise<Array<{ level: number; text: string }>> {
    return this.page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((elements) =>
      elements
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => ({
          level: Number(element.tagName.slice(1)),
          text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        })),
    );
  }

  /**
   * `aria-label` (or `title`) of every visible button that renders no text.
   *
   * An '' entry is an icon button with no accessible name — the icon-rail,
   * `About …`, `Toggle Sidebar` and combobox controls should all be named.
   */
  async iconButtonNames(): Promise<string[]> {
    return this.page
      .locator('button:visible')
      .evaluateAll((elements) =>
        elements
          .filter((element) => !(element.textContent ?? '').trim())
          .map((element) =>
            (element.getAttribute('aria-label') ?? element.getAttribute('title') ?? '').trim(),
          ),
      );
  }

  /** Text an element points at with `aria-describedby`; '' when unwired. */
  async describedByText(locator: Locator): Promise<string> {
    return locator.first().evaluate((element) => {
      const ids = element.getAttribute('aria-describedby');
      if (!ids) return '';
      return ids
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    });
  }

  /** Tag / role / accessible-ish name of whatever holds focus. */
  async focusedElement(): Promise<{ tag: string; role: string; name: string }> {
    return this.page.evaluate(() => {
      const element = document.activeElement;
      if (!element) return { tag: '', role: '', name: '' };
      const name = (
        element.getAttribute('aria-label') ??
        element.getAttribute('placeholder') ??
        element.textContent ??
        ''
      )
        .replace(/\s+/g, ' ')
        .trim();
      return { tag: element.tagName.toLowerCase(), role: element.getAttribute('role') ?? '', name };
    });
  }

  /** `aria-expanded` of a trigger; '' when the attribute is absent. */
  async ariaExpanded(locator: Locator): Promise<string> {
    return (await locator.first().getAttribute('aria-expanded')) ?? '';
  }

  /** `aria-checked` of a control; '' when the attribute is absent. */
  async ariaChecked(locator: Locator): Promise<string> {
    return (await locator.first().getAttribute('aria-checked')) ?? '';
  }

  // ---- diagnostics, network & security ---------------------------------

  /**
   * Start collecting console errors and uncaught page errors.
   *
   * Call BEFORE navigating and read the array afterwards; the listeners live as
   * long as the page.
   */
  captureConsoleErrors(): string[] {
    const errors: string[] = [];
    this.page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    this.page.on('pageerror', (error) => errors.push(error.message));
    return errors;
  }

  /** Start collecting (and dismissing) native dialogs — an injected `alert(1)` lands here. */
  captureDialogs(): string[] {
    const messages: string[] = [];
    this.page.on('dialog', (dialog) => {
      messages.push(dialog.message());
      void dialog.dismiss();
    });
    return messages;
  }

  /**
   * Start recording XHR/fetch URLs, optionally filtered.
   *
   * The debounce and tab-switch cases count these; only data traffic is kept so
   * asset requests cannot inflate the tally.
   */
  captureDataRequests(match?: RegExp): string[] {
    const urls: string[] = [];
    this.page.on('request', (request) => {
      const type = request.resourceType();
      if (type !== 'xhr' && type !== 'fetch') return;
      const url = request.url();
      if (!match || match.test(url)) urls.push(url);
    });
    return urls;
  }

  /** Milliseconds until a locator becomes visible — the performance cases' stopwatch. */
  async measureVisibleMs(locator: Locator, timeout: number = Timeouts.LONG): Promise<number> {
    const startedAt = Date.now();
    await expect(locator).toBeVisible({ timeout });
    return Date.now() - startedAt;
  }

  /**
   * Abort the route chunks, reproducing the dynamic-import failure the scan hit
   * (`POS is unavailable right now` + `Try again`). Undo with
   * {@link unblockRouteChunks} before pressing `Try again`.
   */
  async blockRouteChunks(): Promise<void> {
    await this.page.route('**/assets/route-*.js', async (route) => {
      await route.abort('failed');
    });
  }

  async unblockRouteChunks(): Promise<void> {
    await this.page.unroute('**/assets/route-*.js');
  }

  /** Toggle the browser context offline. Always restore in a `finally`. */
  async setOffline(offline: boolean): Promise<void> {
    await this.page.context().setOffline(offline);
  }

  /** Drop the session cookies without touching the storageState file. */
  async clearSessionCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  /**
   * How many nodes in the document carry an injected marker as real markup.
   *
   * `0` proves a payload typed into the search box (or fed through `search=`)
   * was rendered as text and never parsed as HTML.
   */
  async injectedNodeCount(marker = 'alert(1)'): Promise<number> {
    return this.page.evaluate((needle) => {
      const scripts = Array.from(document.querySelectorAll('script')).filter((script) =>
        (script.textContent ?? '').includes(needle),
      ).length;
      const handlers = document.querySelectorAll('[onerror], img[src="x"]').length;
      return scripts + handlers;
    }, marker);
  }

  // ---- text sections ---------------------------------------------------

  /**
   * Whitespace-normalised text of everything currently rendered.
   *
   * `innerText` skips hidden subtrees, so the other two tab panels stay out,
   * and it reflects CSS `text-transform` — which is why the upper-cased
   * headings (`INCOME DETAIL`, `SALE DETAILS`) match here but not in
   * `textContent`-based locators.
   */
  async visibleText(): Promise<string> {
    const main = this.page.locator('main');
    const root = (await main.count()) > 0 ? main.first() : this.page.locator('body');
    return ((await root.innerText()) ?? '').replace(/\s+/g, ' ').trim();
  }

  /** The slice of {@link visibleText} from `start` up to `end` (or the end). */
  private async section(start: RegExp, end?: RegExp): Promise<string> {
    const text = await this.visibleText();
    const from = text.search(start);
    if (from < 0) return '';
    const rest = text.slice(from);
    if (!end) return rest;
    const to = rest.slice(1).search(end);
    return to < 0 ? rest : rest.slice(0, to + 1);
  }
}

/**
 * The `Order detail #OD…` dialog a Daily table row opens.
 *
 * Not a route: the URL keeps its filters, so it needs no navigation of its own.
 * Its body is flat text with no field markup — read labels with locators and
 * values with {@link fieldValue}.
 */
export class OrderDetailDialog {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    // Identified by the dialog's accessible name, not its body text: at narrow
    // (mobile) widths the title splits into a heading ("Order detail") and a
    // separate order-code line, so a `hasText: /order detail #OD/` filter stops
    // matching — the accessible name stays "Order detail" at every width.
    return this.page.getByRole('dialog', { name: /order detail/i });
  }

  async waitForReady(): Promise<void> {
    // Gate on the dialog root, not the title heading: at mobile (390px) widths
    // the title stays in the a11y tree but renders with no box, so a
    // title-visibility gate flakes there. The title text is still asserted
    // directly by the desktop cases that care about it.
    await expect(this.root).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  /** The dialog heading — `Order detail` (the `#OD…` code sits beside it). */
  get title(): Locator {
    return this.root.getByRole('heading', { name: /order detail/i }).first();
  }

  /** The order code shown in the dialog, '' when unreadable. */
  async orderCode(): Promise<string> {
    const text = (await this.root.innerText().catch(() => '')) ?? '';
    return text.match(/#OD\d{6}-\d{8}/)?.[0] ?? '';
  }

  /** Status badge beside the title, e.g. `Refunded`. */
  badge(text: string | RegExp): Locator {
    return this.root.getByText(text, { exact: typeof text === 'string' }).first();
  }

  /** A section heading — see {@link INCOME_ORDER_DETAIL_SECTIONS}. */
  section(name: string): Locator {
    return this.root.getByText(new RegExp(`^${escapeRegExp(name)}$`)).first();
  }

  /** A field label — see {@link INCOME_ORDER_INFORMATION_FIELDS}. */
  field(label: string): Locator {
    return this.root.getByText(label, { exact: true }).first();
  }

  /**
   * The text that follows a field label, up to the next known label.
   *
   * The dialog renders `Order Date` and its value as adjacent text, so this
   * slices rather than pretending there is a row element to scope to.
   */
  async fieldValue(label: string, nextLabel?: string): Promise<string> {
    const text = await this.text();
    const from = text.indexOf(label);
    if (from < 0) return '';
    const rest = text.slice(from + label.length).trim();
    if (!nextLabel) return rest;
    const to = rest.indexOf(nextLabel);
    return (to < 0 ? rest : rest.slice(0, to)).trim();
  }

  /** Whitespace-normalised text of the whole dialog. */
  async text(): Promise<string> {
    return ((await this.root.innerText()) ?? '').replace(/\s+/g, ' ').trim();
  }

  /** `Items subtotal` row inside `Service Details`. */
  get itemsSubtotal(): Locator {
    return this.root.getByText(/^items subtotal$/i).first();
  }

  /** `Times in UTC+7` note above the log. */
  get activityLogTimezoneNote(): Locator {
    return this.root.getByText(/times in UTC[+-]\d+/i).first();
  }

  /**
   * The log's subject filter — see {@link INCOME_ACTIVITY_LOG_TABS}.
   *
   * Rendered as a tablist at desktop width and as a radiogroup ("Filter activity
   * by subject") once the dialog narrows to mobile, so both roles are accepted.
   */
  get activityLogTabs(): Locator {
    return this.root.getByRole('tab').or(this.root.getByRole('radio'));
  }

  activityLogTab(name: string): Locator {
    return this.root.getByRole('tab', { name: new RegExp(`^${escapeRegExp(name)}$`, 'i') });
  }

  /** `1 payment` / `2 payments` above the payment rows. */
  get paymentCountLabel(): Locator {
    return this.root.getByText(INCOME_PAYMENT_COUNT_PATTERN).first();
  }

  /** `Received: $68.22 · Change: $0.00` — one line, middle-dot separated. */
  get receivedChangeLine(): Locator {
    return this.root.getByText(INCOME_RECEIVED_CHANGE_PATTERN).first();
  }

  /** `Last updated: …` at the top of `Service Details`. */
  get lastUpdatedLabel(): Locator {
    return this.root.getByText(/^last updated:/i).first();
  }

  /**
   * A `Service Details` column label.
   *
   * Rendered upper case; matched case-insensitively because the transform is
   * CSS on this screen elsewhere and may be here too.
   */
  serviceColumnHeader(name: 'STAFF / SERVICE' | 'PRICE'): Locator {
    return this.root.getByText(new RegExp(`^${escapeRegExp(name)}$`, 'i')).first();
  }

  /** Every `Aug 20, 2026, 6:22 PM (UTC+7)` stamp in the dialog, in order. */
  async timestamps(): Promise<string[]> {
    const text = await this.text();
    return (
      text.match(/[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} (?:AM|PM) \(UTC[+-]\d+\)/g) ?? []
    );
  }

  /** Labels of the `Activity Log` sub-tabs, in order. */
  async activityLogTabLabels(): Promise<string[]> {
    return (await this.activityLogTabs.allTextContents())
      .map((label) => label.trim())
      .filter(Boolean);
  }

  /** Click one `Activity Log` sub-tab and wait for it to read as selected. */
  async openActivityLogTab(name: string): Promise<void> {
    const tab = this.activityLogTab(name);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: Timeouts.MEDIUM });
  }

  /** Focusable controls inside the dialog — what the focus-trap case walks. */
  get focusables(): Locator {
    return this.root.locator(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
  }

  /** Scroll a section into view — the mobile case walks down to `Activity Log`. */
  async scrollToSection(name: string): Promise<void> {
    await this.section(name).scrollIntoViewIfNeeded();
  }

  get closeButton(): Locator {
    return this.root.getByRole('button', { name: /^close$/i }).first();
  }

  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.root).toBeHidden({ timeout: Timeouts.MEDIUM });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
