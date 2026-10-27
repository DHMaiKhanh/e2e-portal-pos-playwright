import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import type { Request } from '@playwright/test';
import type { OrderDetailPage } from '@pages/orders/OrderDetailPage';
import { parseMoney } from '@utils/stringUtils';
import {
  backToOrder,
  errorMessage,
  expectStaffIncomeMoved,
  orderReportDay,
  expectLogEntry,
  MARK,
  moveService,
  noteFor,
  openMutableOrder,
  pickMove,
  readStaffIncome,
  restoreOrder,
  saveNote,
  snapshotOrder,
  storeBase,
} from './mutation-helpers';
import {
  balancedText,
  CENT,
  EDITABLE_STATUSES,
  escapeRegExp,
  expectEditButtons,
  expectNoEditButtons,
  forEachStatus,
  MONEY,
  moveFirstGroupToSecond,
  openEditDialog,
  openStatus,
  openTipDialog,
  priceOf,
  readShares,
  rowPrices,
  sum,
} from './helpers';

/**
 * VP-2593 — "[Portal] Cập nhật thông tin Order không ảnh hưởng đến giá tiền" (Portal FE).
 * One test per QC test case posted on the ticket (TC01–TC50), numbered as on Linear.
 * Source: docs/test-cases/edit-order-linear.md, section 3.
 *
 * First describe: read-only cases. beforeEach installs blockOrderMutations() before any
 * navigation, so no non-GET request to /orders, /customers or split_tip reaches DEV.
 * Second describe: cases that need a real `Confirm update` — they save on DEV and revert.
 */
