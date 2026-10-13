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
      await ordersPage.ensureRowsPresent();

      // Every order carries an id; a blank first cell is a rendering failure, so
      // assert the shape rather than skipping when it cannot be read.
      await expect(ordersPage.odIdCell(0)).toHaveText(/#OD\d{6}-\d+/);
      const firstOdId = ((await ordersPage.odIdCell(0).textContent()) ?? '').trim();

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
      await ordersPage.ensureRowsPresent();

      // Most orders in this store are walk-ins with no customer attached, so the
      // named row this case needs is often not on page 1 — which is what the old
      // skip was really reacting to. Walk pages until one turns up.
      const term = await ordersPage.findCustomerNameToSearch();
      // Store 100004's orders are overwhelmingly walk-ins with no customer
      // attached; when the scanned pages hold no named order there is nothing to
      // search by, so skip softly rather than fail (confirmed absent across runs).
      test.skip(
        term === null,
        'store 100004 has no order with a named customer in the first 5 pages',
      );

      await ordersPage.search(term as string);

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
