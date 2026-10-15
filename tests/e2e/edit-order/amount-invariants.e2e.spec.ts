import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Rule tiền (bất biến) — Edit Order (VP-2591 / VP-2593).
 *
 * Safety: every test installs `blockOrderMutations()` before any navigation, so no non-GET request
 * can reach a live DEV order. Tests never click `Confirm update` or a dialog's final save.
 */
test.describe('Rule tiền (bất biến) — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  test(
    'TC-EO-054 — Không có field tiền nào sửa được',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      // Prefer an order with tip so `Total tip` is covered too; fall back to any unsettled order.
      let hasTip = await orderDetailPage.openOrderWithStatus('Successful - Unsettled', {
        withTip: true,
      });
      if (!hasTip) {
        const opened = await orderDetailPage.openOrderWithStatus('Successful - Unsettled');
        test.skip(!opened, 'no DEV order with status Successful - Unsettled');
      }

      await orderDetailPage.openEditServiceDialog();
      const dialog = orderDetailPage.editServiceDialog;

      // Line price is plain text inside the row (no input carries it).
      await expect(orderDetailPage.serviceRows.first()).toContainText(/\$[\d,]+\.\d{2}/);

      // `Services total` is static text.
      await expect(orderDetailPage.servicesTotal).toBeVisible();
      await expect(orderDetailPage.servicesTotal).toHaveText(/Services total\s*\$[\d,]+\.\d{2}/);

      // `Total tip` is static text (or the order has no tip at all).
      if (hasTip) {
        hasTip = await orderDetailPage.totalTip.isVisible();
      }
      if (hasTip) {
        await expect(orderDetailPage.totalTip).toHaveText(/Total tip\s*\$[\d,]+\.\d{2}/);
      } else {
        await expect(orderDetailPage.noTipText).toBeVisible();
      }

      // No amount / fee / discount / payment / price / total input exists anywhere in the dialog.
      const moneyLike = /amount|fee|discount|payment|price|total|subtotal|tax/i;
      const tipShare = /^Tip amount for /;
      // The only money-like named inputs allowed are the per-staff `Tip amount for <Staff>` shares.
      for (const role of ['textbox', 'spinbutton'] as const) {
        const tipShares = await dialog.getByRole(role, { name: tipShare }).count();
        await expect(dialog.getByRole(role, { name: moneyLike })).toHaveCount(tipShares);
      }

      // Every editable textbox/spinbutton is one of the documented non-money fields
      // (Service name, Service note, Order note) or a per-staff tip share (allocation, not total).
      const allowedTextboxes =
        (await orderDetailPage.serviceNameInputs.count()) +
        (await orderDetailPage.serviceNoteInputs.count()) +
        (await orderDetailPage.orderNote.count()) +
        (await dialog.getByRole('textbox', { name: tipShare }).count());
      await expect(dialog.getByRole('textbox')).toHaveCount(allowedTextboxes);
      await expect(dialog.getByRole('spinbutton')).toHaveCount(
        await dialog.getByRole('spinbutton', { name: tipShare }).count(),
      );

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  /**
   * Steps:
   *   1. Ghi Subtotal/Discount/Tax/Tip/Total trước khi edit
   *   2. đổi staff + tên + tip
   *   3. lưu
   * Expected: các giá trị giống hệt
   */
  test.fixme('TC-EO-055 — Tổng order trước = sau', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): needs `Confirm update` on a real order (persisted mutation) — forbidden on
    // live DEV data; requires a disposable seeded order to compare Order summary before/after.
  });

  /**
   * Steps:
   *   1. Sau khi lưu
   * Expected: Payment details giữ đúng số payment cũ. Activity log tab `Tender` không có bản ghi mới
   */
  test.fixme('TC-EO-056 — Không phát sinh transaction mới', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): needs `Confirm update` (persisted save) on a seeded order, then verify
    // Payment details + Activity log `Tender` tab — cannot mutate live DEV orders.
  });

  /**
   * Steps:
   *   1. Gọi `PUT /orders/{id}/items` với payload chứa amount/fee/discount/tip/payment
   * Expected: API trả lỗi 4xx, dữ liệu không đổi
   */
  test.fixme('TC-EO-057 — API chặn field tiền', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): API-level negative test — needs an authenticated API client and a
    // disposable seeded order; a mis-validated BE would mutate live DEV data.
  });

  /**
   * Steps:
   *   1. Order có discount dòng (vd "-$10.00 off discount")
   *   2. đổi staff/tên
   *   3. lưu
   * Expected: discount và giá sau giảm giữ nguyên
   */
  test.fixme('TC-EO-058 — Order có discount', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): needs a seeded order with a line discount and `Confirm update` to verify
    // persistence — cannot be done read-only against live DEV data.
  });
});
