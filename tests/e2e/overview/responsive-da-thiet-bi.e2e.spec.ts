import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Responsive / Đa thiết bị — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  // TODO(manual/setup): requires a non-default 320x568 viewport (not configured as a project in
  // playwright.config) and a manual scrollWidth/innerWidth measurement plus visual inspection of
  // long-string wrapping/ellipsizing — needs live verification at that breakpoint.
  /**
   * Steps:
   * 1. Tải /pos/14/overview ở chiều rộng 320px.
   * 2. Đo document.documentElement.scrollWidth so với window.innerWidth.
   * 3. Kiểm tra các chuỗi dài không ngắt: encryption key '019dcd1e-140a-7205-b548-64abeecadea9',
   *    device ID, email 'test@email.cc', và địa chỉ
   *    '56A Le Khoi, Phu Thanh Ward, HCM, WY, 70111, US'.
   *
   * Expected:
   * document scrollWidth nhỏ hơn hoặc bằng window.innerWidth (không có thanh cuộn ngang).
   * Tất cả chuỗi dài đều xuống dòng, rút gọn (ellipsize), hoặc ngắt trong container của chúng
   * thay vì đẩy layout rộng hơn viewport. Không có card, bảng, hoặc panel nào tràn ra ngoài mép phải.
   */
  test.fixme(
    'TC-OVW-196 — không có cuộn ngang ở viewport 320px',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SLOW] },
    async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    },
  );
});
