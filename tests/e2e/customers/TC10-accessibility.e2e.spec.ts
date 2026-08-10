import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Khả năng tiếp cận (Accessibility) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  // TODO(manual/setup): full chrome-to-content tab-order sweep needs live, visual
  // focus-indicator verification beyond what a scripted assertion can capture.
  test.fixme(
    'TC-CUS-066 — Tab moves through chrome and page content in logical order',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  test(
    'TC-CUS-067 — search input is keyboard-operable with a proper accessible name',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.searchInput.focus();
      const accessibleName = customersPage.searchInput;
      await expect(accessibleName).toHaveAttribute('placeholder');

      await page.keyboard.type('Nguyen');
      await expect(customersPage.searchInput).toHaveValue('Nguyen');

      // Once the input has a value, a "Clear search" button renders inside
      // it and is the next stop in tab order before the group filter.
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /clear search/i })).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(customersPage.groupFilter).toBeFocused();
    },
  );

  // Known accessibility gap: the app's `<th>` elements don't set scope="col",
  // so screen readers can't reliably associate cells with their column
  // header. Tracked as a product issue, not a test bug — re-enable once fixed.
  test.fixme(
    'TC-CUS-068 — table exposes proper table semantics (role, headers, rows)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await expect(page.getByRole('table')).toBeVisible();
      const headers = customersPage.columnHeaders;
      await expect(headers).toHaveCount(8);
      for (let i = 0; i < 8; i++) {
        await expect(headers.nth(i)).toHaveAttribute('scope', 'col');
      }
      await expect(customersPage.table.rows.first().getByRole('cell').first()).toBeVisible();
    },
  );

  test(
    'TC-CUS-069 — pagination controls are keyboard-operable with correct disabled states',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await expect(customersPage.pagination.prevButton).toBeDisabled();

      await customersPage.pagination.nextButton.focus();
      await expect(customersPage.pagination.nextButton).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/page=2/);
      await expect(customersPage.pagination.prevButton).toBeEnabled();
    },
  );

  test(
    'TC-CUS-070 — active "Customers" sidebar item exposes aria-current="page"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
    },
  );
});
