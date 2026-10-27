import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bộ lọc Payment Method — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-014 — Payment Method combobox lists exactly 4 options',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage }) => {
      await expect(ordersPage.paymentMethodCombobox).toBeVisible();
      await ordersPage.paymentMethodCombobox.click();

      // Read off the live popover on 2026-10-20 (VP-4569): the "All methods"
      // reset option is gone (reset = "Clear payment method filter") and labels
      // are sentence-case ("Gift card").
      const expectedOptions = ['Card', 'Cash', 'Gift card', 'Other'];
      for (const optionName of expectedOptions) {
        await expect(
          ordersPage.page.getByRole('option', { name: optionName, exact: true }),
        ).toBeVisible();
      }
      await expect(ordersPage.page.getByRole('option')).toHaveCount(expectedOptions.length);
    },
  );

  test(
    'TC-ORD-015 — filtering by "Cash" shows only cash-paid orders',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      await ordersPage.selectPaymentMethod('Cash');

      await expect(page).toHaveURL(/[?&]paymentMethod=Cash/i);

      const rowTexts = await ordersPage.table.rows.allTextContents();
      if (rowTexts.length > 0) {
        // A split-tender order matches when ANY of its tenders is cash, but the
        // compact cell shows only the first tender plus "+N" (e.g. "•••• 2402+3").
        for (const text of rowTexts) {
          expect(text).toMatch(/cash|\+\d/i);
        }
      } else {
        await expect(ordersPage.emptyStateMessage).toBeVisible();
      }
    },
  );
});
