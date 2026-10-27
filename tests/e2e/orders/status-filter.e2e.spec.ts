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

      // Read off the live popover on 2026-10-20 (VP-4569): no "All statuses"
      // reset option any more (reset = "Clear status filter") and labels are
      // sentence-case ("Cancel issue", "Partial refunded", "Refund issue").
      const expectedOptions = [
        'Cancel issue',
        'Canceled',
        'Canceling',
        'Partial refunded',
        'Pending',
        'Refund issue',
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
      await expect(ordersPage.page.getByRole('option')).toHaveCount(expectedOptions.length);
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
