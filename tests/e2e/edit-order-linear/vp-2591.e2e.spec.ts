import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { parseMoney } from '@utils/stringUtils';
import {
  attachOnFail,
  backToOrder,
  currentUserName,
  errorMessage,
  expectStaffIncomeMoved,
  orderReportDay,
  expectLogEntry,
  findLogEntry,
  MARK,
  moveService,
  noteFor,
  openMutableOrder,
  pickMove,
  readDailySaleRow,
  readStaffIncome,
  restoreOrder,
  saveNote,
  storeBase,
} from './mutation-helpers';
import {
  balancedText,
  EDITABLE_STATUSES,
  escapeRegExp,
  expectEditButtons,
  expectNoEditButtons,
  forEachStatus,
  moveFirstGroupToSecond,
  openEditDialog,
  openStatus,
  openTipDialog,
  priceOf,
  readShares,
  sum,
} from './helpers';

/**
 * VP-2591 — "[Portal] Cho phép cập nhật thông tin Order không ảnh hưởng đến giá tiền".
 * One test per QC test case of the ticket (TC01–TC30), numbered as on Linear.
 * Source: docs/test-cases/edit-order-linear.md, section 2.
 *
 * First describe: read-only cases. beforeEach installs blockOrderMutations() before any
 * navigation, so no non-GET request to /orders, /customers or split_tip reaches DEV.
 * Second describe: cases that need a real `Confirm update` — they save on DEV and revert.
 */
