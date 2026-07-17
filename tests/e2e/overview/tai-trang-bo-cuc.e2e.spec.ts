import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tải trang & Bố cục — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-001 — vào Overview qua route theo store /pos/<id>/overview',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
      await expect(dashboardPage.heading).toBeVisible();
    },
  );

  test(
    'TC-OVW-002 — chuyển hướng user đã đăng nhập từ root / sang Overview theo store',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await page.goto('/');
      await page.waitForURL(/\/pos\/\d+\/overview/);
      await expect(page).toHaveURL(/\/pos\/\d+\/overview/);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(dashboardPage.heading).toBeVisible();
    },
  );

  test(
    'TC-OVW-003 — render đủ bốn khối nội dung của Overview khi tải lần đầu',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.batchHistorySection).toBeVisible();
    },
  );

  test(
    "TC-OVW-004 — render các chỉ số Today's Summary bao gồm Total Payment khi tải trang",
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      const totalPayment = dashboardPage.metric('Total Payment');
      await expect(totalPayment).toBeVisible();
      await expect(totalPayment).not.toHaveText('');
      await expect(totalPayment).not.toContainText('undefined');
    },
  );

  test(
    'TC-OVW-011 — đảm bảo bố cục nguyên vẹn, không cuộn ngang hoặc chồng chéo khối ở viewport mặc định',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.todaysSummarySection).toBeVisible();
      await expect(dashboardPage.merchantInfoSection).toBeVisible();
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.batchHistorySection).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    },
  );
});
