import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Edit Order — area "Sửa Staff" (docs/test-cases/edit-order.md, B3; VP-2591 / VP-2593).
 *
 * SAFETY: beforeEach installs orderDetailPage.blockOrderMutations() before any navigation, so every
 * non-GET request to order/customer/tip endpoints is aborted. Tests only interact inside the
 * "Edit service details" dialog and always leave via `Cancel` — `Confirm update` is never clicked.
 * Each test opens the order it needs and skips when DEV has no matching order.
 */
test.describe('Sửa Staff — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  test(
    'TC-EO-015 — Bố cục dialog Edit service details',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ orderDetailPage }) => {
      // withStaffRows: DEV also holds store-only orders ("Store · Not editable")
      // whose dialog has no staff group to check.
      expect(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled', {
          withStaffRows: true,
        })),
        'no DEV order with status Successful - Unsettled and a staff row',
      ).toBeFalsy();

      await orderDetailPage.openEditServiceDialog();

      await expect(orderDetailPage.editServiceDialog).toBeVisible();
      await expect(orderDetailPage.editServiceDescription).toBeVisible();
      await expect(orderDetailPage.staffAndServicesHeading).toBeVisible();

      // Every staff group header shows "N service(s) · $x.xx".
      const names = await orderDetailPage.staffNames();
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        await expect(orderDetailPage.groupSummary(name)).toContainText(
          /\d+ services?\s*·\s*\$[\d,]+\.\d{2}/,
        );
      }

      await expect(orderDetailPage.orderNote).toBeVisible();
      await expect(orderDetailPage.servicesTotal).toBeVisible();
      await expect(orderDetailPage.cancelButton).toBeVisible();
      await expect(orderDetailPage.saveChangesButton).toBeVisible();
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  test(
    'TC-EO-017 — Tick nhiều dòng rồi Move to…',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      // Settled orders are editable too (TC-EO-002). Since 2025-01 DEV has only
      // ~18 Unsettled orders and none with 2+ staff, so use a Settled one — the
      // Move-to behaviour does not depend on the settlement state, and the test
      // never saves.
      expect(
        !(await orderDetailPage.openOrderWithStatus('Successful - Settled', { staffCount: 2 })),
        'no DEV order with status Successful - Settled and at least 2 staff',
      ).toBeFalsy();

      await orderDetailPage.openEditServiceDialog();
      const names = await orderDetailPage.staffNames();
      expect(names.length).toBeGreaterThanOrEqual(2);
      const target = names[1];
      const targetRows = orderDetailPage
        .groupByStaff(target)
        .getByRole('textbox', { name: 'Service name' });
      const rowsBefore = await targetRows.count();
      const totalBefore = await orderDetailPage.readServicesTotal();

      // Move bar is hidden until a row is checked.
      await expect(orderDetailPage.moveToButton).toBeHidden();

      // First checkbox belongs to the first group (DOM order).
      await orderDetailPage.selectServices(0);
      await expect(orderDetailPage.moveToButton).toBeVisible();
      await expect(orderDetailPage.clearSelectionButton).toBeVisible();

      await orderDetailPage.moveSelectedTo(target);

      // The checked row now lives in the target staff's group; amounts are untouched.
      await expect(targetRows).toHaveCount(rowsBefore + 1);
      expect(await orderDetailPage.readServicesTotal()).toBe(totalBefore);

      // Dialog-local change only — leave without saving.
      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  test('TC-EO-021 — Thêm staff', { tag: [Tag.REGRESSION, Tag.UI] }, async ({ orderDetailPage }) => {
    // Only the ✅ part (adding the empty group) is covered. Choosing a staff, dragging a
    // service in and saving (🔍) is not — it needs drag-and-drop + Confirm update on live data.
    expect(
      !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
      'no DEV order with status Successful - Unsettled',
    ).toBeFalsy();

    await orderDetailPage.openEditServiceDialog();
    const groupsBefore = await orderDetailPage.changeStaffButtons.count();

    await orderDetailPage.addStaffButton.click();

    await expect(orderDetailPage.changeStaffButtons).toHaveCount(groupsBefore + 1);
    await expect(orderDetailPage.groupByStaff('Select staff')).toBeVisible();
    await expect(orderDetailPage.groupSummary('Select staff')).toContainText(/0 services/);
    await expect(orderDetailPage.emptyGroupHint).toBeVisible();

    await orderDetailPage.closeEditServiceDialog();
    expect(orderDetailPage.blockedRequests).toEqual([]);
  });

  test(
    'TC-EO-024 — Nhóm rỗng chặn Save',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      expect(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
        'no DEV order with status Successful - Unsettled',
      ).toBeFalsy();

      await orderDetailPage.openEditServiceDialog();

      // A valid change first, so the disabled state below is caused by the empty group.
      await orderDetailPage.orderNote.fill('e2e TC-EO-024 (never saved)');
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();

      // Variant from the doc: `Add staff` without assigning a service.
      await orderDetailPage.addStaffButton.click();

      await expect(orderDetailPage.groupSummary('Select staff')).toContainText(/0 services/);
      await expect(orderDetailPage.emptyGroupHint).toBeVisible();
      await expect(orderDetailPage.emptyGroupError).toBeVisible();
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );
});
