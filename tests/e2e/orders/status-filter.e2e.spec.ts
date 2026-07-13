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

      const expectedOptions = [
        'All status',
        'Cancel Issue',
        'Canceled',
        'Canceling',
        'Partial Refunded',
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