test.describe('VP-2593 — Edit Order Portal FE (QC test cases)', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  // --- 1. Nút Edit & Eligibility ---

  test(
    'VP-2593-TC01 — Nút ✏️ hiện ở order Successful – Unsettled',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ orderDetailPage }) => {
      await openStatus(orderDetailPage, 'Successful - Unsettled');
      await expectEditButtons(orderDetailPage);
    },
  );

  test(
    'VP-2593-TC02 — Nút ✏️ hiện ở order Successful – Settled',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ orderDetailPage }) => {
      await openStatus(orderDetailPage, 'Successful - Settled');
      await expectEditButtons(orderDetailPage);
    },
  );

  test(
    'VP-2593-TC03 — Nút ✏️ hiện với order Partial Refunded',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openStatus(orderDetailPage, 'Partial Refunded');
      await expectEditButtons(orderDetailPage);
    },
  );

  // Read as "order Refunded" (TC03 already shows Partial Refunded orders keep the button).
  test(
    'VP-2593-TC04 — Nút ✏️ không hiện với order Refunded',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openStatus(orderDetailPage, 'Refunded');
      await expectNoEditButtons(orderDetailPage);
    },
  );

  test(
    'VP-2593-TC05 — Nút ✏️ không hiện ở order Canceled',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openStatus(orderDetailPage, 'Canceled');
      await expectNoEditButtons(orderDetailPage);
    },
  );

  // Pending and Re-opened only — DEV has no Canceling / Refunding / … orders to open.
  test(
    'VP-2593-TC06 — Nút ✏️ không hiện ở các status không hợp lệ khác',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await forEachStatus(orderDetailPage, ['Pending', 'Re-opened'], () =>
        expectNoEditButtons(orderDetailPage),
      );
    },
  );

  // --- 2. Sửa Staff ---

  test(
    'VP-2593-TC08 — Tick chọn nhiều item → Move to thợ khác thành công',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(
        orderDetailPage,
        { staffCount: 2 },
        'no DEV editable order with 2+ staff',
      );
      const [, target] = await orderDetailPage.staffNames();
      const targetRows = orderDetailPage
        .groupByStaff(target)
        .getByRole('textbox', { name: 'Service name' });
      const before = await targetRows.count();

      await expect(orderDetailPage.moveToButton).toBeHidden();
      await orderDetailPage.selectServices(0);
      await expect(orderDetailPage.moveToButton).toBeVisible();
      await orderDetailPage.moveSelectedTo(target);
      await expect(targetRows).toHaveCount(before + 1);

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // Adding the empty group only; assigning a service and saving is not covered.
  test(
    'VP-2593-TC10 — Thêm thợ vào 1 service',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      const groups = await orderDetailPage.changeStaffButtons.count();

      await orderDetailPage.addStaffButton.click();
      await expect(orderDetailPage.changeStaffButtons).toHaveCount(groups + 1);
      await expect(orderDetailPage.changeStaffButtons.last()).toHaveText(/Select staff/);
      await expect(orderDetailPage.emptyGroupHint).toBeVisible();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // Dialog part: line prices and Services total do not move. The saved order total needs
  // `Confirm update`.
  test(
    'VP-2593-TC13 — Sau đổi thợ: tổng tiền dòng và tổng order giữ nguyên',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(
        orderDetailPage,
        { staffCount: 2 },
        'no DEV editable order with 2+ staff',
      );
      const pricesBefore = (await rowPrices(orderDetailPage)).sort();
      const totalBefore = await orderDetailPage.readServicesTotal();

      await moveFirstGroupToSecond(orderDetailPage);

      expect((await rowPrices(orderDetailPage)).sort()).toEqual(pricesBefore);
      expect(await orderDetailPage.readServicesTotal()).toBe(totalBefore);

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // --- 3. Sửa Service Name & Note ---

  test(
    'VP-2593-TC14 — Gõ tay tự do tên service → lưu đúng name mới',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      const nameInput = orderDetailPage.serviceNameInputs.first();
      await expect(nameInput).toBeEditable();
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      const newName = `${await nameInput.inputValue()} E2E`.trim();
      await nameInput.fill(newName);
      await expect(nameInput).toHaveValue(newName);
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  test(
    'VP-2593-TC15 — Chọn tên từ catalog → chỉ điền tên',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage, page }) => {
      await openEditDialog(orderDetailPage);
      const priceBefore = priceOf(await orderDetailPage.serviceRow(0).innerText());

      await orderDetailPage.changeServiceButtons.first().click();
      await expect(orderDetailPage.serviceSearchInput).toBeVisible();
      const options = page.getByRole('option').or(page.getByRole('menuitem'));
      await expect(options.first()).toBeVisible();
      const texts = (await options.allInnerTexts()).map((t) => t.trim());
      for (const text of texts) expect(text).not.toMatch(MONEY);
      await options.first().click();

      const filled = (await orderDetailPage.serviceNameInputs.first().inputValue()).trim();
      expect(filled.length).toBeGreaterThan(0);
      expect(texts[0]).toContain(filled);
      expect(priceOf(await orderDetailPage.serviceRow(0).innerText())).toBe(priceBefore);

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // Price part only; service_id staying the same is only visible in the saved payload/response.
  test(
    'VP-2593-TC16 — Sau đổi name: giá dòng giữ nguyên',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      const pricesBefore = await rowPrices(orderDetailPage);
      const totalBefore = await orderDetailPage.readServicesTotal();

      await orderDetailPage.serviceNameInputs.first().fill(`E2E rename ${Date.now()}`);

      expect(await rowPrices(orderDetailPage)).toEqual(pricesBefore);
      expect(await orderDetailPage.readServicesTotal()).toBe(totalBefore);

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // Dialog part only; the saved note needs `Confirm update` and BE support for `note`.
  test(
    'VP-2593-TC17 — Sửa Service note → lưu đúng',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      await orderDetailPage.addNoteButtons.first().click();
      const noteInput = orderDetailPage.serviceNoteInputs.first();
      await expect(noteInput).toBeVisible();
      await noteInput.fill('E2E VP-2593 service note');
      await expect(noteInput).toHaveValue('E2E VP-2593 service note');
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // --- 4. Refunded Item ---

  // Label only; the red highlight is a visual check.
  test(
    'VP-2593-TC20 — Refunded item được highlight đỏ + label "Refunded"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openStatus(orderDetailPage, 'Partial Refunded');
      await orderDetailPage.openEditServiceDialog();
      await expect(orderDetailPage.refundedLabels.first()).toBeVisible();
      await orderDetailPage.closeEditServiceDialog();
    },
  );

  // --- 6. Tip ---

  test(
    'VP-2593-TC27 — Split method Evenly phân bổ đúng',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage, 2);
      await orderDetailPage.selectTipSplit('Split evenly');
      const total = await orderDetailPage.readTotalTip();
      const staff = await orderDetailPage.staffNames();

      for (const name of staff) await expect(orderDetailPage.tipAmountInput(name)).toBeDisabled();
      const shares = await readShares(orderDetailPage, staff);
      for (const share of shares) {
        expect(Math.abs(share - total / staff.length)).toBeLessThanOrEqual(CENT);
      }
      expect(Math.abs(sum(shares) - total)).toBeLessThan(0.005);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'VP-2593-TC28 — Split method Proportion phân bổ đúng',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage, 2);
      await orderDetailPage.selectTipSplit('Proportion');
      const total = await orderDetailPage.readTotalTip();
      const staff = await orderDetailPage.staffNames();

      const amounts: number[] = [];
      for (const name of staff) {
        const match = (await orderDetailPage.groupSummary(name).innerText()).match(MONEY);
        amounts.push(match ? parseMoney(match[0]) : 0);
      }
      const servicesSum = sum(amounts);
      expect(servicesSum <= 0, 'order has no priced services to split by proportion').toBeFalsy();

      for (const name of staff) await expect(orderDetailPage.tipAmountInput(name)).toBeDisabled();
      await expect
        .poll(async () =>
          (await readShares(orderDetailPage, staff)).every(
            (share, i) => Math.abs(share - (total * amounts[i]) / servicesSum) <= CENT,
          ),
        )
        .toBe(true);
      expect(Math.abs(sum(await readShares(orderDetailPage, staff)) - total)).toBeLessThan(0.005);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'VP-2593-TC29 — Split method Manual phân bổ từng người đúng',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage, 2);
      await orderDetailPage.selectTipSplit('Manual');
      const total = await orderDetailPage.readTotalTip();
      const staff = await orderDetailPage.staffNames();
      for (const name of staff) await expect(orderDetailPage.tipAmountInput(name)).toBeEditable();

      await orderDetailPage.tipAmountInput(staff[0]).fill(total.toFixed(2));
      for (const name of staff.slice(1)) await orderDetailPage.tipAmountInput(name).fill('0.00');

      expect(await readShares(orderDetailPage, staff)).toEqual([
        total,
        ...staff.slice(1).map(() => 0),
      ]);
      await expect(orderDetailPage.balanceStatus).toContainText(balancedText(total));
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'VP-2593-TC30 — Total Tip khóa — không sửa được tổng tip',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage);
      const dialog = orderDetailPage.editServiceDialog;
      await expect(orderDetailPage.totalTip).toHaveText(/Total tip\s*\$[\d,]+\.\d{2}/);
      await expect(dialog.getByRole('textbox', { name: /total tip/i })).toHaveCount(0);
      await expect(dialog.getByRole('spinbutton', { name: /total tip/i })).toHaveCount(0);

      // Even in Manual mode the only tip inputs are the per-staff shares.
      await orderDetailPage.selectTipSplit('Manual');
      const tipInputs = dialog
        .getByRole('textbox', { name: /^Tip amount for / })
        .or(dialog.getByRole('spinbutton', { name: /^Tip amount for / }));
      await expect(tipInputs).toHaveCount((await orderDetailPage.staffNames()).length);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'VP-2593-TC31 — Recipient = staff đang làm service (không có checkbox chọn tay)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage);
      const dialog = orderDetailPage.editServiceDialog;
      const staff = await orderDetailPage.staffNames();
      await expect(orderDetailPage.recipientsLabel).toBeVisible();
      for (const name of staff) await expect(orderDetailPage.tipAmountInput(name)).toBeVisible();
      await expect(dialog.getByText(/\$[\d,]+\.\d{2} in services/).first()).toBeVisible();

      // The only checkboxes are the service-row ones — no recipient picker.
      const rowCheckboxes = await orderDetailPage.selectServiceCheckboxes.count();
      await expect(dialog.getByRole('checkbox')).toHaveCount(rowCheckboxes);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'VP-2593-TC32 — Đổi staff → tip đi theo staff mới',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openTipDialog(orderDetailPage, 2);
      const [from, to] = await moveFirstGroupToSecond(orderDetailPage);

      await expect(orderDetailPage.tipAmountInput(from)).toHaveCount(0);
      await expect(orderDetailPage.tipAmountInput(to)).toBeVisible();

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  // --- 7. Rule Tiền (bất biến) ---

  test(
    'VP-2593-TC36 — Không sửa được field tiền / giá dòng',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      const dialog = orderDetailPage.editServiceDialog;

      // Every row shows its price as text; no input holds a price.
      const rows = await orderDetailPage.serviceRows.count();
      for (let i = 0; i < rows; i++) {
        await expect(orderDetailPage.serviceRow(i)).toContainText(MONEY);
      }
      for (const role of ['textbox', 'spinbutton'] as const) {
        await expect(dialog.getByRole(role, { name: /price|amount(?! for )/i })).toHaveCount(0);
      }
      // No editable field (tip shares aside) carries a line price as its value.
      const values = await dialog
        .getByRole('textbox')
        .evaluateAll((els) =>
          els
            .filter((el) => !(el.getAttribute('aria-label') ?? '').startsWith('Tip amount for '))
            .map((el) => (el as HTMLInputElement).value ?? ''),
        );
      const prices = new Set((await orderDetailPage.serviceRows.allInnerTexts()).map(priceOf));
      for (const value of values) expect(prices.has(value.trim())).toBe(false);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  test(
    'VP-2593-TC37 — Không sửa được discount / phí / payment',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      const dialog = orderDetailPage.editServiceDialog;
      for (const role of ['textbox', 'spinbutton', 'combobox'] as const) {
        await expect(
          dialog.getByRole(role, { name: /discount|fee|payment|tender|tax/i }),
        ).toHaveCount(0);
      }

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  // --- 8. Save / Confirm / Tag ---

  test(
    'VP-2593-TC39 — Nút Save disabled đến khi thay đổi hợp lệ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      await orderDetailPage.orderNote.fill(`E2E VP-2593 ${Date.now()}`);
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();

      // An empty staff group is invalid → Save disabled again.
      await orderDetailPage.addStaffButton.click();
      await expect(orderDetailPage.emptyGroupError).toBeVisible();
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  test(
    'VP-2593-TC40 — Click Save → hiện popup "Confirm Order Update?"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      await orderDetailPage.orderNote.fill(`E2E VP-2593 ${Date.now()}`);
      await orderDetailPage.openConfirmPopup();
      await expect(orderDetailPage.confirmPopup).toContainText(/Confirm Order Update\?/i);
      await expect(orderDetailPage.confirmPopupMessage).toBeVisible();

      await orderDetailPage.dismissConfirmPopup();
      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  test(
    'VP-2593-TC42 — Hủy popup → không lưu, giữ nguyên dữ liệu cũ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      const original = await orderDetailPage.orderNote.inputValue();
      const note = `E2E VP-2593 ${Date.now()}`;
      await orderDetailPage.orderNote.fill(note);
      await orderDetailPage.openConfirmPopup();
      await orderDetailPage.dismissConfirmPopup();

      // Popup closed, nothing sent; leaving the dialog drops the change.
      await expect(orderDetailPage.orderNote).toHaveValue(note);
      expect(orderDetailPage.blockedRequests).toEqual([]);
      await orderDetailPage.closeEditServiceDialog();
      await orderDetailPage.openEditServiceDialog();
      await expect(orderDetailPage.orderNote).toHaveValue(original);

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  // --- 9. Edge / Regression ---

  test(
    'VP-2593-TC47 — Mở Edit rồi thoát không lưu → dữ liệu giữ nguyên',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditDialog(orderDetailPage);
      const originalNote = await orderDetailPage.orderNote.inputValue();
      const originalName = await orderDetailPage.serviceNameInputs.first().inputValue();

      await orderDetailPage.orderNote.fill(`E2E VP-2593 ${Date.now()}`);
      await orderDetailPage.serviceNameInputs.first().fill(`E2E service ${Date.now()}`);
      await orderDetailPage.cancelButton.click();
      await expect(orderDetailPage.editServiceDialog).toBeHidden();

      await orderDetailPage.openEditServiceDialog();
      await expect(orderDetailPage.orderNote).toHaveValue(originalNote);
      await expect(orderDetailPage.serviceNameInputs.first()).toHaveValue(originalName);
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  test(
    'VP-2593-TC49 — Kiểm tra hiển thị trên nhiều size màn hình (responsive)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage, page }) => {
      await openEditDialog(orderDetailPage);

      for (const width of [1920, 1366, 768, 375]) {
        await test.step(`${width}px`, async () => {
          await page.setViewportSize({ width, height: 900 });
          await expect(orderDetailPage.editServiceDialog).toBeVisible();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
          const box = await orderDetailPage.editServiceDialog.boundingBox();
          expect(box, 'dialog has a bounding box').not.toBeNull();
          if (box) expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
          await orderDetailPage.saveChangesButton.scrollIntoViewIfNeeded();
          await expect(orderDetailPage.saveChangesButton).toBeInViewport();
          await expect(orderDetailPage.cancelButton).toBeVisible();
        });
      }

      await orderDetailPage.closeEditServiceDialog();
    },
  );

  // --- Kéo-thả, đổi nhóm, xoá thợ (chỉ trong dialog, không lưu) ---

  test(
    'VP-2593-TC07 — Kéo-thả 1 thợ từ dòng này sang dòng khác thành công',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage: odp, page }) => {
      await openEditDialog(odp, { staffCount: 2 }, 'no DEV editable order with 2+ staff');
      const staff = await odp.staffNames();
      const counts = await Promise.all(
        staff.map((s) =>
          odp.groupByStaff(s).getByRole('textbox', { name: 'Service name' }).count(),
        ),
      );
      const from = staff[counts.indexOf(Math.max(...counts))];
      const to = staff.find((s) => s !== from) as string;
      expect(Math.max(...counts) < 2, 'no staff group with 2+ services to drag from').toBeFalsy();
      const targetRows = odp.groupByStaff(to).getByRole('textbox', { name: 'Service name' });
      const before = await targetRows.count();
      const total = await odp.readServicesTotal();

      const handle = odp
        .groupByStaff(from)
        .getByRole('button', { name: 'Drag to reassign staff' })
        .first();
      const hb = await handle.boundingBox();
      const tb = await odp.groupByStaff(to).boundingBox();
      expect(hb && tb, 'drag handle and target group are on screen').toBeTruthy();
      if (hb && tb) {
        await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
        await page.mouse.down();
        await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 12, { steps: 5 });
        await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 25 });
        await page.mouse.up();
      }
      await expect(targetRows).toHaveCount(before + 1);
      expect(await odp.readServicesTotal()).toBe(total);
      await odp.closeEditServiceDialog();
      expect(odp.blockedRequests).toEqual([]);
    },
  );

  test(
    'VP-2593-TC09 — Đổi cả nhóm (group) sang thợ khác thành công',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage: odp, page }) => {
      await openEditDialog(odp);
      const current = await odp.staffNames();
      const rows = await odp.serviceNameInputs.count();
      const groupRows = await odp
        .groupByStaff(current[0])
        .getByRole('textbox', { name: 'Service name' })
        .count();

      await odp.changeStaffButtons.first().click();
      const options = page.getByRole('option').or(page.getByRole('menuitem'));
      await expect(options.first()).toBeVisible();
      const texts = (await options.allInnerTexts()).map((t) => t.trim());
      const pick = texts.find((t) => t && !current.includes(t));
      expect(!pick, 'store has no other staff to switch to').toBeFalsy();
      // Options also hold avatar initials in their text, so narrow the list by search first.
      await odp.staffSearchInput.fill(pick as string);
      await options
        .filter({ hasText: pick as string })
        .first()
        .click();

      // Staff names may hold double spaces ("Mr. Kevin  Vu") that innerText collapses.
      const loose = new RegExp((pick as string).split(/\s+/).map(escapeRegExp).join('\\s+'));
      await expect(odp.changeStaffButtons.first()).toHaveText(loose);
      await expect(
        odp.editServiceDialog
          .getByRole('button', { name: 'Change staff for this group' })
          .first()
          .locator('xpath=ancestor::*[.//input][1]')
          .getByRole('textbox', { name: 'Service name' }),
      ).toHaveCount(groupRows);
      await expect(odp.serviceNameInputs).toHaveCount(rows);
      await odp.closeEditServiceDialog();
      expect(odp.blockedRequests).toEqual([]);
    },
  );

  test(
    'VP-2593-TC11 — Bớt (xóa) thợ khỏi 1 service',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage: odp }) => {
      await openEditDialog(odp);
      const groups = await odp.changeStaffButtons.count();
      const rows = await odp.serviceNameInputs.count();

      await odp.addStaffButton.click();
      await expect(odp.changeStaffButtons).toHaveCount(groups + 1);
      await odp.openStaffActions(groups);
      await odp.menuItem('Remove staff').click();

      await expect(odp.changeStaffButtons).toHaveCount(groups);
      await expect(odp.emptyGroupError).toBeHidden();
      // Removing a staff never drops a service line.
      await expect(odp.serviceNameInputs).toHaveCount(rows);
      await odp.closeEditServiceDialog();
      expect(odp.blockedRequests).toEqual([]);
    },
  );

  test(
    'VP-2593-TC18 — Để trống name / name không hợp lệ → validate chặn Save',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage: odp }) => {
      await openEditDialog(odp);
      await odp.serviceNameInputs.first().fill('');
      await expect(odp.saveChangesButton, 'Save phải bị chặn khi tên service trống').toBeDisabled();
      await odp.serviceNameInputs.first().fill('   ');
      await expect(
        odp.saveChangesButton,
        'Save phải bị chặn khi tên chỉ có khoảng trắng',
      ).toBeDisabled();
      await odp.closeEditServiceDialog();
      expect(odp.blockedRequests).toEqual([]);
    },
  );

  test(
    'VP-2593-TC21 — Refunded item không được tính vào tip',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage: odp }) => {
      expect(
        !(await odp.openOrderWithStatus('Partial Refunded', { withTip: true })),
        'no DEV Partial Refunded order with a tip',
      ).toBeFalsy();
      await odp.openEditServiceDialog();
      const lines = (await odp.editServiceDialog.innerText()).split('\n').map((l) => l.trim());
      const start = lines.indexOf('Recipients & amounts');
      const inServices: Record<string, number> = {};
      for (let i = start + 1; i < lines.length - 1; i++) {
        const m = lines[i + 1].match(/^\$([\d,.]+) in services$/);
        if (m) inServices[lines[i]] = Number(m[1].replace(/,/g, ''));
      }
      for (const staff of await odp.staffNames()) {
        // A refunded line is locked (its Service name box is disabled). Its "Refunded" badge sits
        // in the DOM right after the previous line's price, so the row text cannot tell them apart.
        const boxes = odp.groupByStaff(staff).getByRole('textbox', { name: 'Service name' });
        let expected = 0;
        for (let i = 0; i < (await boxes.count()); i++) {
          const box = boxes.nth(i);
          if (await box.isDisabled()) continue;
          const text = await box.locator('xpath=ancestor::*[contains(., "$")][1]').innerText();
          expected += Number(priceOf(text).replace(/[$,]/g, ''));
        }
        if (staff in inServices) {
          expect(inServices[staff], `${staff}: "$x in services" bỏ dòng refunded`).toBeCloseTo(
            expected,
            2,
          );
        }
      }
      await odp.closeEditServiceDialog();
    },
  );

  // --- 5. Store Item (không staff) ---

  // Store lines render as a locked "Store · N item(s) · Not editable" group: plain text, no
  // Service name box, no drag handle, no checkbox.
  test(
    'VP-2593-TC23 — Store item read-only: không kéo được',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage: odp }) => {
      await openStoreDialog(odp);
      await expect(odp.storeNotEditable).toBeVisible();
      // Only editable (staff) lines carry a drag handle.
      await expect(odp.dragHandles).toHaveCount(await odp.serviceNameInputs.count());
      await odp.closeEditServiceDialog();
    },
  );

  test(
    'VP-2593-TC24 — Store item không chọn/tick được, không sửa được',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage: odp }) => {
      const names = await openStoreDialog(odp);
      await expect(odp.storeNotEditable).toBeVisible();
      const editable = await odp.serviceNameInputs.evaluateAll((els) =>
        els.map((e) => (e as HTMLInputElement).value),
      );
      for (const name of names) {
        await expect(odp.editServiceDialog.getByText(name, { exact: true })).toBeVisible();
        expect(editable, `"${name}" không có ô sửa tên`).not.toContain(name);
      }
      await expect(odp.selectServiceCheckboxes).toHaveCount(editable.length);
      await expect(odp.changeServiceButtons).toHaveCount(editable.length);
      await odp.closeEditServiceDialog();
    },
  );

  test(
    'VP-2593-TC25 — Store item không nhận tip',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage: odp }) => {
      await openStoreDialog(odp);
      await expect(odp.tipAmountInput('Store')).toHaveCount(0);
      if (await odp.recipientsLabel.isVisible()) {
        const text = await odp.editServiceDialog.innerText();
        const lines = text.split(/\r?\n/).map((l) => l.trim());
        const recipients = lines.slice(lines.indexOf('Recipients & amounts') + 1);
        expect(recipients, 'Store không có trong danh sách nhận tip').not.toContain('Store');
      }
      await odp.closeEditServiceDialog();
    },
  );
});

