import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import type { OrderDetailPage } from '@pages/orders/OrderDetailPage';

/**
 * Edit Order — B4 "Sửa Service name & Note" (docs/test-cases/edit-order.md, TC-EO-026..033).
 *
 * SAFETY: every test blocks order/customer mutations before navigating and never clicks
 * `Confirm update`. Dialog edits are dialog-local and always end with `Cancel`.
 */

const MONEY = /\$[\d,]+\.\d{2}/;

/** Opens an editable (Successful - Unsettled) order and its Edit service details dialog; skips if none. */
async function openEditableServiceDialog(orderDetailPage: OrderDetailPage): Promise<void> {
  const opened = await orderDetailPage.openOrderWithStatus('Successful - Unsettled');
  expect(!opened, 'no DEV order with status Successful - Unsettled').toBeFalsy();
  await orderDetailPage.openEditServiceDialog();
}

/** First money amount rendered in a locator's text (the row price). */
function priceOf(text: string): string {
  const match = text.match(MONEY);
  expect(match, `expected a price in "${text}"`).not.toBeNull();
  return match ? match[0] : '';
}

test.describe('Sửa Service name & Note — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });

  // Persistence (🔍: Order Detail shows the new name after save) is NOT covered — it needs
  // `Confirm update` on live data. Only the ✅ UI part is asserted.
  test(
    'TC-EO-026 — Gõ tay tên service',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditableServiceDialog(orderDetailPage);

      const nameInput = orderDetailPage.serviceNameInputs.first();
      await expect(nameInput).toBeEditable();
      await expect(orderDetailPage.saveChangesButton).toBeDisabled();

      const priceBefore = priceOf(await orderDetailPage.serviceRow(0).innerText());
      const totalBefore = await orderDetailPage.readServicesTotal();
      const original = await nameInput.inputValue();
      const newName = `${original} E2E`.trim();

      await nameInput.fill(newName);
      await expect(nameInput).toHaveValue(newName);
      await expect(orderDetailPage.saveChangesButton).toBeEnabled();

      // Row price stays the same (prices are text-only, no input).
      expect(priceOf(await orderDetailPage.serviceRow(0).innerText())).toBe(priceBefore);
      expect(await orderDetailPage.readServicesTotal()).toBe(totalBefore);

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  test(
    'TC-EO-027 — Chọn tên từ catalog',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage, page }) => {
      await openEditableServiceDialog(orderDetailPage);

      const nameInput = orderDetailPage.serviceNameInputs.first();
      const priceBefore = priceOf(await orderDetailPage.serviceRow(0).innerText());
      const totalBefore = await orderDetailPage.readServicesTotal();

      await orderDetailPage.changeServiceButtons.first().click();
      await expect(orderDetailPage.serviceSearchInput).toBeVisible();

      const options = page.getByRole('option').or(page.getByRole('menuitem'));
      await expect(options.first()).toBeVisible();

      // Catalog shows names only — no prices.
      const optionTexts = (await options.allInnerTexts()).map((t) => t.trim());
      expect(optionTexts.length).toBeGreaterThan(0);
      for (const text of optionTexts) expect(text).not.toMatch(MONEY);

      const pickedText = optionTexts[0];
      await options.first().click();

      // Only `Service name` is filled from the catalog.
      const filled = (await nameInput.inputValue()).trim();
      expect(filled.length).toBeGreaterThan(0);
      expect(pickedText).toContain(filled);

      // Row price / Services total do NOT follow the Service Setting price.
      expect(priceOf(await orderDetailPage.serviceRow(0).innerText())).toBe(priceBefore);
      expect(await orderDetailPage.readServicesTotal()).toBe(totalBefore);

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // Persistence (🔍: note saved/shown after save, waiting on BE) is NOT covered — it needs
  // `Confirm update`. Only the ✅ textbox part is asserted.
  test(
    'TC-EO-031 — Thêm Service note',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditableServiceDialog(orderDetailPage);

      const addNote = orderDetailPage.addNoteButtons.first();
      await expect(addNote).toBeVisible();
      await addNote.click();

      const noteInput = orderDetailPage.serviceNoteInputs.first();
      await expect(noteInput).toBeVisible();
      await noteInput.fill('E2E service note');
      await expect(noteInput).toHaveValue('E2E service note');

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );

  // Persistence (🔍: Order information › Order note shows the new text) is NOT covered — it needs
  // `Confirm update`. Only the ✅ textbox part is asserted.
  test(
    'TC-EO-032 — Cập nhật Order note',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ orderDetailPage }) => {
      await openEditableServiceDialog(orderDetailPage);

      const orderNote = orderDetailPage.orderNote;
      await expect(orderNote).toBeVisible();
      await expect(orderNote).toHaveAttribute('placeholder', 'Add a note for this order');
      await orderNote.fill('E2E order note');
      await expect(orderNote).toHaveValue('E2E order note');

      await orderDetailPage.closeEditServiceDialog();
      expect(orderDetailPage.blockedRequests).toEqual([]);
    },
  );
});
