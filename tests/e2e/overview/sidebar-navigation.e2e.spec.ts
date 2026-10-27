import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Sidebar Navigation — Overview screen.
 *
 * Store-scoped routes are asserted with `\/pos\/nail\/\d+\/…` regexes so the
 * store id is never hardcoded. Since the 2026-10-13 redesign the sidebar is
 * `navigation "Main"` with groups Operations / Management / Internal; the
 * legacy `/income` link is gone — "Income Summary" lives under Reports
 * (`/report-pages/income-summary`), whose links only mount once that collapsed
 * group is expanded, so it is not part of the always-present list below. The
 * active item carries `aria-current="page"`.
 */
const STORE_LINKS: RegExp[] = [
  // Operations
  /^\/pos\/nail\/\d+\/overview$/,
  /^\/pos\/nail\/\d+\/orders$/,
  /^\/pos\/nail\/\d+\/batch$/,
  /^\/pos\/nail\/\d+\/payroll$/,
  // Management
  /^\/pos\/nail\/\d+\/staffs$/,
  /^\/pos\/nail\/\d+\/services$/,
  /^\/pos\/nail\/\d+\/customers$/,
  /^\/pos\/nail\/\d+\/setting$/,
];

/** Internal (admin) links — store-independent, under `/pos/nail/admin/…`. */
const ADMIN_LINKS: string[] = [
  '/pos/nail/admin/merchant',
  '/pos/nail/admin/onboarding',
  '/pos/nail/admin/packages',
  '/pos/nail/admin/orders',
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
        .getByRole('navigation', { name: 'Main' })
        .locator('a[href]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));

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
        [/^\/pos\/nail\/\d+\/orders$/, /\/pos\/nail\/\d+\/orders(\?.*)?$/],
        [/^\/pos\/nail\/\d+\/batch$/, /\/pos\/nail\/\d+\/batch(\?.*)?$/],
        [/^\/pos\/nail\/\d+\/payroll$/, /\/pos\/nail\/\d+\/payroll(\?.*)?$/],
        [/^\/pos\/nail\/\d+\/overview$/, /\/pos\/nail\/\d+\/overview(\?.*)?$/],
      ];
      // Chained client-side navigation, as a user would click through the group.
      for (const [hrefPattern, urlPattern] of routes) {
        await dashboardPage.sidebar.navigateToHref(hrefPattern);
        await expect(page).toHaveURL(urlPattern);
      }
      await expect(dashboardPage.heading).toBeVisible();
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
    async ({ page, dashboardPage }) => {
      await expect(dashboardPage.sidebar.item('Overview')).toHaveAttribute('aria-current', 'page');
      const active = page
        .getByRole('navigation', { name: 'Main' })
        .locator('a[aria-current="page"]');
      await expect(active).toHaveCount(1);
      await expect(active).toHaveAccessibleName('Overview');
    },
  );
});
