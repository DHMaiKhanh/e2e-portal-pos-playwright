import { env } from '@configs/env/loadEnv';

/**
 * Route paths within the Portal POS web app. baseURL is set in playwright.config.
 *
 * The Portal is POS-centric: most pages are scoped to a store id
 * (`/pos/<id>/...`). The id comes from env (STORE_ID) so the suite can target a
 * different store without code changes. A logged-in user hitting `/` is
 * redirected to their store overview.
 */
const store = env.STORE_ID;

export const Urls = {
  LOGIN: '/login',
  HOME: '/',
  DASHBOARD: `/pos/${store}/overview`,
  ORDERS: `/pos/${store}/orders`,
  PRODUCTS: `/pos/${store}/services`,
  CUSTOMERS: `/pos/${store}/customers`,
  REPORTS: `/pos/${store}/income`,
  SETTINGS: `/pos/${store}/setting`,
  PAYROLL: `/pos/${store}/payroll`,
} as const;
