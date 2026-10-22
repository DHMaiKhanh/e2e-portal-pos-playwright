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
  // Internal/admin routes — not store-scoped, but carry the vertical segment and
  // live under `/admin/`. `/pos/<seg>/admin/merchant` self-normalises to
  // `?tab=overview`.
  MERCHANTS: `${posAdminBase}/merchant`,
  ONBOARDING: `${posAdminBase}/onboarding`,
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
