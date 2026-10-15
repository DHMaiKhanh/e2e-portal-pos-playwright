import { test } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Edit Order (VP-2591 / VP-2593) — "Edge case / Negative / Phi chức năng".
 * Source: docs/test-cases/edit-order.md
 *
 * Both cases in this area need a real 'Confirm update' (persistence + error handling on
 * the save API), which is forbidden on live DEV data, so they are scaffolded as
 * test.fixme. Every test still installs blockOrderMutations() so no non-GET request to
 * /orders, /customers or split_tip can reach the live DEV Portal.
 */
test.describe('Edge case / Negative / Phi chức năng — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  /**
   * Steps:
   *   1. Edit cùng 1 order 3 lần
   * Expected: dữ liệu và activity log đúng qua từng lần, tổng tiền không đổi
   */
  test.fixme('TC-EO-069 — Edit nhiều lần liên tiếp', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): scan 🔍 — needs 3 consecutive 'Confirm update' saves on a seeded,
    // disposable order, then check the Activity log entries and that servicesTotal /
    // total tip stay unchanged after each save. Confirm update is never clicked on live DEV.
  });

  /**
   * Steps:
   *   1. Giả lập offline hoặc API 5xx khi bấm `Confirm update`
   * Expected: hiện thông báo lỗi, order không bị cập nhật một phần,
   *   dữ liệu đang sửa trong dialog không mất
   */
  test.fixme('TC-EO-070 — Lỗi mạng / API khi Confirm', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): scan 🔍 — needs offline / 5xx emulation on the order-update API
    // while clicking 'Confirm update', plus a backend check that no partial update was
    // persisted. The expected error message text is not in the scan inventory; verify
    // against a seeded order (route.fulfill({ status: 500 })) once the error UI is known.
  });
});
