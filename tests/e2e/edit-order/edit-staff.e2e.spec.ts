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
      test.skip(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
        'no DEV order with status Successful - Unsettled',
      );

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

  /**
   * Steps:
   *  1. Kéo `Drag to reassign staff` của 1 dòng sang nhóm staff khác
   * Expected: dòng chuyển nhóm, tổng của từng nhóm cập nhật, `Services total` không đổi
   */
  test.fixme(
    'TC-EO-016 — Kéo-thả dòng service sang staff khác',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): scan 🔍 — drag-and-drop between staff groups was not verified in the
      // DOM scan (custom DnD handle 'Drag to reassign staff'; drop targets unknown). Needs a
      // 2-staff order (openOrderWithStatus('Successful - Unsettled', { staffCount: 2 })) and a
      // confirmed drag strategy (pointer events vs. keyboard DnD) before asserting group
      // summaries update while readServicesTotal() stays the same.
    },
  );

  test(
    'TC-EO-017 — Tick nhiều dòng rồi Move to…',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled', { staffCount: 2 })),
        'no DEV order with status Successful - Unsettled and at least 2 staff',
      );

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

  /**
   * Steps:
   *  1. Tick vài dòng
   *  2. `Clear`
   * Expected: bỏ chọn hết, `Move to…` ẩn
   */
  test.fixme('TC-EO-018 — Bỏ chọn bằng `Clear`', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): scan 🔍 — `Clear` was seen but its effect (all 'Select service'
    // checkboxes unchecked, `Move to…` hidden) was not verified in the scan. Promote once
    // confirmed: selectServices(0, 1) → clearSelectionButton.click() → expect every
    // selectServiceCheckboxes item not checked and moveToButton hidden.
  });

  /**
   * Steps:
   *  1. `Change staff for this group`
   *  2. `Search staff…`
   *  3. chọn staff
   * Expected: toàn bộ dòng của nhóm chuyển sang staff mới
   */
  test.fixme('TC-EO-019 — Đổi staff cho cả nhóm', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): scan 🔍 — the group staff picker (staffSearchInput 'Search staff…')
    // was observed but choosing a staff and the resulting regrouping were not verified; also
    // needs a known spare staff name in the store's picker list (not seeded on DEV).
  });

  /**
   * Steps:
   *  1. Order 2 staff A, B: chuyển service của A sang B và của B sang A
   *  2. lưu
   * Expected: mỗi staff nhận đúng service mới
   */
  test.fixme('TC-EO-020 — Hoán đổi service giữa 2 staff', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): scan 🔍 — requires `Save changes` → `Confirm update` and re-reading
    // the saved order, which mutates live DEV data (forbidden; blockOrderMutations() aborts it).
    // Needs a disposable seeded 2-staff order.
  });

  test('TC-EO-021 — Thêm staff', { tag: [Tag.REGRESSION, Tag.UI] }, async ({ orderDetailPage }) => {
    // Only the ✅ part (adding the empty group) is covered. Choosing a staff, dragging a
    // service in and saving (🔍) is not — it needs drag-and-drop + Confirm update on live data.
    test.skip(
      !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
      'no DEV order with status Successful - Unsettled',
    );

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

  /**
   * Steps:
   *  1. `Staff actions`
   *  2. `Remove staff`
   * Expected: nhóm bị xoá. Nếu nhóm còn service thì các service phải được chuyển đi hoặc thao tác bị chặn
   */
  test.fixme('TC-EO-022 — Xoá staff', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): scan 🔍 (menu seen only) — the outcome of 'Remove staff' on a group
    // that still holds services (move vs. block) is undefined in the scan; needs PO/DEV
    // confirmation of the expected behavior before asserting.
  });

  /**
   * Steps:
   *  1. `Staff actions`
   *  2. `Select all services`
   * Expected: mọi dòng của nhóm được tick
   */
  test.fixme('TC-EO-023 — Chọn tất cả service của 1 staff', { tag: [Tag.REGRESSION] }, async () => {
    // TODO(manual/setup): scan 🔍 (menu seen only) — effect of 'Select all services' was not
    // verified. Promote once confirmed: openStaffActions(0) → menuItem('Select all services')
    // → every 'Select service' checkbox in the first group is checked.
  });

  test(
    'TC-EO-024 — Nhóm rỗng chặn Save',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.skip(
        !(await orderDetailPage.openOrderWithStatus('Successful - Unsettled')),
        'no DEV order with status Successful - Unsettled',
      );

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

  /**
   * Steps:
   *  1. Đổi staff dòng X từ A sang B
   *  2. lưu
   * Expected: Staff Income / Payroll: sale, tip, income của dòng X thuộc B, số tiền giữ nguyên
   */
  test.fixme(
    'TC-EO-025 — Đổi staff thì sale/tip/income đi theo staff mới',
    { tag: [Tag.REGRESSION] },
    async () => {
      // TODO(manual/setup): scan 🔍 — needs `Confirm update` on a disposable seeded order and a
      // follow-up check in Staff Income / Payroll reports; mutating live DEV orders is forbidden.
    },
  );
});
