import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Edit Order — "Dòng Refunded (order Partial refunded)" area.
 * Source: docs/test-cases/edit-order.md (VP-2591 / VP-2593).
 *
 * Safety: every test installs blockOrderMutations() before navigation so no
 * non-GET request can reach a live DEV order. Tests never click 'Confirm update'.
 */
test.describe('Dòng Refunded (order Partial refunded) — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  test(
    'TC-EO-034 — Dòng refunded có label "Refunded" và highlight đỏ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(
        !(await orderDetailPage.openOrderWithStatus('Partial Refunded')),
        'no DEV order with status Partial Refunded',
      );

      await orderDetailPage.openEditServiceDialog();

      // ✅ label part: the refunded line carries a "Refunded" label inside the dialog.
      await expect(orderDetailPage.refundedLabels.first()).toBeVisible();

      // 🔍 Red background/border is not asserted — colour is a visual check (see screenshot in .md).

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  /**
   * Steps:
   *   1. Kéo hoặc `Move to…` dòng refunded, sửa tên
   * Expected:
   *   được phép. BE tự tính lại
   */
  test.fixme('TC-EO-035 — Dòng refunded vẫn move/sửa được', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(spec-conflict): observed on scan — `Service name`, `Change service`, drag handle and
    // `Select service` checkbox are all DISABLED on the refunded line — awaiting PO/DEV decision
  });

  /**
   * Steps:
   *   1. Order Partial refunded có tip
   * Expected:
   *   Recipients & amounts và `$x in services` không tính tiền dòng refunded
   */
  test.fixme(
    'TC-EO-036 — Dòng refunded không tính vào tip',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): needs seeded DEV data — a Partial refunded order that also has a tip
      // (none found during scan); verify per-staff "$x in services" excludes the refunded line amount.
    },
  );

  /**
   * Steps:
   *   1. Move dòng refunded
   *   2. lưu
   * Expected:
   *   tổng order, số tiền refund không đổi
   */
  test.fixme(
    'TC-EO-037 — Tổng tiền đúng sau khi move dòng refunded',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): blocked by TC-EO-035 (refunded line cannot be moved) and requires
      // 'Confirm update' to persist the change on a live order, which tests must never do.
    },
  );

  /**
   * Steps:
   *   1. Kiểm tra `Services total` (thực tế $37.00, chỉ dòng chưa refund) so với header nhóm ($67.00)
   * Expected:
   *   xác nhận cách hiển thị đúng với ý PO
   */
  test.fixme(
    'TC-EO-038 — `Services total` khi có dòng refunded',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(spec-conflict): observed on scan — `Services total` counts only non-refunded lines
      // ($37.00) while the staff group header includes the refunded line ($67.00) — awaiting PO/DEV decision
    },
  );
});
