import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import type { Page } from '@playwright/test';

/**
 * Whether the page itself scrolls sideways. Sub-pixel layout rounding makes an
 * exact comparison flaky, so allow a 1px slack — the same tolerance the
 * Customers responsive case uses.
 */
const horizontalOverflow = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

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
      // Both operands match here (the sidebar link AND the page heading), so the
      // `.or()` resolves to two elements. `.first()` has to wrap the whole chain
      // — putting it on one operand, as before, leaves the union ambiguous.
      await expect(
        batchHistoryPage.sidebar.item('Batch history').or(batchHistoryPage.heading).first(),
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
});

/**
 * Narrower breakpoints. No extra Playwright project is needed for these — the
 * shared-context fixture honours `test.use({ viewport })` and hands the test a
 * context of its own at that size, so the page is laid out at the target width
 * from first paint rather than being resized after the fact.
 */
test.describe('Responsive — Batch History @ 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  /**
   * TC-BH-045 — correct layout at laptop width (1366x768)
   * Expected: Nội dung reflow không bị cắt xén; không có overflow ngang ở body trang.
   */
  test(
    'TC-BH-045 — correct layout at laptop width (1366x768)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ batchHistoryPage, page }) => {
      await batchHistoryPage.waitForReady();

      await expect(batchHistoryPage.heading).toBeVisible();
      await expect(batchHistoryPage.dateRangeButton).toBeVisible();
      await expect(batchHistoryPage.statusCombobox).toBeVisible();
      await expect(batchHistoryPage.tableRoot).toBeVisible();

      expect(await horizontalOverflow(page)).toBe(false);
    },
  );
});

test.describe('Responsive — Batch History @ 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  /**
   * TC-BH-046 — table switches to scroll/stacked at mobile width (375px)
   * Expected: Bảng scroll ngang trong container riêng (không phải toàn trang) hoặc chuyển sang layout dạng stacked;
   * thanh filter wrap hoặc thu gọn hợp lý; body trang không có thanh cuộn ngang.
   */
  test(
    'TC-BH-046 — table switches to scroll/stacked at mobile width (375px)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ batchHistoryPage, page }) => {
      await batchHistoryPage.waitForReady();
      await expect(batchHistoryPage.tableRoot).toBeVisible();

      // The wide ledger has to go somewhere: it may scroll inside its own
      // container or stack, but it must not widen the page itself.
      const tableScrollsInItsOwnContainer = await page.evaluate(() => {
        const table = document.querySelector('table');
        if (!table) return false;
        for (let el = table.parentElement; el; el = el.parentElement) {
          const style = getComputedStyle(el);
          if (/auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth) return true;
        }
        return false;
      });
      const stacked = await page.evaluate(() => {
        const table = document.querySelector('table');
        return !table || table.getBoundingClientRect().width <= window.innerWidth;
      });

      expect(
        tableScrollsInItsOwnContainer || stacked,
        'table should scroll in its own container or stack, not widen the page',
      ).toBe(true);

      expect(await horizontalOverflow(page)).toBe(false);
    },
  );
});

test.describe('Responsive — Batch History @ 320px', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  /**
   * TC-BH-047 — no horizontal overflow at minimum mobile width (320px)
   * Expected: `document.body.scrollWidth` không vượt quá `window.innerWidth`; date picker, status filter,
   * và nút phân trang vẫn thao tác được.
   */
  test(
    'TC-BH-047 — no horizontal overflow at minimum mobile width (320px)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ batchHistoryPage, page }) => {
      await batchHistoryPage.waitForReady();

      expect(await horizontalOverflow(page)).toBe(false);

      // Controls remain usable, not merely present.
      await expect(batchHistoryPage.dateRangeButton.first()).toBeEnabled();
      await expect(batchHistoryPage.statusCombobox.first()).toBeEnabled();

      // Pagination survives the breakpoint, but collapses to icon-only: the
      // "Previous"/"Next" labels are CSS-hidden at this width, which strips the
      // buttons of an accessible name, so the page-object's by-role locators
      // cannot see them here. Match on text content and check they are still
      // rendered at a tappable size.
      await expect(batchHistoryPage.pageIndicator).toBeVisible();
      for (const label of ['Previous', 'Next']) {
        const button = page.locator('button').filter({ hasText: new RegExp(`^${label}$`) });
        await expect(button).toHaveCount(1);

        const box = await button.boundingBox();
        expect(box, `${label} button should be rendered`).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(24);
        expect(box!.height).toBeGreaterThanOrEqual(24);
      }
    },
  );
});
