import { test } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Edit Order — Activity log & tag "Updated" (VP-2591 / VP-2593).
 * Source: docs/test-cases/edit-order.md (TC-EO-065 … TC-EO-068).
 *
 * Every case in this area only becomes observable AFTER an edit has been
 * persisted via the confirm popup's "Confirm update". Specs must never click
 * that button on live DEV data, so all cases are scaffolded as test.fixme.
 */
test.describe('Activity log & tag Updated — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    // Safety net: abort every non-GET to orders/customers so nothing can mutate DEV.
    await orderDetailPage.blockOrderMutations();
  });

  /**
   * TC-EO-065 — Activity log đủ thông tin (High, Functional)
   * Steps:
   *   1. Sau khi lưu
   * Expected:
   *   Activity log có: user thực hiện, thời gian, field thay đổi, giá trị cũ → mới
   * Source: 2591-TC23 · 2593-TC45 · scan: 🔍
   */
  test.fixme('TC-EO-065 — Activity log đủ thông tin', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): needs a persisted edit (Confirm update) on a seeded/disposable order,
    // then assert orderDetailPage.activityLogCard shows user, timestamp, changed field and old → new value.
  });

  /**
   * TC-EO-066 — Log khi sửa nhiều field cùng lúc (High, Functional)
   * Steps:
   *   1. Đổi Staff + tên service + Tip trong 1 lần Save
   * Expected:
   *   log ghi từng field. Mọi thay đổi đều đúng
   * Source: 2591-TC24 · 2593-TC46 · scan: 🔍
   */
  test.fixme(
    'TC-EO-066 — Log khi sửa nhiều field cùng lúc',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): needs Confirm update of a multi-field edit (staff + service name + tip)
      // on a seeded order with tip, then verify one activity-log entry per changed field.
    },
  );

  /**
   * TC-EO-067 — Tag Updated ở Order Detail (High, Functional)
   * Steps:
   *   1. Sau khi lưu
   * Expected:
   *   header Order Detail có tag Updated
   * Source: 2591-TC25 · 2593-TC44 · scan: 🔍
   */
  test.fixme('TC-EO-067 — Tag Updated ở Order Detail', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): needs an order that has been edited and saved via Confirm update
    // (seeded data); then assert orderDetailPage.updatedTag is visible in the header.
  });

  /**
   * TC-EO-068 — Tag Updated ở Order Listing (Medium, Functional)
   * Steps:
   *   1. Sau khi lưu
   * Expected (spec):
   *   dòng order trên listing có tag Updated
   * Source: 2591-TC26 · 2593-TC43 · scan: ⚠️
   */
  test.fixme('TC-EO-068 — Tag Updated ở Order Listing', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(spec-conflict): scan shows the Updated tag is not yet on the Orders listing
    // (waiting for BE to expose `edited`, VP-3825) — awaiting PO/DEV decision.
  });
});