/** Opens an order with store-sold lines and its edit dialog; returns those lines' names. */
async function openStoreDialog(odp: OrderDetailPage): Promise<string[]> {
  let opened = false;
  for (const status of EDITABLE_STATUSES) {
    if (await odp.openOrderWithStatus(status, { withStoreItem: true, maxCandidates: 20 })) {
      opened = true;
      break;
    }
  }
  expect(!opened, 'no DEV order with a store item (line without staff)').toBeFalsy();
  const names = ((await odp.storeGroup())?.services ?? []).map((s) => s.name);
  await odp.openEditServiceDialog();
  return names;
}

/**
 * Cases that need a real save. They click `Confirm update` on a DEV order, check the result and
 * put the order back in a `finally` (restoreOrder). The order keeps the "Updated" tag and the
 * activity-log entries. mode 'default': one after another in one worker; failures don't skip
 * the rest. Slot 1 = the second matching order (vp-2591 edits the first).
 */
test.describe('VP-2593 — Edit Order Portal FE, lưu thật trên DEV', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  const SLOT = 1;

  test(
    'VP-2593-TC12 — Sau đổi thợ: sale + tip + income chuyển sang thợ mới (report)',
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
        await expectStaffIncomeMoved(odp, base, before, { from, to, service }, day);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC26 — Store item không nằm trong payload khi Save',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      let opened = false;
      for (const status of EDITABLE_STATUSES) {
        if (
          await odp.openOrderWithStatus(status, {
            withStoreItem: true,
            withStaffRows: true,
            maxCandidates: 20,
          })
        ) {
          opened = true;
          break;
        }
      }
      test.skip(!opened, 'no DEV order with both a store item and a staff line');
      const snap = await snapshotOrder(odp);
      const store = (await odp.storeGroup())?.services.map((s) => s.name) ?? [];
      try {
        await odp.openEditServiceDialog();
        const values = await odp.serviceNameInputs.evaluateAll((els) =>
          els.map((e) => (e as HTMLInputElement).value),
        );
        const index = values.findIndex((v) => !store.includes(v));
        await odp.serviceNameInputs.nth(index).fill(`${values[index]}${MARK}`);
        const { body } = await odp.saveAndConfirm();
        const items = (body.items ?? []) as { staff?: string; serviceName?: string }[];
        expect(items).toHaveLength(1);
        for (const item of items) {
          expect(item.staff, 'mọi item trong payload đều có staff').toBeTruthy();
          expect(store).not.toContain(item.serviceName);
        }
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC33 — Total Tip trước = sau',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      try {
        await odp.openEditServiceDialog();
        await odp.selectTipSplit('Manual');
        const staff = await odp.staffNames();
        const total = await odp.readTotalTip();
        await odp.tipAmountInput(staff[0]).fill(total.toFixed(2));
        for (const s of staff.slice(1)) await odp.tipAmountInput(s).fill('0.00');
        await odp.saveAndConfirm();
        await odp.reload();
        const summary = await odp.readOrderSummary();
        expect(summary.tip).toBe(snap.summary.tip);
        expect(summary.total).toBe(snap.summary.total);
        const shares = await odp.readTipBreakdown();
        expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBeCloseTo(snap.summary.tip, 2);
        expect(shares[staff[0]]).toBeCloseTo(snap.summary.tip, 2);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC34 — Tip lưu gom vào 1 API edit-order (không gọi PUT /split_tip riêng)',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp, page }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const writes: { method: string; url: string; body: string }[] = [];
      const record = (req: Request) => {
        if (req.method() !== 'GET')
          writes.push({ method: req.method(), url: req.url(), body: req.postData() ?? '' });
      };
      try {
        await odp.openEditServiceDialog();
        await odp.selectTipSplit('Manual');
        const staff = await odp.staffNames();
        const total = await odp.readTotalTip();
        await odp.tipAmountInput(staff[0]).fill(total.toFixed(2));
        for (const s of staff.slice(1)) await odp.tipAmountInput(s).fill('0.00');
        page.on('request', record);
        await odp.saveAndConfirm();
        await page.waitForTimeout(2_000);
        page.off('request', record);

        const edits = writes.filter((w) => /\/orders\/[^/]+\/items/.test(w.url));
        expect(edits, '1 request edit-order').toHaveLength(1);
        expect(edits[0].method).toBe('PUT');
        expect(edits[0].body).toMatch(/tipShares/);
        expect(
          writes.filter((w) => /split_tip/i.test(w.url)),
          'không gọi split_tip',
        ).toHaveLength(0);
      } finally {
        page.off('request', record);
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC35 — Tổng tiền order trước = sau khi lưu',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const { from, to, service } = pickMove(snap);
      try {
        await odp.openEditServiceDialog();
        await odp.serviceNameInputs.first().fill(`${snap.groups[0].services[0].name}${MARK}`);
        await moveService(odp, service, from, to);
        await odp.selectTipSplit('Manual');
        const staff = await odp.staffNames();
        await odp.tipAmountInput(staff[0]).fill((await odp.readTotalTip()).toFixed(2));
        for (const s of staff.slice(1)) await odp.tipAmountInput(s).fill('0.00');
        await odp.saveAndConfirm();
        await odp.reload();
        expect(await odp.readOrderSummary()).toEqual(snap.summary);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC38 — Không tạo transaction mới (check DB/transaction list)',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const { from, to, service } = pickMove(snap);
      const tenders = (log: string) => (log.match(/^(Tender|Gateway)$/gm) ?? []).length;
      const before = tenders(await odp.readActivityLog());
      try {
        await odp.openEditServiceDialog();
        await moveService(odp, service, from, to);
        await odp.saveAndConfirm();
        await odp.reload();
        await expect(odp.page.getByText(/Times in UTC/)).toBeVisible({ timeout: 15_000 });
        expect(await odp.readPaymentCount()).toBe(snap.payments);
        expect(tenders(await odp.readActivityLog()), 'không có bản ghi Tender/Gateway mới').toBe(
          before,
        );
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC41 — Confirm → lưu thành công',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const note = noteFor('2593-TC41');
      try {
        await odp.openEditServiceDialog();
        await odp.orderNote.fill(note);
        const { status, body } = await odp.saveAndConfirm();
        expect(status).toBeLessThan(300);
        expect(body.note).toBe(note);
        await expect(odp.updatedToast).toBeVisible();
        await expect.poll(() => odp.readOrderNote()).toBe(note);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC43 — Sau lưu: order gắn tag Updated ở Listing',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      try {
        await odp.openEditServiceDialog();
        await saveNote(odp, noteFor('2593-TC43'));
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
    'VP-2593-TC44 — Sau lưu: order gắn tag Updated ở Detail',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      try {
        await odp.openEditServiceDialog();
        await saveNote(odp, noteFor('2593-TC44'));
        await expect(odp.updatedTag.first()).toBeVisible();
        await odp.reload();
        await expect(odp.updatedTag.first()).toBeVisible();
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC45 — Activity log ghi nhận thay đổi qua entity_history',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const { from, to, service } = pickMove(snap);
      try {
        await odp.openEditServiceDialog();
        await moveService(odp, service, from, to);
        await odp.saveAndConfirm();
        const esc = escapeRegExp;
        await expectLogEntry(
          odp,
          // Since VP-4569 the Item entry prints only "Staff Name A → B" (no "<service> · " prefix).
          new RegExp(`^(?:${esc(service)} · )?Staff Name ${esc(from)} → ${esc(to)}$`),
        );
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC46 — Đổi nhiều thứ cùng lúc (staff + name + tip) trong 1 lần Save',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const { from, to, service } = pickMove(snap);
      const first = snap.groups[0].services[0].name;
      try {
        await odp.openEditServiceDialog();
        await odp.serviceNameInputs.first().fill(`${first}${MARK}`);
        await moveService(odp, service, from, to);
        await odp.selectTipSplit('Manual');
        const staff = await odp.staffNames();
        const total = await odp.readTotalTip();
        await odp.tipAmountInput(staff[0]).fill(total.toFixed(2));
        for (const s of staff.slice(1)) await odp.tipAmountInput(s).fill('0.00');
        const { body } = await odp.saveAndConfirm();
        expect(Object.keys(body)).toEqual(expect.arrayContaining(['items', 'tipShares']));

        await odp.reload();
        const groups = await odp.readServiceGroups();
        expect(groups.flatMap((g) => g.services.map((s) => s.name))).toContain(`${first}${MARK}`);
        expect(groups.find((g) => g.staff === to)?.services.map((s) => s.name)).toContain(service);
        expect((await odp.readTipBreakdown())[staff[0]]).toBeCloseTo(total, 2);
        expect(await odp.readOrderSummary()).toEqual(snap.summary);
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC48 — Reload sau khi lưu → dữ liệu mới hiển thị đúng (persist)',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp, page }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const note = noteFor('2593-TC48');
      const renamed = `${snap.groups[0].services[0].name}${MARK}`;
      try {
        await odp.openEditServiceDialog();
        await odp.orderNote.fill(note);
        await odp.serviceNameInputs.first().fill(renamed);
        await odp.saveAndConfirm();
        for (let i = 0; i < 2; i++) {
          await page.goto(snap.url);
          await odp.waitForReady();
          expect(await odp.readOrderNote()).toBe(note);
          expect(
            (await odp.readServiceGroups()).flatMap((g) => g.services.map((s) => s.name)),
          ).toContain(renamed);
        }
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );

  test(
    'VP-2593-TC50 — API lỗi khi Save → hiện thông báo lỗi, không mất dữ liệu đang sửa',
    { tag: [Tag.REGRESSION] },
    async ({ orderDetailPage: odp, page }) => {
      const snap = await openMutableOrder(odp, SLOT);
      const note = noteFor('2593-TC50');
      try {
        await page.route(/\/orders\/[^/]+\/items/, (route) =>
          route.request().method() === 'PUT'
            ? route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: '{"detail":"E2E forced error"}',
              })
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
      } finally {
        await restoreOrder(odp, snap);
      }
    },
  );
});
