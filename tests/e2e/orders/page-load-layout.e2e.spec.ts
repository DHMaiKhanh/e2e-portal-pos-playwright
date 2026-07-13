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
        /\/pos\/\d+\/orders\?page=1&status=all&paymentMethod=all&dateField=completedAt&dateAfter=\d{4}-\d{2}-\d{2}&dateBefore=\d{4}-\d{2}-\d{2}/,
      );
      await expect(page).not.toHaveURL(/\/login/);
      await expect(ordersPage.pageHeading).toHaveText(/Order History/i);
    },
  );

  test(
    'TC-ORD-002 — render đủ các khối chính khi tải lần đầu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ ordersPage, page }) => {
      await ordersPage.waitForReady();

      await expect(ordersPage.pageHeading).toHaveText(/Order History/i);
      await expect(ordersPage.searchInput).toBeVisible();
      await expect(ordersPage.quickFilterCombobox).toBeVisible();
      await expect(ordersPage.quickFilterCombobox).toContainText(/Today/i);
      await expect(ordersPage.dateRangeButton).toBeVisible();
      await expect(ordersPage.staffFilterButton).toBeVisible();
      await expect(ordersPage.staffFilterButton).toContainText(/All staff/i);
      await expect(ordersPage.paymentMethodCombobox).toBeVisible();
      await expect(ordersPage.paymentMethodCombobox).toContainText(/All method/i);
      await expect(ordersPage.statusFilter).toBeVisible();
      await expect(ordersPage.statusFilter).toContainText(/All status/i);

      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByText(/od id/i)).toBeVisible();
      await expect(page.getByText(/payment method/i)).toBeVisible();
      await expect(page.getByText(/staff/i).first()).toBeVisible();
      await expect(page.getByText(/customer/i).first()).toBeVisible();
      await expect(page.getByText(/status/i).first()).toBeVisible();
      await expect(page.getByText(/amount/i)).toBeVisible();
      await expect(page.getByText(/date\/time/i)).toBeVisible();

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
