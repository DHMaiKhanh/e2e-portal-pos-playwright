import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Edit Order — B2. Edit customer (docs/test-cases/edit-order.md, VP-2591).
 *
 * SAFETY: beforeEach installs blockOrderMutations() before any navigation, so every non-GET
 * request to /orders, /customers and split_tip is aborted. Tests never click the customer
 * dialog's "Save changes" nor "Confirm update" on live DEV data.
 */
test.describe('Edit customer — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  test(
    'TC-EO-010 — Mở dialog Edit customer',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      const opened =
        (await orderDetailPage.openOrderWithStatus('Successful - Unsettled')) ||
        (await orderDetailPage.openOrderWithStatus('Successful - Settled'));
      test.skip(!opened, 'no DEV order with status Successful - Unsettled / Settled');

      await orderDetailPage.openEditCustomerDialog();
      const dialog = orderDetailPage.customerDialog;

      // Title is "Add customer" when no customer is attached (A4); may read "Change customer" otherwise.
      await expect(
        dialog.getByRole('heading', { name: /Add customer|Change customer/i }).first(),
      ).toBeVisible();
      await expect(dialog.getByText(/customer to Order #/i).first()).toBeVisible();
      await expect(orderDetailPage.customerSearchInput).toBeVisible();
      // Customer list with masked phone numbers, e.g. "••• ••• 1152".
      await expect(dialog.getByText(/•••/).first()).toBeVisible();
      await expect(orderDetailPage.customerLoyaltyNote).toBeVisible();
      await expect(orderDetailPage.customerCancelButton).toBeVisible();
      await expect(orderDetailPage.customerSaveButton).toBeVisible();
      await expect(orderDetailPage.customerSaveButton).toBeDisabled();

      await orderDetailPage.customerCancelButton.click();
      await expect(dialog).toBeHidden();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  /**
   * Steps:
   *   1. Chọn customer
   *   2. `Save changes`
   *   3. (popup Confirm nếu có)
   * Expected: Customer trên Order information cập nhật. Tổng order, payment giữ nguyên
   */
  test.fixme(
    'TC-EO-011 — Đổi customer thành công, tổng tiền không đổi',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): needs a real Save/Confirm update that mutates a live DEV order
      // (blocked by blockOrderMutations) — run against a seeded/disposable order instead.
    },
  );

  /**
   * Steps:
   *   1. Gõ tên hoặc SĐT vào ô search
   * Expected: danh sách được lọc đúng. Không có kết quả thì hiện empty state
   */
  test.fixme('TC-EO-012 — Tìm customer', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): unscanned (🔍) — needs known seeded customers (name/phone) to assert
    // filtering, and the empty-state text has not been captured from the real DOM yet.
  });

  /**
   * Steps:
   *   1. Chọn customer
   *   2. `Cancel`
   * Expected: dialog đóng, customer không đổi
   */
  test.fixme('TC-EO-013 — Huỷ đổi customer', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): unscanned (🔍) — customer list item selection markup not yet captured
    // in the scan inventory (A4), so no reliable locator for "Chọn customer".
  });

  /**
   * Steps:
   *   1. Sau khi lưu
   *   2. Activity log có bản ghi customer cũ
   * Expected: → mới, order có tag Updated
   */
  test.fixme(
    'TC-EO-014 — Đổi customer có tạo activity log và tag Updated',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): requires Confirm update to persist the customer change (mutates live
      // DEV data) before the Activity log entry and the Updated tag can be checked.
    },
  );
});
