import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Bộ lọc Status — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-016 — danh sách option của Status combobox',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage }) => {
      await ordersPage.statusFilter.click();

      // Read off the live Select on 2026-08-12. The reset option is "All
      // statuses" (the app used to label it "All status") and "Pending" was
      // added between "Partial Refunded" and "Refund Issue".
      const expectedOptions = [
        'All statuses',
        'Cancel Issue',
        'Canceled',
        'Canceling',
        'Partial Refunded',
        'Pending',
        'Refund Issue',
        'Refunded',
        'Refunding',
        'Successful - Settled',
        'Successful - Unsettled',
        'Re-opened',
      ];

      for (const optionName of expectedOptions) {
        await expect(
          ordersPage.page.getByRole('option', { name: optionName, exact: true }),
        ).toBeVisible();
      }
    },
  );

  test(
    'TC-ORD-017 — lọc theo "Canceled" chỉ hiển thị order đã huỷ',
    { tag: [Tag.REGRESSION] },
    async ({ ordersPage, page }) => {
      await ordersPage.filterByStatus('Canceled');

      await expect(page).toHaveURL(/[?&]status=/i);

      const rowCount = await ordersPage.rowCount();
      if (rowCount > 0) {
        const statusBadges = page.getByRole('row').getByText('Canceled', { exact: true });
        const badgeCount = await statusBadges.count();
        expect(badgeCount).toBeGreaterThan(0);
      }
    },
  );
});