test.describe('VP-2591 — Edit Order (QC test cases)', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  // --- 1. Button Edit Order ---

  test(
    'VP-2591-TC01 — Button Edit Order hiển thị với order ở trạng thái hợp lệ',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ orderDetailPage }) => {
      await forEachStatus(
        orderDetailPage,
        ['Successful - Unsettled', 'Successful - Settled', 'Partial Refunded'],
        () => expectEditButtons(orderDetailPage),
      );
    },
  );

  test(
    'VP-2591-TC02 — Button Edit Order bị disable với order Canceled',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openStatus(orderDetailPage, 'Canceled');
      await expectNoEditButtons(orderDetailPage);
    },
  );

  test(
    'VP-2591-TC03 — Button Edit Order bị disable với order Refunded',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      // VP-2593 AC and a PO comment list Refunded as editable; this follows VP-2591's own TC03,
      // which matches DEV today (see edit-order-linear.md §1.3).
      await openStatus(orderDetailPage, 'Refunded');
      await expectNoEditButtons(orderDetailPage);
    },
  );

  // --- 4. Cập nhật Service ---

  // Covers the dialog part only: the persisted price after save needs `Confirm update`.
  test(
    'VP-2591-TC08 — Đổi sang service cùng giá → cho phép, line item giữ nguyên giá',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage, page }) => {
      await openEditDialog(orderDetailPage);
      const priceBefore = priceOf(await orderDetailPage.serviceRow(0).innerText());
      const totalBefore = await orderDetailPage.readServicesTotal();

      await orderDetailPage.changeServiceButtons.first().click();
      await expect(orderDetailPage.serviceSearchInput).toBeVisible();
      const options = page.getByRole('option').or(page.getByRole('menuitem'));
      await expect(options.first()).toBeVisible();
      await options.first().click();

      expect((await orderDetailPage.serviceNameInputs.first().inputValue()).trim()).not.toBe('');
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();
      expect(priceOf(await orderDetailPage.serviceRow(0).innerText())).toBe(priceBefore);
      expect(await orderDetailPage.readServicesTotal()).toBe(totalBefore);

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // The catalog shows no prices, so "khác giá" cannot be picked deliberately: the test picks a
  // catalog entry whose name differs from the current one and asserts the line keeps its price
  // (rule "giữ nguyên giá trị tiền của line item"). Persisted price after save is not covered.
  test(
    'VP-2591-TC09 — Chọn service giá khác → giữ nguyên giá trị tiền của line item',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage, page }) => {
      await openEditDialog(orderDetailPage);
      const nameInput = orderDetailPage.serviceNameInputs.first();
      const current = (await nameInput.inputValue()).trim();
      const priceBefore = priceOf(await orderDetailPage.serviceRow(0).innerText());
      const totalBefore = await orderDetailPage.readServicesTotal();

      await orderDetailPage.changeServiceButtons.first().click();
      await expect(orderDetailPage.serviceSearchInput).toBeVisible();
      const options = page.getByRole('option').or(page.getByRole('menuitem'));
      await expect(options.first()).toBeVisible();
      for (const text of await options.allInnerTexts()) expect(text).not.toMatch(/\$[\d,]+\.\d{2}/);
      const other = options.filter({ hasNotText: current }).first();
      expect(
        (await other.count()) === 0,
        'catalog has no service other than the current one',
      ).toBeFalsy();
      await other.click();

      expect((await nameInput.inputValue()).trim()).not.toBe(current);
      expect(priceOf(await orderDetailPage.serviceRow(0).innerText())).toBe(priceBefore);
      expect(await orderDetailPage.readServicesTotal()).toBe(totalBefore);

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // --- 5. Order/Service note ---

  // Dialog part only; showing the note on Order information after save needs `Confirm update`.
  test(
    'VP-2591-TC11 — Cập nhật Order description/note thành công',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      await expect(orderDetailPage.orderNote).toBeEditable();
      await orderDetailPage.orderNote.fill('E2E VP-2591 order note');
      await expect(orderDetailPage.orderNote).toHaveValue('E2E VP-2591 order note');
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // Dialog part only; the saved note needs `Confirm update` (and BE support for `note`).
  test(
    'VP-2591-TC12 — Cập nhật Service note cho từng item thành công',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      await orderDetailPage.addNoteButtons.first().click();
      const noteInput = orderDetailPage.serviceNoteInputs.first();
      await expect(noteInput).toBeVisible();
      await noteInput.fill('E2E VP-2591 service note');
      await expect(noteInput).toHaveValue('E2E VP-2591 service note');

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // --- 6. Tip ---

  test(
    'VP-2591-TC13 — Đổi Tip Split Method, Total Tip trước/sau không đổi',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage);
      const total = await orderDetailPage.readTotalTip();
      const staff = await orderDetailPage.staffNames();

      for (const method of ['Proportion', 'Manual', 'Split evenly'] as const) {
        await test.step(method, async () => {
          await orderDetailPage.selectTipSplit(method);
          expect(await orderDetailPage.readTotalTip()).toBe(total);
          await expect(orderDetailPage.balanceStatus).toContainText(balancedText(total));
          expect(Math.abs(sum(await readShares(orderDetailPage, staff)) - total)).toBeLessThan(
            0.005,
          );
        });
      }

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  // Recipient = staff doing the service (no manual picker), so "đổi staff nhận tip" is done by
  // moving services. Dialog part only.
  test(
    'VP-2591-TC14 — Đổi staff nhận Tip',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage, 2);
      const total = await orderDetailPage.readTotalTip();
      const [from, to] = await moveFirstGroupToSecond(orderDetailPage);

      await expect(orderDetailPage.tipAmountInput(from)).toHaveCount(0);
      await expect(orderDetailPage.tipAmountInput(to)).toBeVisible();
      expect(await orderDetailPage.readTotalTip()).toBe(total);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'VP-2591-TC15 — Điều chỉnh số Tip phân bổ cho từng người, Total Tip giữ nguyên',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage, 2);
      await orderDetailPage.selectTipSplit('Manual');
      const total = await orderDetailPage.readTotalTip();
      const staff = await orderDetailPage.staffNames();

      // Whole tip to the first staff, 0 to the rest: still sums to Total tip.
      await orderDetailPage.tipAmountInput(staff[0]).fill(total.toFixed(2));
      for (const name of staff.slice(1)) await orderDetailPage.tipAmountInput(name).fill('0.00');

      await expect(orderDetailPage.balanceStatus).toContainText(balancedText(total));
      await expect(orderDetailPage.tipError).toBeHidden();
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();
      expect(await orderDetailPage.readTotalTip()).toBe(total);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'VP-2591-TC16 — Phân bổ Tip có tổng khác Total Tip → chặn, không cho Save',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage);
      await orderDetailPage.selectTipSplit('Manual');
      const [first] = await orderDetailPage.staffNames();
      const input = orderDetailPage.tipAmountInput(first);
      const current = parseMoney(await input.inputValue());
      await input.fill((current + 1.15).toFixed(2));

      await expect(orderDetailPage.balanceStatus).toContainText(/Off by/);
      await expect(orderDetailPage.tipError).toBeVisible();
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  // --- 7. Ràng buộc không đổi giá tiền ---

  test(
    'VP-2591-TC17 — Field amount/fee/discount/tip value/payment không thể chỉnh sửa',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      const dialog = orderDetailPage.editServiceDialog;
      const tipShare = /^Tip amount for /;
      const moneyLike = /amount|fee|discount|payment|price|total|subtotal|tax/i;

      await expect(orderDetailPage.serviceRows.first()).toContainText(/\$[\d,]+\.\d{2}/);
      await expect(orderDetailPage.servicesTotal).toHaveText(/Services total\s*\$[\d,]+\.\d{2}/);
      // The only money-like inputs are per-staff tip shares (allocation, not the tip value).
      for (const role of ['textbox', 'spinbutton'] as const) {
        const shares = await dialog.getByRole(role, { name: tipShare }).count();
        await expect(dialog.getByRole(role, { name: moneyLike })).toHaveCount(shares);
      }
      await expect(dialog.getByRole('textbox', { name: /total tip/i })).toHaveCount(0);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  // --- 8. Confirmation popup ---

  test(
    'VP-2591-TC20 — Bấm Save → popup đúng Title "Confirm Order Update?" và Message theo spec',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      test.info().annotations.push({
        type: 'note',
        description:
          'DEV renders "Confirm order update?" / "Confirm update" (lower case) — title and button are matched case-insensitively.',
      });
      await openEditDialog(orderDetailPage);
      await orderDetailPage.orderNote.fill(`E2E VP-2591 ${Date.now()}`);
      await orderDetailPage.openConfirmPopup();

      await expect(orderDetailPage.confirmPopup).toContainText(/Confirm Order Update\?/i);
      await expect(orderDetailPage.confirmPopupMessage).toBeVisible();
      await expect(orderDetailPage.confirmCancelButton).toBeVisible();
      await expect(orderDetailPage.confirmUpdateButton).toBeVisible();

      await orderDetailPage.dismissConfirmPopup();
      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  test(
    'VP-2591-TC21 — Bấm Cancel trên popup → không lưu thay đổi, quay lại trạng thái trước',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      const note = `E2E VP-2591 ${Date.now()}`;
      await orderDetailPage.orderNote.fill(note);
      await orderDetailPage.openConfirmPopup();
      await orderDetailPage.dismissConfirmPopup();

      await expect(orderDetailPage.editServiceDialog).toBeVisible();
      await expect(orderDetailPage.orderNote).toHaveValue(note);
      expect(orderDetailPage.blockedRequests).toEqual([]);

      await orderDetailPage.closeEditServiceDialog();
    },
  );
});

