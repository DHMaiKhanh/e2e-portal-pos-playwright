import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tải trang & bố cục (Page load / Layout) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
  });

  test(
    'TC-STF-001 — lands on /pos/<id>/staffs with default query params',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ staffsPage, page }) => {
      await staffsPage.waitForReady();
      await expect(page).toHaveURL(/\/pos\/\d+\/staffs\?page=1&status=active&orderCreatedAt=desc/);
      await expect(staffsPage.pageTitle).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  test(
    'TC-STF-002 — navigates to Staffs from sidebar Management group',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, staffsPage, page }) => {
      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateTo('Staffs');
      await expect(page).toHaveURL(/\/pos\/\d+\/staffs/);
      await expect(staffsPage.sidebar.item('Staffs')).toHaveAttribute('aria-current', 'page');
      await expect(staffsPage.pageTitle).toBeVisible();
    },
  );

  test(
    'TC-STF-003 — reload (F5) preserves filter/search query params',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.search('a');
      const urlBeforeReload = page.url();
      await page.reload();
      await staffsPage.waitForReady();
      await expect(page).toHaveURL(urlBeforeReload);
      await expect(staffsPage.pageTitle).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Xem trang ở 1920px.
   * 2. Thu nhỏ xuống ~1366px, 1024px.
   * Expected:
   * Thanh công cụ, bảng và phân trang không bị chồng lấp/cắt; không xuất hiện thanh cuộn ngang ngoài ý muốn ở các độ rộng phổ biến.
   */
  // TODO(manual/setup): responsive viewport widths (1366px, 1024px) are not configured as playwright.config projects; needs manual/live verification across breakpoints.
  test.fixme(
    'TC-STF-004 — layout has no overlap/clipping at wide and narrow viewport widths',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SLOW] },
    async () => {},
  );
});
