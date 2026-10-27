import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import type { EditOrderStatus } from '@pages/orders/OrderDetailPage';

/**
 * Edit Order (VP-2591 / VP-2593) — "Hiển thị nút Edit & Eligibility".
 * Source: docs/test-cases/edit-order.md
 *
 * Safety: every test installs blockOrderMutations() before any navigation, so no
 * non-GET request to /orders, /customers or split_tip can reach the live DEV Portal.
 * Each test opens its own order by status and skips if DEV has no such order.
 */
test.describe('Hiển thị nút Edit & Eligibility — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  test(
    'TC-EO-001 — Nút edit hiện với order Successful - Unsettled',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ orderDetailPage }) => {
      expect(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
        'no DEV order with status Successful - Unsettled',
      ).toBeFalsy();
      await expect(orderDetailPage.editCustomerButton).toBeVisible();
      await expect(orderDetailPage.editServiceDetailsButton).toBeVisible();
    },
  );

  test(
    'TC-EO-002 — Nút edit hiện với order Successful - Settled',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ orderDetailPage }) => {
      expect(
        !(await orderDetailPage.openOrderWithStatus('Successful - Settled')),
        'no DEV order with status Successful - Settled',
      ).toBeFalsy();
      await expect(orderDetailPage.editCustomerButton).toBeVisible();
      await expect(orderDetailPage.editServiceDetailsButton).toBeVisible();
    },
  );

  test(
    'TC-EO-005 — Order Canceled không có nút edit',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      expect(
        !(await orderDetailPage.openOrderWithStatus('Canceled')),
        'no DEV order with status Canceled',
      ).toBeFalsy();
      // Detail is ready (heading + Order information card), so absence is meaningful.
      await expect(orderDetailPage.orderInformationCard).toBeVisible();
      await expect(orderDetailPage.editCustomerButton).toHaveCount(0);
      await expect(orderDetailPage.editServiceDetailsButton).toHaveCount(0);
    },
  );

  /**
   * Steps:
   *   1. Mở lần lượt order Pending, Re-opened, Canceling, Refunding, Cancel issue, Refund issue
   * Expected:
   *   không có nút edit
   *
   * Partial coverage: only Pending and Re-opened are verified (✅). Canceling, Refunding,
   * Cancel issue and Refund issue (🔍) have no DEV data and are not covered here.
   */
  test(
    'TC-EO-006 — Status không hợp lệ khác không có nút edit',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      const statuses: EditOrderStatus[] = ['Pending', 'Re-opened'];
      let checked = 0;
      for (const status of statuses) {
        await test.step(`order ${status} has no edit buttons`, async () => {
          if (!(await orderDetailPage.openOrderWithStatus(status))) return;
          checked += 1;
          await expect(orderDetailPage.orderInformationCard).toBeVisible();
          await expect(orderDetailPage.editCustomerButton).toHaveCount(0);
          await expect(orderDetailPage.editServiceDetailsButton).toHaveCount(0);
        });
      }
      expect(checked === 0, 'no DEV order with status Pending or Re-opened').toBeFalsy();
    },
  );
});
