import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Sidebar Navigation — Overview screen (lean core).
 *
 * Store-scoped routes are asserted with `\/pos\/\d+\/…` regexes so the numeric
 * store id is never hardcoded. Admin routes are genuinely store-independent
 * (`/pos/onboarding`, `/pos/merchants`, `/pos/admin/…`) and are matched as such.
 * The active nav item is expressed via the ARIA-standard `aria-current="page"`.
 */

/** Store-scoped POS + Management links, keyed by expected href pattern. */
const STORE_LINKS: RegExp[] = [
  /^\/pos\/\d+\/overview$/,
  /^\/pos\/\d+\/orders$/,
  /^\/pos\/\d+\/payroll$/,
  /^\/pos\/\d+\/batch$/,
  /^\/pos\/\d+\/staffs$/,
  /^\/pos\/\d+\/services$/,
  /^\/pos\/\d+\/customers$/,
  /^\/pos\/\d+\/customer-groups$/,
  /^\/pos\/\d+\/income$/,
  /^\/pos\/\d+\/setting$/,
];

/** Admin links — store-independent, exact hrefs. */
const ADMIN_LINKS: string[] = [
  '/pos/onboarding',
  '/pos/merchants',
  '/pos/admin/orders',
  '/pos/admin/packages',
  '/pos/admin/devices',
  '/pos/admin/monitor',
  '/pos/admin/versions',
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

      // All 17 nav hrefs present and exact (store links by pattern, admin literal).
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
        [/^\/pos\/\d+\/overview$/, /\/pos\/\d+\/overview/],
        [/^\/pos\/\d+\/orders$/, /\/pos\/\d+\/orders/],
        [/^\/pos\/\d+\/payroll$/, /\/pos\/\d+\/payroll/],
        [/^\/pos\/\d+\/batch$/, /\/pos\/\d+\/batch/],
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
        [/^\/pos\/\d+\/staffs$/, /\/pos\/\d+\/staffs/],
        [/^\/pos\/\d+\/services$/, /\/pos\/\d+\/services/],
        [/^\/pos\/\d+\/customers$/, /\/pos\/\d+\/customers/],
        [/^\/pos\/\d+\/customer-groups$/, /\/pos\/\d+\/customer-groups/],
        [/^\/pos\/\d+\/income$/, /\/pos\/\d+\/income/],
        [/^\/pos\/\d+\/setting$/, /\/pos\/\d+\/setting/],
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
