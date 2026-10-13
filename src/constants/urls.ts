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
  PAYROLL: `${posStoreBase}/payroll`,
  BATCH_HISTORY: `${posStoreBase}/batch`,
  STAFFS: `${posStoreBase}/staffs`,
  // Internal/admin routes — not store-scoped, but carry the vertical segment and
  // live under `/admin/`. `/pos/<seg>/admin/merchant` self-normalises to
  // `?tab=overview`.
  MERCHANTS: `${posAdminBase}/merchant`,
  ONBOARDING: `${posAdminBase}/onboarding`,
} as const;
