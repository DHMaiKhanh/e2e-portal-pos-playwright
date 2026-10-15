import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Điều hướng Sidebar — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-049 — mọi link sidebar có đúng href mong đợi',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      const expectedHrefs = [
        // POS — app chèn segment vertical `nail`: /pos/nail/<id>/…
        /\/pos\/nail\/\d+\/overview$/,
        /\/pos\/nail\/\d+\/orders$/,
        /\/pos\/nail\/\d+\/payroll$/,
        /\/pos\/nail\/\d+\/batch$/,
        // Management
        /\/pos\/nail\/\d+\/staffs$/,
        /\/pos\/nail\/\d+\/services$/,
        /\/pos\/nail\/\d+\/customers$/,
        // customer-groups không còn là link sidebar — nó thành tab trên màn
        // Customers (/customers?tab=groups). URL cũ vẫn resolve nhưng chỉ dưới
        // dạng redirect sang tab đó.
        /\/pos\/nail\/\d+\/income$/,
        /\/pos\/nail\/\d+\/setting$/,
        // Admin — cũng mang segment `nail` và nằm dưới /pos/nail/admin/…
        // ("System" và "Users & Roles" giờ là <button>, không còn link
        // /admin/monitor, /admin/versions).
        /\/pos\/nail\/admin\/onboarding$/,
        /\/pos\/nail\/admin\/merchant$/,
        /\/pos\/nail\/admin\/orders$/,
        /\/pos\/nail\/admin\/packages$/,
        /\/pos\/nail\/admin\/devices$/,
      ];

      const links = page.locator('body a[href]');
      const count = await links.count();
      const hrefs: string[] = [];
      for (let i = 0; i < count; i++) {
        const href = await links.nth(i).getAttribute('href');
        if (href) hrefs.push(href);
      }

      for (const pattern of expectedHrefs) {
        const found = hrefs.some((h) => pattern.test(h));
        expect(found, `Expected a sidebar href matching ${pattern}`).toBeTruthy();
      }

      // No nav link should be empty or a placeholder '#'.
      expect(hrefs.every((h) => h.trim().length > 0 && h.trim() !== '#')).toBeTruthy();
    },
  );

  test(
    'TC-OVW-050 — điều hướng mọi link nhóm POS tới đúng route theo store',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/orders$/);
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/orders(\?.*)?$/);

      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/payroll$/);
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/payroll(\?.*)?$/);

      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/batch$/);
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/batch(\?.*)?$/);

      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/overview$/);
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/overview(\?.*)?$/);
      await expect(dashboardPage.heading).toBeVisible();
    },
  );

  test(
    'TC-OVW-051 — điều hướng mọi link nhóm Management tới đúng route theo store',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/staffs$/);
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/staffs(\?.*)?$/);

      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/services$/);
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/services(\?.*)?$/);

      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/customers$/);
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/customers(\?.*)?$/);

      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/income$/);
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/income(\?.*)?$/);

      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/setting$/);
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/setting(\?.*)?$/);
    },
  );

  test(
    'TC-OVW-055 — highlight mục đang active khớp với route hiện tại trên Overview',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      const overviewLink = dashboardPage.sidebar.item('Overview').first();
      await expect(overviewLink).toBeVisible();

      const ariaCurrent = await overviewLink.getAttribute('aria-current');
      const className = (await overviewLink.getAttribute('class')) ?? '';
      const isHighlighted =
        ariaCurrent === 'page' ||
        ariaCurrent === 'true' ||
        /active|selected|current/i.test(className);

      expect(
        isHighlighted,
        'Overview sidebar link should show an active/highlight state',
      ).toBeTruthy();
    },
  );
});
