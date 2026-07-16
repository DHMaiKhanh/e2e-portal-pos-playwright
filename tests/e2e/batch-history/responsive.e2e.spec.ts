import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Responsive — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-044 — correct layout at standard desktop width (1920x1080)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ batchHistoryPage, page }) => {
      await batchHistoryPage.waitForReady();

      // Default viewport for this project is 1920x1080 (see playwright.config.ts).
      await expect(
        batchHistoryPage.sidebar.item('Batch history').or(batchHistoryPage.heading),
      ).toBeVisible();
      await expect(batchHistoryPage.dateRangeButton).toBeVisible();
      await expect(batchHistoryPage.statusCombobox).toBeVisible();
      await expect(batchHistoryPage.tableRoot).toBeVisible();

      const hasHorizontalScroll = await page.evaluate(
        () => document.body.scrollWidth > window.innerWidth,
      );
      expect(hasHorizontalScroll).toBe(false);
    },
  );

  /**
   * TC-BH-045 — correct layout at laptop width (1366x768)
   * Steps: (none specified)
   * Expected: Nội dung reflow không bị cắt xén; không có overflow ngang ở body trang.
   */
  // TODO(setup): requires a 1366x768 viewport project not configured in playwright.config.ts
  test.fixme(
    'TC-BH-045 — correct layout at laptop width (1366x768)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async () => {},
  );

  /**
   * TC-BH-046 — table switches to scroll/stacked at mobile width (375px)
   * Steps: (none specified)
   * Expected: Bảng scroll ngang trong container riêng (không phải toàn trang) hoặc chuyển sang layout dạng stacked;
   * thanh filter wrap hoặc thu gọn hợp lý; body trang không có thanh cuộn ngang.
   */
  // TODO(setup): requires a 375px mobile viewport project not configured in playwright.config.ts
  test.fixme(
    'TC-BH-046 — table switches to scroll/stacked at mobile width (375px)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async () => {},
  );

  /**
   * TC-BH-047 — no horizontal overflow at minimum mobile width (320px)
   * Steps: (none specified)
   * Expected: `document.body.scrollWidth` không vượt quá `window.innerWidth`; date picker, status filter,
   * và nút phân trang vẫn thao tác được.
   */
  // TODO(setup): requires a 320px mobile viewport project not configured in playwright.config.ts
  test.fixme(
    'TC-BH-047 — no horizontal overflow at minimum mobile width (320px)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async () => {},
  );
});
