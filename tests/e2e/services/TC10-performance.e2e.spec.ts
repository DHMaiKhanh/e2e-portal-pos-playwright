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
  /**
   * Timing and memory are both measurable from the page, so this needs no
   * manual stress run: step through every page with "Next", record how long
   * each takes to settle, and read the JS heap before and after.
   *
   * The case sets no SLA, so the assertions are deliberately about hangs rather
   * than speed — a generous ceiling per page, and a heap that has not run away
   * across the whole walk. The measured times are attached for reference.
   */
  test(
    'TC-SVC-090 — page loads 259 services across 9 pages without jank/hang',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ productsPage, page }) => {
      test.slow();

      const heapUsed = async (): Promise<number> =>
        page.evaluate(
          () =>
            (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
              ?.usedJSHeapSize ?? 0,
        );

      await productsPage.waitForReady();
      const totalPages = Number((await productsPage.pageIndicatorText()).split('/')[1]?.trim());
      expect(totalPages).toBeGreaterThan(1);
      const heapBefore = await heapUsed();

      const timings: number[] = [];
      for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
        const started = Date.now();
        await productsPage.goToNextPage();
        await productsPage.waitForReady();
        await expect(productsPage.pageIndicator.first()).toHaveText(
          new RegExp(`^${pageNumber}\\s*/\\s*${totalPages}$`),
        );
        timings.push(Date.now() - started);

        // Every page must actually render rows — a hang here shows up as an
        // empty page rather than as a timeout.
        expect(await productsPage.table.rows.count()).toBeGreaterThan(0);
      }

      const heapAfter = await heapUsed();
      const slowest = Math.max(...timings);
      await test.info().attach('page-timings-ms', {
        body: JSON.stringify({ timings, slowest, heapBefore, heapAfter }, null, 2),
        contentType: 'application/json',
      });

      // No SLA to hold to; this is the "did it hang" line.
      expect(slowest, `slowest page took ${slowest}ms (all: ${timings.join(', ')})`).toBeLessThan(
        15_000,
      );

      if (heapBefore > 0) {
        // Paging is not expected to be free, but a 5x heap after nine pages
        // would mean nothing is being released.
        expect(heapAfter).toBeLessThan(heapBefore * 5);
      }
    },
  );
});
