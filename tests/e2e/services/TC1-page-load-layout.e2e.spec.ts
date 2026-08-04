import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tải trang & bố cục (Page load / Layout) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  test(
    'TC-SVC-001 — lands on Services page with all sections rendered',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ productsPage, page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await productsPage.waitForReady();

      await expect(productsPage.pageTitle).toBeVisible();
      await expect(productsPage.pageTitle).toHaveText(/All Services/i);
      await expect(productsPage.searchInput).toBeVisible();
      await expect(productsPage.activeTab).toBeVisible();
      await expect(productsPage.inactiveTab).toBeVisible();
      await expect(productsPage.exportButton).toBeVisible();
      await expect(productsPage.addCategoryButton).toBeVisible();
      await expect(productsPage.manageOrderButton).toBeVisible();
      await expect(productsPage.addServiceButton).toBeVisible();
      await expect(productsPage.tableHeading).toBeVisible();

      expect(consoleErrors).toEqual([]);
    },
  );

  test(
    'TC-SVC-002 — navigates to Services from sidebar Management group',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, productsPage, page }) => {
      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateTo('Services');

      await expect(page).toHaveURL(/\/pos\/\d+\/services/);
      await productsPage.waitForReady();
      await expect(productsPage.pageTitle).toBeVisible();
      await expect(productsPage.tableHeading).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Chuyển tab/nhập tìm kiếm.
   * 2. Nhấn F5.
   * Expected:
   * Trang tải lại, không bị đăng xuất; nếu trạng thái được lưu qua URL/query param thì tab và từ khóa
   * tìm kiếm vẫn giữ nguyên (nếu không được lưu, kết quả mong đợi là quay lại trạng thái mặc định
   * "Active" — cần xác minh hành vi thực tế).
   */
  // TODO(manual/setup): Expected behavior explicitly depends on whether tab/search state is persisted
  // via URL/query params, which needs live verification against the actual implementation before a
  // reliable automated assertion can be written.
  test.fixme(
    'TC-SVC-003 — reload (F5) preserves tab/search state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      await productsPage.switchToInactiveTab();
      await productsPage.search('test');
      await page.reload();
      await productsPage.waitForReady();
    },
  );

  test(
    'TC-SVC-004 — layout renders correctly at common desktop widths',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ productsPage, page }) => {
      const widths = [1920, 1366, 1024];

      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await productsPage.waitForReady();

        await expect(productsPage.pageTitle).toBeVisible();
        await expect(productsPage.tableHeading).toBeVisible();
        await expect(productsPage.paginationFooter).toBeVisible();

        const bodyOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(bodyOverflow).toBeFalsy();
      }
    },
  );
});
