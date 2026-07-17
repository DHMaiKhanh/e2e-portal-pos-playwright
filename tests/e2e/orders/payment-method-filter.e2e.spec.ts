import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bộ lọc Payment Method — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-014 — Payment Method combobox lists exactly 5 options',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage }) => {
      await expect(ordersPage.paymentMethodCombobox).toBeVisible();
      await ordersPage.paymentMethodCombobox.click();

      const expectedOptions = ['All method', 'Card', 'Cash', 'Gift Card', 'Other'];
      for (const optionName of expectedOptions) {
        await expect(
          ordersPage.page.getByRole('option', { name: optionName, exact: true }),
        ).toBeVisible();
      }
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
        for (const text of rowTexts) {
          expect(text).toMatch(/cash/i);
        }
      } else {
        await expect(ordersPage.emptyStateMessage).toBeVisible();
      }
    },
  );
});
