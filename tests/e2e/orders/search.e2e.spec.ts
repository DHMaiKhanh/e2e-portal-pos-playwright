import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tìm kiếm (Search) — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-004 — search by Order ID returns matching rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage }) => {
      const rowsBefore = await ordersPage.rowCount();
      test.skip(rowsBefore === 0, 'No orders available to derive a search term from.');

      const firstOdId = (await ordersPage.odIdCell(0).textContent())?.trim() ?? '';
      test.skip(!firstOdId, 'Could not read an OD ID from the first row.');

      // The backend matches the search term against the full OD ID, not a substring.
      const term = firstOdId.replace(/^#/, '');
      await ordersPage.search(term);

      const rowsAfter = await ordersPage.rowCount();
      expect(rowsAfter).toBeGreaterThan(0);

      for (let i = 0; i < rowsAfter; i++) {
        const cellText = (await ordersPage.odIdCell(i).textContent())?.trim() ?? '';
        expect(cellText).toContain(term);
      }

      await expect(ordersPage.paginationSummary).toHaveText(/Showing \d+ to \d+ of \d+ results?/i);
    },
  );

  test(
    'TC-ORD-005 — search by customer name or phone filters CUSTOMER column',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      const rowsBefore = await ordersPage.rowCount();
      test.skip(rowsBefore === 0, 'No orders available to derive a customer search term from.');

      // Find a row whose CUSTOMER cell is not the "—" placeholder to use as search term.
      const customerCells = page.locator('table tbody tr td:nth-child(4)');
      const count = await customerCells.count();
      let term = '';
      for (let i = 0; i < count; i++) {
        const text = (await customerCells.nth(i).innerText())?.trim() ?? '';
        if (text && text !== '—') {
          // Cell stacks "name" and "phone" on separate lines; search by name only.
          term = text.split('\n')[0]?.trim() ?? '';
          break;
        }
      }
      test.skip(!term, 'No row with a named customer was found to search by.');

      await ordersPage.search(term);

      const rowsAfter = await ordersPage.rowCount();
      expect(rowsAfter).toBeGreaterThan(0);

      const filteredCustomerCells = page.locator('table tbody tr td:nth-child(4)');
      const filteredCount = await filteredCustomerCells.count();
      for (let i = 0; i < filteredCount; i++) {
        const text = (await filteredCustomerCells.nth(i).textContent())?.trim() ?? '';
        expect(text).not.toBe('—');
        expect(text).toContain(term);
      }
    },
  );

  test(
    'TC-ORD-006 — search with no match shows empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      await ordersPage.search('zzz_no_such_order_zzz');
      // Debounce delay: wait for the search to settle before asserting the empty state.
      await page.waitForTimeout(2000);

      await expect(ordersPage.emptyStateMessage).toBeVisible();
      expect(await ordersPage.rowCount()).toBe(0);

      const previousButton = page.getByRole('button', { name: /previous/i });
      const nextButton = page.getByRole('button', { name: /next/i });
      if (await previousButton.count()) {
        await expect(previousButton).toBeDisabled();
      }
      if (await nextButton.count()) {
        await expect(nextButton).toBeDisabled();
      }
    },
  );
});
