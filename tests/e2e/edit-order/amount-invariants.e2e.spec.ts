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
        expect(!opened, 'no DEV order with status Successful - Unsettled').toBeFalsy();
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
});