/**
 * Cases that need a real save. They click `Confirm update` on a DEV order, check the result and
 * put the order back in a `finally` (restoreOrder). The order leaves a trail on DEV: the
 * "Updated" tag and activity-log entries stay.
 *
 * mode 'default': these run one after another in one worker (they share one order), and a
 * failure does not skip the rest. Slot 0 = the first matching order; vp-2593 uses slot 1.
 */
test.describe('VP-2591 — Edit Order, lưu thật trên DEV', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  const SLOT = 0;

  test(
    'VP-2591-TC04 — Đổi Customer của order thành công, tổng tiền order không đổi',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp, page }) => {
      let opened = false;
      for (const status of EDITABLE_STATUSES) {
        if (await odp.openOrderWithStatus(status, { withCustomer: true, maxCandidates: 25 })) {
          opened = true;
          break;
        }
      }
      expect(!opened, 'no DEV editable order with a customer attached').toBeFalsy();
      const url = page.url();
      const original = (await odp.readCustomer()) as string;
      const originalName = original.split('\n')[0].trim();
      const before = await odp.readOrderSummary();

      const pickCustomer = async (name: string | null) => {
        await odp.openEditCustomerDialog();
        const options = odp.customerDialog.getByRole('option');
        if (name) await odp.customerSearchInput.fill(name);
        await expect(options.first()).toBeVisible({ timeout: 15_000 });
        const option = name
          ? options.filter({ hasText: name }).first()
          : options.filter({ hasNotText: originalName }).first();
        const picked = (await option.innerText()).split('\n')[0].trim();
        await option.click();
        const saved = page.waitForResponse(
          (r) => r.request().method() !== 'GET' && /\/orders\//.test(r.url()),
          { timeout: 30_000 },
        );
        await odp.customerSaveButton.click();
        // Replacing a customer asks "Change customer?" first (loyalty points are recalculated).
        const change = page
          .getByRole('alertdialog', { name: /Change customer\?/i })
          .or(page.getByRole('dialog', { name: /Change customer\?/i }));
        const asked = await change
          .waitFor({ state: 'visible', timeout: 5_000 })
          .then(() => true)
          .catch(() => false);
        if (asked) await change.getByRole('button', { name: 'Change anyway' }).click();
        expect((await saved).status()).toBeLessThan(300);
        await expect(odp.customerDialog).toBeHidden({ timeout: 15_000 });
        return picked;
      };

      try {
        const picked = await pickCustomer(null);
        await odp.reload();
        expect(await odp.readCustomer()).toContain(picked);
        expect(await odp.readOrderSummary()).toEqual(before);
      } finally {
        await page.goto(url);
        await odp.waitForReady();
        if (!(await odp.readCustomer())?.includes(originalName)) await pickCustomer(originalName);
      }
    },
  );

  test(
    'VP-2591-TC05 — Đổi Staff cho 1 line item, sale/tip/income chuyển sang staff mới',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const base = storeBase(snap.url);
      const { from, to, service } = pickMove(snap);
      // Reports are opened on the order's own day, so any recent order works.
      const day = await orderReportDay(odp);
      const before = await readStaffIncome(odp, base, day);
      try {
        await backToOrder(odp, snap);
        await odp.openEditServiceDialog();
        await moveService(odp, service, from, to);
        await odp.saveAndConfirm();
        await odp.reload();
        const groups = await odp.readServiceGroups();
        expect(groups.find((g) => g.staff === to)?.services.map((s) => s.name)).toContain(service);

        await expectStaffIncomeMoved(odp, base, before, { from, to, service }, day);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC06 — Đổi Staff qua lại giữa 2 service trong cùng order',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const { from, to, service } = pickMove(snap);
      const other = snap.groups.find((g) => g.staff === to)?.services[0].name as string;
      try {
        await odp.openEditServiceDialog();
        await moveService(odp, service, from, to);
        await moveService(odp, other, to, from);
        await odp.saveAndConfirm();
        await odp.reload();
        const groups = await odp.readServiceGroups();
        expect(groups.find((g) => g.staff === to)?.services.map((s) => s.name)).toContain(service);
        expect(groups.find((g) => g.staff === from)?.services.map((s) => s.name)).toContain(other);
        expect(await odp.readOrderSummary()).toEqual(snap.summary);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC07 — Sau khi đổi Staff, report hiển thị đúng Staff mới, số tiền giữ nguyên',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const base = storeBase(snap.url);
      const { from, to, service } = pickMove(snap);
      // Reports are opened on the order's own day, so any recent order works.
      const day = await orderReportDay(odp);
      const saleBefore = await readDailySaleRow(odp, base, snap.orderNo, day);
      expect(
        saleBefore,
        `${snap.orderNo} missing from the Daily Sale Report of ${day}`,
      ).not.toBeNull();
      const before = await readStaffIncome(odp, base, day);
      try {
        await backToOrder(odp, snap);
        await odp.openEditServiceDialog();
        await moveService(odp, service, from, to);
        await odp.saveAndConfirm();

        let after = before;
        await attachOnFail(
          'staff-income',
          () => ({ from, to, service, before, after }),
          () =>
            expect
              .poll(
                async () => {
                  after = await readStaffIncome(odp, base, day);
                  return (
                    after[to].subtotal > before[to].subtotal &&
                    after[from].subtotal < before[from].subtotal &&
                    Math.abs(after.Total.subtotal - before.Total.subtotal) < 0.005
                  );
                },
                {
                  timeout: 120_000,
                  intervals: [5_000, 10_000],
                  message: `Staff Income chưa hiển thị "${service}" dưới staff mới ${to}`,
                },
              )
              .toBe(true),
        );
        // The order's own figures in the sales report do not move.
        expect(await readDailySaleRow(odp, base, snap.orderNo, day)).toEqual(saleBefore);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  // No report lists service names (Daily Sale, Income Summary, Staff Income/Payroll are by order
  // or staff), so the new name is checked on the order and its money in the Daily Sale Report.
  test(
    'VP-2591-TC10 — Sau khi đổi Service, report Service hiển thị đúng service mới',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const base = storeBase(snap.url);
      const day = await orderReportDay(odp);
      const saleBefore = await readDailySaleRow(odp, base, snap.orderNo, day);
      expect(
        saleBefore,
        `${snap.orderNo} missing from the Daily Sale Report of ${day}`,
      ).not.toBeNull();
      const renamed = `${snap.groups[0].services[0].name}${MARK}`;
      try {
        await backToOrder(odp, snap);
        await odp.openEditServiceDialog();
        await odp.serviceNameInputs.first().fill(renamed);
        const { body } = await odp.saveAndConfirm();
        expect(JSON.stringify(body)).toContain(renamed);
        expect(JSON.stringify(body)).not.toMatch(/serviceId|price|amount/i);
        await odp.reload();
        const groups = await odp.readServiceGroups();
        expect(groups.flatMap((g) => g.services.map((s) => s.name))).toContain(renamed);
        expect(groups.flatMap((g) => g.services.map((s) => s.price))).toEqual(
          snap.groups.flatMap((g) => g.services.map((s) => s.price)),
        );
        expect(await readDailySaleRow(odp, base, snap.orderNo, day)).toEqual(saleBefore);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC18 — Tổng tiền order trước và sau khi update là giống nhau',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const { from, to, service } = pickMove(snap);
      try {
        await odp.openEditServiceDialog();
        await odp.orderNote.fill(noteFor('2591-TC18'));
        await odp.serviceNameInputs.first().fill(`${snap.groups[0].services[0].name}${MARK}`);
        await moveService(odp, service, from, to);
        await odp.saveAndConfirm();
        await odp.reload();
        expect(await odp.readOrderSummary()).toEqual(snap.summary);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC19 — Sau khi update, không phát sinh payment transaction mới',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const tenderEntries = (log: string) => (log.match(/^Tender$/gm) ?? []).length;
      const tenderBefore = tenderEntries(await odp.readActivityLog());
      try {
        await odp.openEditServiceDialog();
        await saveNote(odp, noteFor('2591-TC19'));
        await odp.reload();
        expect(await odp.readPaymentCount()).toBe(snap.payments);
        expect(tenderEntries(await odp.readActivityLog())).toBe(tenderBefore);
        expect(await odp.readOrderSummary()).toEqual(snap.summary);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC22 — Bấm Confirm Update → lưu thành công, đóng popup, hiển thị thông tin mới',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const note = noteFor('2591-TC22');
      try {
        await odp.openEditServiceDialog();
        await odp.orderNote.fill(note);
        await odp.openConfirmPopup();
        await odp.confirmUpdateButton.click();
        await expect(odp.confirmPopup).toBeHidden({ timeout: 15_000 });
        await expect(odp.editServiceDialog).toBeHidden();
        await expect(odp.updatedToast).toBeVisible();
        await expect.poll(() => odp.readOrderNote()).toBe(note);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC23 — Activity log ghi đủ user, thời gian, field, giá trị cũ, giá trị mới',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const note = noteFor('2591-TC23');
      const old = snap.note || '—';
      try {
        await odp.openEditServiceDialog();
        await saveNote(odp, note);
        const change = new RegExp(`^Note ${escapeRegExp(old)} → ${escapeRegExp(note)}$`);
        await expectLogEntry(odp, change);
        const entry = await findLogEntry(odp, change);
        expect(entry?.time, 'thời gian').toMatch(/\d{2}:\d{2}:\d{2} [AP]M/);
        expect(entry?.kind, 'loại').toBe('Order');
        // Field "Note", old value, new value are all in the change line matched above.
        const user = await currentUserName(odp);
        expect(user, 'tên user đang đăng nhập').not.toBe('');
        expect(await odp.readActivityLog(), 'user thực hiện có trong log').toContain(user);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC24 — Update nhiều field cùng lúc → activity log ghi đủ từng field',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const { from, to, service } = pickMove(snap);
      const note = noteFor('2591-TC24');
      try {
        await odp.openEditServiceDialog();
        await odp.orderNote.fill(note);
        // Move first, then rename a DIFFERENT service: renaming the moved one first would hide it
        // from moveService(), which looks the service up by its name.
        await moveService(odp, service, from, to);
        const names = await odp.serviceNameInputs.evaluateAll((els) =>
          els.map((e) => (e as HTMLInputElement).value),
        );
        const renameAt = names.findIndex((n) => n !== service);
        expect(renameAt, 'a second service to rename').toBeGreaterThanOrEqual(0);
        const first = names[renameAt];
        await odp.serviceNameInputs.nth(renameAt).fill(`${first}${MARK}`);
        await odp.selectTipSplit('Manual');
        const staff = await odp.staffNames();
        const total = await odp.readTotalTip();
        await odp.tipAmountInput(staff[0]).fill(total.toFixed(2));
        for (const s of staff.slice(1)) await odp.tipAmountInput(s).fill('0.00');
        await odp.saveAndConfirm();

        const esc = escapeRegExp;
        await expectLogEntry(odp, new RegExp(`^Note .* → ${esc(note)}$`));
        expect(
          await findLogEntry(odp, new RegExp(`Service Name .* → ${esc(first + MARK)}$`)),
          'log đổi Service Name',
        ).not.toBeNull();
        expect(
          await findLogEntry(
            odp,
            // Since VP-4569 the Item entry prints only "Staff Name A → B" (no "<service> · " prefix).
            new RegExp(`^(?:${esc(service)} · )?Staff Name ${esc(from)} → ${esc(to)}$`),
          ),
          'log đổi Staff',
        ).not.toBeNull();
        expect(
          await findLogEntry(odp, /^Amount \$[\d,.]+ → \$[\d,.]+$/),
          'log đổi Tip',
        ).not.toBeNull();
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC25 — Order Detail hiển thị tag Updated sau khi edit thành công',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      try {
        await odp.openEditServiceDialog();
        await saveNote(odp, noteFor('2591-TC25'));
        await expect(odp.updatedTag.first()).toBeVisible();
        await odp.reload();
        await expect(odp.updatedTag.first()).toBeVisible();
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC26 — Order Listing hiển thị tag Updated cho order đã chỉnh sửa',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      try {
        await odp.openEditServiceDialog();
        await saveNote(odp, noteFor('2591-TC26'));
        await odp.orders.goto();
        await odp.orders.searchInput.fill(snap.orderNo);
        const row = odp.orders.table.rows.filter({ hasText: snap.orderNo }).first();
        await expect(row).toBeVisible({ timeout: 20_000 });
        // Listing marks an edited order with a pencil badge next to the order ID.
        await expect(row.getByLabel('Order information was updated.')).toBeVisible();
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC27 — Edit Order nhiều lần liên tiếp, dữ liệu và activity log vẫn chính xác',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const notes = [1, 2, 3].map((n) => noteFor(`2591-TC27-${n}`));
      try {
        for (const note of notes) {
          await odp.openEditServiceDialog();
          await saveNote(odp, note);
          await odp.reload();
          expect(await odp.readOrderNote()).toBe(note);
          expect(await odp.readOrderSummary()).toEqual(snap.summary);
        }
        const esc = escapeRegExp;
        await expectLogEntry(odp, new RegExp(`→ ${esc(notes[2])}$`));
        for (let i = 1; i < notes.length; i++) {
          expect(
            await findLogEntry(odp, new RegExp(`^Note ${esc(notes[i - 1])} → ${esc(notes[i])}$`)),
            `log lần sửa ${i + 1}`,
          ).not.toBeNull();
        }
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2591-TC30 — Lỗi network khi Confirm Update → không cập nhật một phần, hiện lỗi',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp, page }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const note = noteFor('2591-TC30');
      try {
        await page.route(/\/orders\/[^/]+\/items/, (route) =>
          route.request().method() === 'PUT'
            ? route.abort('internetdisconnected')
            : route.fallback(),
        );
        await odp.openEditServiceDialog();
        await odp.orderNote.fill(note);
        await odp.openConfirmPopup();
        await odp.confirmUpdateButton.click();
        await expect(errorMessage(page)).toBeVisible({ timeout: 15_000 });
        await expect(odp.editServiceDialog).toBeVisible();
        await expect(odp.orderNote).toHaveValue(note);
        await page.unrouteAll({ behavior: 'ignoreErrors' });
        await odp.reload();
        expect(await odp.readOrderNote()).toBe(snap.note);
        expect(await odp.readServiceGroups()).toEqual(snap.groups);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );
});
