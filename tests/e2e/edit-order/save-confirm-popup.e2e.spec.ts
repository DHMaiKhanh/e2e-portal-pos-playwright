import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Save / Confirm popup — Edit Order (VP-2591 / VP-2593), doc section B9.
 *
 * SAFETY: every test installs `blockOrderMutations()` before navigating, so any non-GET request to
 * /orders, /customers or split_tip is aborted. Tests may click `Save changes` only to reveal the
 * confirm popup, and must then click the popup's `Cancel`. `Confirm update` is NEVER clicked.
 */
test.describe('Save / Confirm popup — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  test(
    'TC-EO-059 — Save disabled khi chưa có thay đổi hợp lệ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      expect(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
        'no DEV order with status Successful - Unsettled',
      ).toBeFalsy();
      await orderDetailPage.openEditServiceDialog();

      // Freshly opened dialog: nothing changed yet -> Save disabled.
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      // A valid change (order note) enables Save.
      await orderDetailPage.orderNote.fill(`e2e note ${Date.now()}`);
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();

      // A validation error (empty staff group via Add staff) disables Save again.
      await orderDetailPage.addStaffButton.click();
      await expect(orderDetailPage.emptyGroupError).toBeVisible();
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  test(
    'TC-EO-061 — Cancel trên popup',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      expect(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
        'no DEV order with status Successful - Unsettled',
      ).toBeFalsy();
      await orderDetailPage.openEditServiceDialog();

      const note = `e2e note ${Date.now()}`;
      await orderDetailPage.orderNote.fill(note);

      await orderDetailPage.openConfirmPopup();
      await expect(orderDetailPage.confirmCancelButton).toBeVisible();
      await orderDetailPage.dismissConfirmPopup();

      // Popup closed, edit dialog still open and keeps the pending change, nothing saved.
      await expect(orderDetailPage.editServiceDialog).toBeVisible();
      await expect(orderDetailPage.orderNote).toHaveValue(note);
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();
      expect(orderDetailPage.blockedRequests).toEqual([]);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'TC-EO-063 — Đóng dialog không lưu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      expect(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
        'no DEV order with status Successful - Unsettled',
      ).toBeFalsy();
      await orderDetailPage.openEditServiceDialog();

      const originalNote = await orderDetailPage.orderNote.inputValue();
      const originalFirstService = await orderDetailPage.serviceNameInputs.first().inputValue();

      // Edit a couple of fields.
      await orderDetailPage.orderNote.fill(`e2e note ${Date.now()}`);
      await orderDetailPage.serviceNameInputs.first().fill(`e2e service ${Date.now()}`);
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();

      // Cancel closes immediately — no discard-confirmation prompt (per scan).
      await orderDetailPage.cancelButton.click();
      await expect(orderDetailPage.editServiceDialog).toBeHidden();
      await expect(orderDetailPage.confirmPopup).toBeHidden();

      // Re-open: original data is back.
      await orderDetailPage.openEditServiceDialog();
      await expect(orderDetailPage.orderNote).toHaveValue(originalNote);
      await expect(orderDetailPage.serviceNameInputs.first()).toHaveValue(originalFirstService);
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );
});
