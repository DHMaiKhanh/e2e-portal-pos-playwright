import { env } from '@configs/env/loadEnv';

/**
 * Route paths within the Portal POS web app. baseURL is set in playwright.config.
 *
 * The Portal is POS-centric: most pages are scoped to a store id, and the app
 * injects a product/vertical segment before the id: `/pos/<seg>/<id>/...`
 * (e.g. `/pos/nail/100004/overview`). The segment comes from env (POS_SEGMENT,
 * default `nail`) and the id from env (STORE_ID), so the suite can target a
 * different store/vertical without code changes. A logged-in user hitting `/` is
 * redirected to their store overview.
 *
 * Admin/internal routes are not store-scoped but still carry the segment:
 * `/pos/<seg>/admin/...` (e.g. `/pos/nail/admin/merchant`).
 */
const store = env.STORE_ID;
const seg = env.POS_SEGMENT;

/** Store-scoped base, e.g. `/pos/nail/100004`. */
export const posStoreBase = `/pos/${seg}/${store}`;
/** Admin base, e.g. `/pos/nail/admin`. */
export const posAdminBase = `/pos/${seg}/admin`;

export const Urls = {
  LOGIN: '/login',
  HOME: '/',
  DASHBOARD: `${posStoreBase}/overview`,
  ORDERS: `${posStoreBase}/orders`,
  PRODUCTS: `${posStoreBase}/services`,
  CUSTOMERS: `${posStoreBase}/customers`,
  INCOME: `${posStoreBase}/income`,
  SETTINGS: `${posStoreBase}/setting`,
  SETTINGS_PAYMENT_TRANSACTIONS: `${posStoreBase}/setting?tab=payment-transactions`,
  PAYROLL: `${posStoreBase}/payroll`,
  BATCH_HISTORY: `${posStoreBase}/batch`,
  STAFFS: `${posStoreBase}/staffs`,
  // Report Configuration (report-builder admin) — sidebar group under Management.
  REPORT_CONFIG: `${posStoreBase}/report-config`,
  REPORT_CONFIG_PAGES: `${posStoreBase}/report-config/pages`,
  REPORT_CONFIG_BLOCKS: `${posStoreBase}/report-config/blocks`,
  REPORT_CONFIG_SOURCES: `${posStoreBase}/report-config/sources`,
  REPORT_CONFIG_COLUMNS: `${posStoreBase}/report-config/columns`,
  // Reports (configurable report pages) — sidebar accordion "Reports" under
  // Management. One route per slug: see `reportPageUrl()` below.
  REPORT_PAGES: `${posStoreBase}/report-pages`,
  // Reports V4 — sidebar accordion "Reports V4" under Management; see `reportV4Url()`.
  REPORTS_V4: `${posStoreBase}/v4/reports`,
  // Internal/admin routes — not store-scoped, but carry the vertical segment and
  // live under `/admin/`. `/pos/<seg>/admin/merchant` self-normalises to
  // `?tab=overview`.
  MERCHANTS: `${posAdminBase}/merchant`,
  ONBOARDING: `${posAdminBase}/onboarding`,
  // Volt Monitor — `?tab=sync-data|background-task|report-task|gift-card-transaction`.
  MONITOR: `${posAdminBase}/monitor`,
  // Packages (POS package catalogue — Internal). List + per-package Edit/Clone.
  PACKAGES: `${posAdminBase}/packages`,
  // All Orders (Internal) — cross-merchant order list. A clicked order opens the
  // store-scoped Order detail at `/pos/<seg>/<merchantId>/orders/<id>`.
  ALL_ORDERS: `${posAdminBase}/orders`,
  // Devices (Internal › Device Management). `?tab=devices|pending|history`.
  DEVICES: `${posAdminBase}/devices`,
  // System › App Versions (Windows / Android tabs).
  VERSIONS: `${posAdminBase}/versions`,
  // System › Settings (global sys_setting rows; some open a detail page
  // `/admin/setting/<id>`).
  SYSTEM_SETTINGS: `${posAdminBase}/setting`,
  // System › Feature Flags.
  FEATURE_FLAGS: `${posAdminBase}/features`,
  // Monitoring › Remote Actions (list) + Send action form at
  // `/admin/remote-actions/send-action`.
  REMOTE_ACTIONS: `${posAdminBase}/remote-actions`,
  // Monitoring › Change Logs (system-wide entity history).
  CHANGE_LOGS: `${posAdminBase}/histories`,
  // Users & Roles (Internal RBAC). Tabs: Employees / Merchants, each with its
  // own Users / Roles sub-tab.
  USERS: `${posAdminBase}/users`,
  ROLES: `${posAdminBase}/roles`,
} as const;

/** Slugs of the report pages under `Urls.REPORT_PAGES` (Reports sidebar group). */
export const ReportPageSlug = {
  DAILY_SALE: 'daily-sale-report',
  DEMO_DS: 'demo-ds-report',
  INCOME_SUMMARY: 'income-summary',
  STAFF_INCOME: 'staff-income',
  STAFF_PAYROLL: 'staff-payroll',
} as const;

export type ReportPageSlugValue = (typeof ReportPageSlug)[keyof typeof ReportPageSlug];

/** `/pos/<seg>/<id>/report-pages/<slug>` — `slug` may be any string (bad-slug cases). */
export const reportPageUrl = (
  slug: ReportPageSlugValue | string,
  storeBase = posStoreBase,
): string => `${storeBase}/report-pages/${slug}`;

/** Slugs of the Reports V4 pages (`staff-income-detail` is reached from Staff Income only). */
export const ReportV4Slug = {
  DAILY_SALE: 'daily-sale-report',
  INCOME_SUMMARY: 'income-summary',
  STAFF_INCOME: 'staff-income',
  STAFF_INCOME_DETAIL: 'staff-income-detail',
  STAFF_PAYROLL: 'staff-payroll',
} as const;

export type ReportV4SlugValue = (typeof ReportV4Slug)[keyof typeof ReportV4Slug];

/** `/pos/<seg>/<id>/v4/reports/<slug>` — `slug` may be any string (bad-slug cases). */
export const reportV4Url = (slug: ReportV4SlugValue | string, storeBase = posStoreBase): string =>
  `${storeBase}/v4/reports/${slug}`;
