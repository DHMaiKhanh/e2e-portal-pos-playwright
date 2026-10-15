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
      test.skip(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
        'no DEV order with status Successful - Unsettled',
      );
      await expect(orderDetailPage.editCustomerButton).toBeVisible();
      await expect(orderDetailPage.editServiceDetailsButton).toBeVisible();
    },
  );

  test(
    'TC-EO-002 — Nút edit hiện với order Successful - Settled',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ orderDetailPage }) => {
      test.skip(
        !(await orderDetailPage.openOrderWithStatus('Successful - Settled')),
        'no DEV order with status Successful - Settled',
      );
      await expect(orderDetailPage.editCustomerButton).toBeVisible();
      await expect(orderDetailPage.editServiceDetailsButton).toBeVisible();
    },
  );

  test(
    'TC-EO-003 — Nút edit hiện với order Partial refunded',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(
        !(await orderDetailPage.openOrderWithStatus('Partial Refunded')),
        'no DEV order with status Partial Refunded',
      );
      await expect(orderDetailPage.editCustomerButton).toBeVisible();
      await expect(orderDetailPage.editServiceDetailsButton).toBeVisible();
    },
  );

  /**
   * Steps:
   *   1. Mở order Refunded
   * Expected:
   *   theo VP-2591 (mô tả): **không** có nút edit. Theo comment PO và VP-2593 AC: **có** nút edit
   */
  test.fixme('TC-EO-004 — Order Refunded', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(spec-conflict): Thực tế không có nút edit trên order Refunded (scan ⚠️); VP-2591 nói
    // không có, PO comment + VP-2593 AC nói có — awaiting PO/DEV decision.
  });

  test(
    'TC-EO-005 — Order Canceled không có nút edit',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(
        !(await orderDetailPage.openOrderWithStatus('Canceled')),
        'no DEV order with status Canceled',
      );
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
      test.skip(checked === 0, 'no DEV order with status Pending or Re-opened');
    },
  );

  /**
   * Steps:
   *   1. Order thuộc kỳ payroll đã lock
   * Expected:
   *   nút edit vẫn hiện, lưu được. Sau khi lưu, Store Income / Staff Income / Staff Payroll được recalculate
   */
  test.fixme(
    'TC-EO-007 — Kỳ payroll đã chốt (locked) vẫn được edit',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): needs an order seeded inside a locked payroll period, a real
      // Confirm update (never allowed on live DEV) and income/payroll report recalculation checks.
    },
  );

  /**
   * Steps:
   *   1. Order có staff thuộc kỳ payroll đã in check
   * Expected:
   *   nút edit ẩn/disable, hoặc lưu bị chặn kèm thông báo liên hệ DEV
   */
  test.fixme(
    'TC-EO-008 — Kỳ payroll đã tạo Check thì không cho edit',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): needs seeded data — an order whose staff belongs to a payroll period
      // with a printed check — and possibly a save attempt (Confirm update) to observe the block.
    },
  );

  /**
   * Steps:
   *   1. Đăng nhập bằng role không có quyền sửa order
   * Expected:
   *   không thấy hoặc không dùng được nút edit
   */
  test.fixme(
    'TC-EO-009 — User không có quyền thì không edit được',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): needs a separate storageState for a role without order-edit
      // permission; the suite only has the admin session.
    },
  );
});
