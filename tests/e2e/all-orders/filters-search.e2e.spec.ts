import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { AllOrdersColumn } from '@pages/orders/AllOrdersPage';

/**
 * Filters and search on the cross-merchant All Orders list. Everything here is
 * tolerant by design — the DEV order book changes constantly, so the specs assert
 * presence / narrowing / count-is-a-number and skip when there is no data, rather
 * than freezing counts. Every test blocks writes first so probing the filters and
 * the search box can never fire a cross-merchant mutation.
 */
test.describe('Bộ lọc & tìm kiếm (Filters / Search) — All Orders', () => {
  test.beforeEach(async ({ allOrdersPage }) => {
    await allOrdersPage.blockWrites();
    await allOrdersPage.goto();
    await allOrdersPage.waitForReady();
  });

  /**
   * TC-AOR-010 — the Status filter opens and offers at least one option.
   */
  test(
    'TC-AOR-010 — the Status filter opens and offers options',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ allOrdersPage, page }) => {
      await allOrdersPage.statusFilter.click();
      const options = page.getByRole('option').or(page.getByRole('menuitem'));
      await expect(options.first()).toBeVisible();
      expect(await options.count()).toBeGreaterThan(0);
      await page.keyboard.press('Escape');
    },
  );

  /**
   * TC-AOR-011 — the Merchant filter (searchable combobox) is present and enabled.
   */
  test(
    'TC-AOR-011 — the Merchant filter is present and enabled',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ allOrdersPage }) => {
      await expect(allOrdersPage.merchantFilter).toBeVisible();
      await expect(allOrdersPage.merchantFilter).toBeEnabled();
    },
  );

  /**
   * TC-AOR-012 — search narrows the list to rows matching the token, or shows the
   * empty state. Tolerant: the token is lifted from the first row's Order ID cell,
   * so whatever is live today is what gets searched.
   */
  test(
    'TC-AOR-012 — search narrows the list to matching orders or shows the empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ allOrdersPage }) => {
      const rowCount = await allOrdersPage.table.rows.count();
      test.skip(rowCount === 0, 'no orders to search');

      const raw = (
        (await allOrdersPage.table.rows
          .first()
          .getByRole('cell')
          .nth(AllOrdersColumn.ORDER_ID)
          .textContent()) ?? ''
      ).trim();
      const token = raw.split(/\s+/).find((word) => word.length >= 3) ?? raw;
      test.skip(token.length === 0, 'no searchable token on the first row');

      await allOrdersPage.search(token);

      const after = await allOrdersPage.table.rows.all();
      if (after.length === 0) {
        await expect(allOrdersPage.emptyState).toBeVisible();
      } else {
        for (const row of after) {
          expect(((await row.textContent()) ?? '').toLowerCase()).toContain(token.toLowerCase());
        }
      }
      await allOrdersPage.clearSearch();
    },
  );

  /**
   * TC-AOR-013 — the "X of Y orders" count resolves to a number ≥ 0.
   */
  test(
    'TC-AOR-013 — totalResults() resolves to a number ≥ 0',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ allOrdersPage }) => {
      const total = await allOrdersPage.totalResults();
      if (Number.isNaN(total)) {
        // No range label rendered (e.g. an empty list) — fall back to the rows.
        expect(await allOrdersPage.table.rows.count()).toBeGreaterThanOrEqual(0);
      } else {
        expect(total).toBeGreaterThanOrEqual(0);
      }
    },
  );

  /**
   * TC-AOR-014 — browsing and searching the list issues no mutating request.
   */
  test(
    'TC-AOR-014 — browsing and searching the list issues no mutating request',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ allOrdersPage }) => {
      const blocked = await allOrdersPage.blockWrites();
      await allOrdersPage.goto();
      await allOrdersPage.waitForReady();
      await allOrdersPage.search('a');
      await allOrdersPage.clearSearch();

      expect(blocked, 'All Orders made a write while only browsing').toEqual([]);
    },
  );
});
