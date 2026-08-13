import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * No extra Playwright project is needed for the 320px breakpoint: the
 * shared-context fixture honours `test.use({ viewport })` and gives this
 * describe a context of its own at that size, laid out from first paint.
 */
test.describe('Responsive / Đa thiết bị — Overview', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  // Navigate directly rather than through DashboardPage.goto(): its readiness
  // gate waits on the Overview heading, which this breakpoint hides, so the
  // page object would time out before the test could measure anything.
  //
  // This layout also hides the sidebar behind a toggle, so the usual landmarks
  // other specs gate on are absent too. What the measurement below actually
  // needs is simply that content has painted — wait for that directly instead of
  // for a specific control that may or may not exist at 320px.
  test.beforeEach(async ({ page }) => {
    await page.goto(Urls.DASHBOARD, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => page.evaluate(() => document.body.innerText.trim().length), {
        timeout: Timeouts.NAVIGATION,
      })
      .toBeGreaterThan(50);
  });

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
  test(
    'TC-OVW-196 — không có cuộn ngang ở viewport 320px',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SLOW] },
    async ({ page }) => {
      await test.step('Trang không cuộn ngang', async () => {
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        // 1px slack for sub-pixel layout rounding.
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
      });

      await test.step('Không card/panel nào tràn qua mép phải', async () => {
        // Catches what the page-level measurement misses: a card whose content
        // pushes past the viewport while an ancestor hides the page scrollbar.
        //
        // Elements inside a horizontally scrollable ancestor are excluded: the
        // device-summary table is wider than 320px on purpose and scrolls within
        // its own container, which is the intended responsive behaviour, not the
        // broken layout this case is looking for.
        const overflowing = await page.evaluate(() => {
          const limit = window.innerWidth + 1;
          const scrollsHorizontally = (el: Element): boolean => {
            for (let p = el.parentElement; p; p = p.parentElement) {
              if (/auto|scroll/.test(getComputedStyle(p).overflowX)) return true;
            }
            return false;
          };

          return Array.from(document.querySelectorAll('body *'))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0 || r.right <= limit) return false;
              return !scrollsHorizontally(el);
            })
            .slice(0, 5)
            .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`);
        });
        expect(overflowing).toEqual([]);
      });
    },
  );
});
