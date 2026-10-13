import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Sidebar Navigation — Overview screen (lean core).
 *
 * Store-scoped routes are asserted with `\/pos\/nail\/\d+\/…` regexes so the
 * numeric store id is never hardcoded (the app injects the `nail` vertical
 * segment). Admin routes carry the same segment and live under
 * `/pos/nail/admin/…`. The active nav item is expressed via `aria-current="page"`.
 */

/**
 * Store-scoped POS + Management links, keyed by expected href pattern. The app
 * injects a vertical segment before the store id: `/pos/nail/<id>/…`.
 */
const STORE_LINKS: RegExp[] = [
  /^\/pos\/nail\/\d+\/overview$/,
  /^\/pos\/nail\/\d+\/orders$/,
  /^\/pos\/nail\/\d+\/payroll$/,
  /^\/pos\/nail\/\d+\/batch$/,
  /^\/pos\/nail\/\d+\/staffs$/,
  /^\/pos\/nail\/\d+\/services$/,
  /^\/pos\/nail\/\d+\/customers$/,
  // `/pos/<id>/customer-groups` is gone from the sidebar: Customer Groups became
  // a tab on the Customers screen (/customers?tab=groups). The old URL still
  // resolves, but only as a redirect onto that tab, so there is no nav link with
  // this href to assert on any more.
  /^\/pos\/nail\/\d+\/income$/,
  // `report-config` is no longer a sidebar link — "Report Configuration" now
  // renders as a <button>, so it exposes no href to match.
  /^\/pos\/nail\/\d+\/setting$/,
];

/**
 * Admin links — store-independent, but still carry the vertical segment and now
 * live under `/pos/nail/admin/…`. "System" and "Users & Roles" render as
 * <button>s (no href), so `/admin/monitor` and `/admin/versions` are gone.
 */
const ADMIN_LINKS: string[] = [
  '/pos/nail/admin/onboarding',
  '/pos/nail/admin/merchant',
  '/pos/nail/admin/orders',
  '/pos/nail/admin/packages',
  '/pos/nail/admin/devices',
];

test.describe('Sidebar Navigation — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-049 — every sidebar link exposes its exact expected href',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));

      // All nav hrefs present and exact (store links by pattern, admin literal).
      expect(hrefs).toEqual(
        expect.arrayContaining([
          ...STORE_LINKS.map((re) => expect.stringMatching(re)),
          ...ADMIN_LINKS,
        ]),
      );

      // No nav link is an empty or placeholder href.
      expect(hrefs).not.toContain('');
      expect(hrefs).not.toContain('#');
    },
  );

  test(
    'TC-OVW-050 — POS-group links navigate to their store-scoped routes',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      const routes: Array<[RegExp, RegExp]> = [
        [/^\/pos\/nail\/\d+\/overview$/, /\/pos\/nail\/\d+\/overview/],
        [/^\/pos\/nail\/\d+\/orders$/, /\/pos\/nail\/\d+\/orders/],
        [/^\/pos\/nail\/\d+\/payroll$/, /\/pos\/nail\/\d+\/payroll/],
        [/^\/pos\/nail\/\d+\/batch$/, /\/pos\/nail\/\d+\/batch/],
      ];
      for (const [hrefPattern, urlPattern] of routes) {
        await dashboardPage.goto();
        await dashboardPage.sidebar.navigateToHref(hrefPattern);
        await expect(page).toHaveURL(urlPattern);
      }
    },
  );

  test(
    'TC-OVW-051 — Management-group links navigate to their store-scoped routes',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      const routes: Array<[RegExp, RegExp]> = [
        [/^\/pos\/nail\/\d+\/staffs$/, /\/pos\/nail\/\d+\/staffs/],
        [/^\/pos\/nail\/\d+\/services$/, /\/pos\/nail\/\d+\/services/],
        [/^\/pos\/nail\/\d+\/customers$/, /\/pos\/nail\/\d+\/customers/],
        // customer-groups dropped — now a tab on /customers, no sidebar link.
        [/^\/pos\/nail\/\d+\/income$/, /\/pos\/nail\/\d+\/income/],
        [/^\/pos\/nail\/\d+\/setting$/, /\/pos\/nail\/\d+\/setting/],
      ];
      for (const [hrefPattern, urlPattern] of routes) {
        await dashboardPage.goto();
        await dashboardPage.sidebar.navigateToHref(hrefPattern);
        await expect(page).toHaveURL(urlPattern);
      }
    },
  );

  test(
    'TC-OVW-055 — Overview is the sole active item on the Overview route',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.sidebar.item('Overview')).toHaveAttribute('aria-current', 'page');
      // Sibling items are not marked active.
      await expect(dashboardPage.sidebar.item('Payroll')).not.toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(dashboardPage.sidebar.item('Orders').first()).not.toHaveAttribute(
        'aria-current',
        'page',
      );
    },
  );
});
