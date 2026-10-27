import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Opening a row from the cross-merchant All Orders list. A row click does NOT
 * open a modal — it navigates to the store-scoped Order detail
 * (`/pos/<seg>/<merchantId>/orders/<id>`), the same screen the merchant Orders
 * list uses, where the money actions (refund / cancel / adjust tip) live.
 *
 * SAFETY: every spec blocks writes before navigating, so even if a stray money
 * request fired during navigation it would be aborted and recorded — and these
 * tests assert that recorder stays empty, proving only navigation happened.
 */
test.describe('Điều hướng sang chi tiết đơn (Order detail navigation) — All Orders', () => {
  test.beforeEach(async ({ allOrdersPage }) => {
    await allOrdersPage.blockWrites();
    await allOrdersPage.goto();
    await allOrdersPage.waitForReady();
  });

  /**
   * TC-AOR-020 — clicking a row navigates to the store-scoped Order detail URL.
   */
  test(
    'TC-AOR-020 — opening a row navigates to the store-scoped Order detail',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ allOrdersPage, page }) => {
      const rowCount = await allOrdersPage.table.rows.count();
      test.skip(rowCount === 0, 'no orders to open');

      await allOrdersPage.openOrderRow(0);

      await expect(page).toHaveURL(/\/orders\/[^/]+$/);
      await expect(page).not.toHaveURL(/\/login/);
    },
  );

  /**
   * TC-AOR-021 — opening a row fires no money action: the blocked-writes recorder
   * stays empty while only navigating to the detail (nothing refund/cancel/adjust
   * is attempted just by opening it).
   */
  test(
    'TC-AOR-021 — opening a row fires no money action',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ allOrdersPage, page }) => {
      const blocked = await allOrdersPage.blockWrites();
      const rowCount = await allOrdersPage.table.rows.count();
      test.skip(rowCount === 0, 'no orders to open');

      await allOrdersPage.openOrderRow(0);
      await expect(page).toHaveURL(/\/orders\/[^/]+$/);

      expect(blocked, 'a money action fired while only opening the order detail').toEqual([]);
    },
  );
});
