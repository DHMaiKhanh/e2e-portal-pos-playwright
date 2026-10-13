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
      // Landing URL now leads with `tab=customers` (the screen gained tabs).
      await expect(page).toHaveURL(
        /\/pos\/nail\/\d+\/customers\?tab=customers&page=1&orderCreatedAt=desc/,
      );
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
    },
  );

  test(
    'TC-CUS-014 — only the Customers sidebar item is highlighted',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await customersPage.goto();
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
      await expect(customersPage.sidebar.item('Staff Members')).not.toHaveAttribute(
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

      // Customer Groups is no longer its own sidebar route — it became a tab on
      // this screen. The old /pos/<id>/customer-groups URL still resolves, but as
      // a redirect to /pos/<id>/customers?tab=groups, so neither the sidebar link
      // nor the old URL pattern exists to assert on any more.
      await page.getByRole('tab', { name: /customer groups/i }).click();
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/customers\?tab=groups/);
      await expect(page.getByRole('tab', { name: /customer groups/i })).toHaveAttribute(
        'data-state',
        'active',
      );

      await customersPage.sidebar.navigateTo('Services');
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/services/);
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
      // Clicking "Next" updates the URL via history.replaceState (no new
      // history entry is pushed), so Back can't retrace pages reached that
      // way — it jumps straight past the whole pagination session. Direct
      // URL navigation (as a user pasting/editing the URL would do) is what
      // actually produces back-navigable history entries, so build the
      // history that way instead.
      await page.goto(`${Urls.CUSTOMERS}?page=2&orderCreatedAt=desc`, {
        waitUntil: 'domcontentloaded',
      });
      await customersPage.waitForReady();
      await page.goto(`${Urls.CUSTOMERS}?page=3&orderCreatedAt=desc`, {
        waitUntil: 'domcontentloaded',
      });
      await customersPage.waitForReady();

      await page.goBack({ waitUntil: 'domcontentloaded' });
      await customersPage.waitForReady();
      await expect(page).toHaveURL(/page=2&orderCreatedAt=desc/);
      await expect(customersPage.pageIndicator).toHaveText(/2\s*\/\s*\d+/);
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
    },
  );

  test(
    'TC-CUS-017 — Toggle Sidebar collapses/expands without leaving Customers',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      // The "Toggle Sidebar" trigger only renders in the mobile header (it's
      // hidden from the `md` breakpoint up, where the icon rail + full
      // sidebar are always visible instead) — exercise it at a mobile width.
      await page.setViewportSize({ width: 375, height: 812 });
      await customersPage.goto();
      const toggleButton = page.getByRole('button', { name: /toggle sidebar/i });
      await expect(toggleButton).toBeVisible();
      const urlBefore = page.url();

      // Opening the drawer unmounts the trigger itself (it sits behind the
      // overlay), so it can't be clicked again to close — dismiss it via the
      // dialog's own backdrop instead.
      await toggleButton.click();
      await expect(page).toHaveURL(urlBefore);
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');

      // Click the overlay clear of the drawer panel itself (which occupies
      // the left portion of the screen and would intercept the click).
      await page.locator('[data-slot="sheet-overlay"]').click({ position: { x: 350, y: 400 } });
      await expect(dialog).toBeHidden();
      await expect(page).toHaveURL(urlBefore);
      await expect(customersPage.searchInput).toBeVisible();
      await expect(toggleButton).toBeVisible();
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
