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
      expect(!opened, 'no DEV order with status Successful - Unsettled / Settled').toBeFalsy();

      await orderDetailPage.openEditCustomerDialog();
      const dialog = orderDetailPage.customerDialog;

      // Title is "Add customer" when no customer is attached (A4), "Edit customer" when one is
      // ("Change the customer on Order #…").
      await expect(
        dialog
          .getByRole('heading', { name: /Add customer|Edit customer|Change customer/i })
          .first(),
      ).toBeVisible();
      await expect(dialog.getByText(/customer (to|on) Order #/i).first()).toBeVisible();
      await expect(orderDetailPage.customerSearchInput).toBeVisible();
      // Customer list with masked phone numbers, e.g. "••• ••• 1152".
      // Masked phones: "••• ••• 1152" in the list, "(***) ***-8876" for the current customer.
      await expect(dialog.getByText(/•••|\*\*\*/).first()).toBeVisible();
      await expect(orderDetailPage.customerLoyaltyNote).toBeVisible();
      await expect(orderDetailPage.customerCancelButton).toBeVisible();
      await expect(orderDetailPage.customerSaveButton).toBeVisible();
      await expect(orderDetailPage.customerSaveButton).toBeDisabled();

      await orderDetailPage.customerCancelButton.click();
      await expect(dialog).toBeHidden();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );
});
