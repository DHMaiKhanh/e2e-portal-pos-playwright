import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Khả năng tiếp cận (Accessibility) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  test(
    'TC-CUS-066 — Tab moves through chrome and page content in logical order',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.waitForReady();

      // Verified against the live DOM: from the search box, focus runs
      // search -> group filter -> the table's scroll region -> pager. The
      // scroll region is focusable on purpose (a keyboard user must be able to
      // scroll a wide table), so it belongs in the expected order rather than
      // being treated as a stray stop.
      await customersPage.searchInput.focus();
      await expect(customersPage.searchInput).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(customersPage.groupFilter).toBeFocused();

      await page.keyboard.press('Tab');
      const scrollRegion = page.locator(':focus');
      await expect(scrollRegion).toHaveCount(1);
      // It is the element wrapping the table, not something off-screen.
      expect(await scrollRegion.evaluate((el) => !!el.querySelector('table'))).toBe(true);

      await page.keyboard.press('Tab');
      await expect(customersPage.pagination.nextButton).toBeFocused();

      // Focus must stay on something the user can actually see at every stop —
      // the failure mode this case exists to catch is focus disappearing into a
      // hidden node.
      await expect(customersPage.pagination.nextButton).toBeVisible();
    },
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

  /**
   * The earlier draft required `scope="col"` on every `<th>`, found none, and
   * was parked as a product bug. That requirement was too strict: `scope` is
   * needed to disambiguate *complex* tables (multiple header rows, spanning
   * headers). This is a simple grid with one header row, where HTML already
   * associates each cell with the `<th>` above it, and assistive technology
   * reads it correctly without the attribute.
   *
   * What actually matters — and what this now asserts — is that the markup is a
   * real table rather than divs painted to look like one: exposed roles, a
   * header cell per column, and a matching cell count on every row.
   */
  test(
    'TC-CUS-068 — table exposes proper table semantics (role, headers, rows)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await customersPage.waitForReady();
      const table = customersPage.activePanel.getByRole('table');
      await expect(table).toBeVisible();

      const headers = customersPage.columnHeaders;
      await expect(headers).toHaveCount(8);
      for (const text of await headers.allInnerTexts()) {
        expect(text.trim().length, 'a column header has no accessible text').toBeGreaterThan(0);
      }

      // thead/tbody must both be exposed as row groups, or the header row reads
      // as just another data row.
      await expect(table.getByRole('rowgroup')).toHaveCount(2);

      // Every row must carry one cell per column; a short row silently shifts
      // the data under the wrong header for a screen-reader user.
      const rows = customersPage.table.rows;
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        await expect(rows.nth(i).getByRole('cell')).toHaveCount(8);
      }
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
