import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tải trang & Bố cục — Orders', () => {
  test.beforeEach(async ({ ordersPage }) => {
    await ordersPage.goto();
  });

  test(
    'TC-ORD-001 — vào Orders qua route theo store /pos/<id>/orders',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ ordersPage, page }) => {
      await ordersPage.waitForReady();

      await expect(page).toHaveURL(
        /\/pos\/nail\/\d+\/orders\?page=1&status=all&paymentMethod=all&dateField=completedAt&dateAfter=\d{4}-\d{2}-\d{2}&dateBefore=\d{4}-\d{2}-\d{2}/,
      );
      await expect(page).not.toHaveURL(/\/login/);
      // The page title reads "Orders" (was "Order History") — confirmed in the
      // failure ARIA snapshot: <div data-slot="page-title">Orders</div>.
      await expect(ordersPage.pageHeading).toHaveText(/^Orders$/i);
    },
  );

  test(
    'TC-ORD-002 — render đủ các khối chính khi tải lần đầu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      await ordersPage.waitForReady();

      // The page title reads "Orders" (was "Order History") — confirmed in the
      // failure ARIA snapshot: <div data-slot="page-title">Orders</div>.
      await expect(ordersPage.pageHeading).toHaveText(/^Orders$/i);
      await expect(ordersPage.searchInput).toBeVisible();
      await expect(ordersPage.quickFilterCombobox).toBeVisible();
      // BEHAVIOUR CHANGE (2026-08-12): the default date preset is now "Last 7
      // Days" — the landing URL carries a 7-day dateAfter/dateBefore range. This
      // assertion used to expect "Today". Confirm with the product team that the
      // wider default is intended and not a regression.
      await expect(ordersPage.quickFilterCombobox).toContainText(/Last 7 Days/i);
      await expect(ordersPage.dateRangeButton).toBeVisible();
      await expect(ordersPage.staffFilterButton).toBeVisible();
      // VP-4569: unfiltered chips show just their name ("Staff", "Payment
      // method", "Status") instead of "All staff" / "All methods" / "All statuses".
      await expect(ordersPage.staffFilterButton).toHaveText(/^Staff$/);
      await expect(ordersPage.paymentMethodCombobox).toBeVisible();
      await expect(ordersPage.paymentMethodCombobox).toHaveText(/^Payment method$/);
      await expect(ordersPage.statusFilter).toBeVisible();
      await expect(ordersPage.statusFilter).toHaveText(/^Status$/);

      await expect(page.getByRole('table')).toBeVisible();
      // Column header reads "ORDER ID" (was "OD ID").
      // Column headers, scoped to the table: since VP-4569 the filter chips
      // ("Staff", "Payment method", "Status") reuse the same words.
      for (const header of [
        'Order ID',
        'Payment method',
        'Staff',
        'Customer',
        'Status',
        'Amount',
        'Date/time',
      ]) {
        await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
      }

      await expect(ordersPage.paginationSummary).toBeVisible();
    },
  );

  test(
    'TC-ORD-003 — reload (F5) giữ nguyên bộ lọc trên URL',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      await ordersPage.waitForReady();
      await ordersPage.selectStatus('Canceled');

      await expect(page).toHaveURL(/status=Canceled/i);
      const urlBeforeReload = page.url();

      await page.reload();
      await ordersPage.waitForReady();

      await expect(page).toHaveURL(urlBeforeReload);
      await expect(ordersPage.statusFilter).toContainText(/Canceled/i);
    },
  );
});
