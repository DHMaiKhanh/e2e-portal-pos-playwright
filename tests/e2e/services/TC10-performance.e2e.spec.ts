import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Hiệu năng (Performance) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  /**
   * Steps:
   * 1. Tải trang Services.
   * 2. Chuyển qua vài trang liên tiếp bằng nút "Next".
   * Expected:
   * Thời gian tải mỗi trang trong ngưỡng hợp lý (không có yêu cầu SLA cụ thể —
   * ghi nhận thời gian thực tế để tham chiếu); không có hiện tượng giật/treo UI
   * khi chuyển trang; không tăng bộ nhớ bất thường khi chuyển nhiều trang liên tiếp.
   */
  // TODO(manual/setup): requires performance timing/memory measurement and
  // multi-page-navigation stress testing (259 services across 9 pages), which
  // needs live/manual verification and is not a simple functional assertion.
  test.fixme(
    'TC-SVC-090 — page loads 259 services across 9 pages without jank/hang',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ productsPage }) => {
      await expect(productsPage.pageTitle).toBeVisible();
    },
  );
});
