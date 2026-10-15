import { test } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Edit Order — area "Dòng Store (không có staff)" (VP-2593 TC23–TC26).
 *
 * All cases in this area are 🔍 unverified in the scan: DEV currently has no
 * order containing a store item (a line without staff), so they are scaffolded
 * as test.fixme until such data exists. Every test still installs the
 * mutation blocker so no live DEV order can be changed.
 */
test.describe('Dòng Store (không có staff) — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  /**
   * Steps:
   *  1. Order có store item
   *  2. mở edit
   * Expected: dòng store không có tay nắm kéo / không kéo được
   */
  test.fixme('TC-EO-039 — Store item không kéo được', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): scan 🔍 (thiếu data) — DEV has no order with a store item;
    // needs a seeded order containing a store line, then assert the store row has no
    // 'Drag to reassign staff' handle (orderDetailPage.dragHandles) and cannot be dragged.
  });

  /**
   * Steps:
   *  1. Không có checkbox, `Service name` và `Change service` bị khoá
   * Expected: Không có checkbox, `Service name` và `Change service` bị khoá
   */
  test.fixme(
    'TC-EO-040 — Store item không chọn, không sửa được',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): scan 🔍 — needs a seeded order with a store item; then assert the
      // store row has no 'Select service' checkbox and its 'Service name' textbox /
      // 'Change service' button are disabled/read-only.
    },
  );

  /**
   * Steps:
   *  1. Store item không xuất hiện trong Recipients & amounts
   * Expected: Store item không xuất hiện trong Recipients & amounts
   */
  test.fixme('TC-EO-041 — Store item không nhận tip', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): scan 🔍 — needs a seeded order with a store item AND a tip; then
    // assert no 'Tip amount for <Store>' input exists under 'Recipients & amounts'.
  });

  /**
   * Steps:
   *  1. Lưu thay đổi
   * Expected: request `PUT /orders/{id}/items` không chứa store item (kiểm tra Network)
   */
  test.fixme(
    'TC-EO-042 — Store item không có trong payload',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): scan 🔍 — needs Confirm update (forbidden on live DEV data) and a
      // seeded order with a store item; verify via Network that the PUT /orders/{id}/items
      // payload excludes the store line (could inspect the request captured by the
      // blockOrderMutations() route before it is aborted, on a disposable order).
    },
  );
});
