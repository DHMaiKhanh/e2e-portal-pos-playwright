import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';

test.describe('Điều hướng (Navigation) — Customers', () => {
  test(
    'TC-CUS-013 — navigates to Customers from sidebar Management group',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, customersPage, page }) => {
      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateTo('Customers');
      await customersPage.waitForReady();
      await expect(page).toHaveURL(/\/pos\/\d+\/customers\?page=1&orderCreatedAt=desc/);
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
    },
  );

  test(
    'TC-CUS-014 — only the Customers sidebar item is highlighted',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await customersPage.goto();
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
      await expect(customersPage.sidebar.item('Staffs')).not.toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(customersPage.sidebar.item('Services')).not.toHaveAttribute(
        'aria-current',
        'page',
      );
    },
  );

  test(
    'TC-CUS-015 — navigating away updates sidebar highlight and URL',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.goto();
      await customersPage.sidebar.navigateTo('Customer Groups');
      await expect(page).toHaveURL(/\/pos\/\d+\/customer-groups/);
      await expect(page.getByRole('link', { name: 'Customer Groups' })).toHaveAttribute(
        'aria-current',
        'page',
      );

      await customersPage.sidebar.navigateTo('Services');
      await expect(page).toHaveURL(/\/pos\/\d+\/services/);
      await expect(customersPage.sidebar.item('Customers')).not.toHaveAttribute(
        'aria-current',
        'page',
      );
    },
  );

  test(
    'TC-CUS-016 — browser Back after pagination restores previous page state',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.goto();
      await customersPage.pagination.next();
      await expect(page).toHaveURL(/page=2&orderCreatedAt=desc/);
      await customersPage.pagination.next();
      await expect(page).toHaveURL(/page=3&orderCreatedAt=desc/);

      await page.goBack();
      await expect(page).toHaveURL(/page=2&orderCreatedAt=desc/);
      await expect(customersPage.pageIndicator).toHaveText(/2\s*\/\s*\d+/);
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
    },
  );

  test(
    'TC-CUS-017 — Toggle Sidebar collapses/expands without leaving Customers',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.goto();
      const toggleButton = page.getByRole('button', { name: /toggle sidebar/i });
      const urlBefore = page.url();

      await toggleButton.click();
      await expect(page).toHaveURL(urlBefore);

      await toggleButton.click();
      await expect(page).toHaveURL(urlBefore);
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
    },
  );

  test(
    'TC-CUS-018 — direct URL navigation with query param preserves state and sidebar highlight',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await page.goto(`${Urls.CUSTOMERS}?page=3&orderCreatedAt=desc`, {
        waitUntil: 'domcontentloaded',
      });
      await customersPage.waitForReady();
      await expect(customersPage.pageIndicator).toHaveText(/3\s*\/\s*\d+/);
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
    },
  );

  test(
    'TC-CUS-019 — reload on a paginated URL keeps the page and sidebar state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await page.goto(`${Urls.CUSTOMERS}?page=4&orderCreatedAt=desc`, {
        waitUntil: 'domcontentloaded',
      });
      await customersPage.waitForReady();
      await page.reload();
      await customersPage.waitForReady();
      await expect(page).toHaveURL(/page=4&orderCreatedAt=desc/);
      await expect(customersPage.pageIndicator).toHaveText(/4\s*\/\s*\d+/);
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
    },
  );
});
