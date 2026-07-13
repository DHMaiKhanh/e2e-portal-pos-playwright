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
        // POS
        /\/pos\/\d+\/overview$/,
        /\/pos\/\d+\/orders$/,
        /\/pos\/\d+\/payroll$/,
        /\/pos\/\d+\/batch$/,
        // Management
        /\/pos\/\d+\/staffs$/,
        /\/pos\/\d+\/services$/,
        /\/pos\/\d+\/customers$/,
        /\/pos\/\d+\/customer-groups$/,
        /\/pos\/\d+\/income$/,
        /\/pos\/\d+\/setting$/,
        // Admin
        /\/pos\/onboarding$/,
        /\/pos\/merchants$/,
        /\/pos\/admin\/orders$/,
        /\/pos\/admin\/packages$/,
        /\/pos\/admin\/devices$/,
        /\/pos\/admin\/monitor$/,
        /\/pos\/admin\/versions$/,
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
      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/orders$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/orders(\?.*)?$/);

      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/payroll$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/payroll(\?.*)?$/);

      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/batch$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/batch(\?.*)?$/);

      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/overview$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/overview(\?.*)?$/);
      await expect(dashboardPage.heading).toBeVisible();
    },
  );

  test(
    'TC-OVW-051 — điều hướng mọi link nhóm Management tới đúng route theo store',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/staffs$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/staffs(\?.*)?$/);

      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/services$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/services(\?.*)?$/);

      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/customers$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/customers(\?.*)?$/);

      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/customer-groups$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/customer-groups(\?.*)?$/);

      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/income$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/income(\?.*)?$/);

      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/setting$/);
      await expect(page).toHaveURL(/\/pos\/\d+\/setting(\?.*)?$/);
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
