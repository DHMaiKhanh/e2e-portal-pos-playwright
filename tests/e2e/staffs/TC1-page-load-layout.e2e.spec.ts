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
      // Default sort param changed: the screen lands on `sort=pos_order`, it used
      // to be `orderCreatedAt=desc`.
      await expect(page).toHaveURL(/\/pos\/\d+\/staffs\?page=1&status=active&sort=pos_order/);
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
  /**
   * A viewport does not need its own Playwright project — `page.setViewportSize`
   * resizes within the test, which is closer to what the case describes anyway
   * ("view at 1920, then shrink to 1366 and 1024").
   */
  test(
    'TC-STF-004 — layout has no overlap/clipping at wide and narrow viewport widths',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SLOW] },
    async ({ staffsPage, page }) => {
      await staffsPage.waitForReady();

      for (const width of [1920, 1366, 1024]) {
        await test.step(`${width}px`, async () => {
          await page.setViewportSize({ width, height: 900 });
          await staffsPage.waitForReady();

          // No unintended horizontal scrollbar on the document.
          const overflowed = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          );
          expect(overflowed, `page scrolls horizontally at ${width}px`).toBe(false);

          // The toolbar, table and pager are all on screen and none of them is
          // collapsed to nothing or pushed outside the viewport.
          for (const [label, locator] of [
            ['search', staffsPage.searchInput],
            ['export', staffsPage.exportButton],
            ['table', page.getByRole('table')],
            ['pager', staffsPage.pagination.nextButton],
          ] as const) {
            await expect(locator.first(), `${label} missing at ${width}px`).toBeVisible();
            const box = await locator.first().boundingBox();
            expect(box, `${label} has no box at ${width}px`).not.toBeNull();
            if (box) {
              expect(box.width, `${label} collapsed at ${width}px`).toBeGreaterThan(0);
              expect(box.height, `${label} collapsed at ${width}px`).toBeGreaterThan(0);
              expect(box.x, `${label} pushed off-screen at ${width}px`).toBeGreaterThanOrEqual(0);
            }
          }

          // The toolbar must not sit on top of the table.
          const searchBox = await staffsPage.searchInput.boundingBox();
          const tableBox = await page.getByRole('table').first().boundingBox();
          if (searchBox && tableBox) {
            expect(
              searchBox.y + searchBox.height,
              `search overlaps the table at ${width}px`,
            ).toBeLessThanOrEqual(tableBox.y + 1);
          }
        });
      }
    },
  );
});
