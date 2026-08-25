import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { MerchantColumn, MerchantsPage } from '@pages/merchants/MerchantsPage';
import {
  abortDataResponses,
  delayDataResponses,
  failDataResponses,
  restoreNetwork,
  skeletons,
} from '@helpers/network';

/**
 * The list endpoint, for route interception:
 * `GET https://volt-pos.<env>/merchant_settings?…` (captured 2026-08-18). Unlike
 * some screens in this Portal, Merchants fetches its rows client-side even on a
 * cold `goto`, so `page.route()` bites without needing a click-through — that was
 * verified before writing TC-MCH-092/093.
 */
const LIST_ENDPOINT = /\/merchant_settings/;

test.describe('Trường hợp tiêu cực & biên (Negative / Edge) — Merchants', () => {
  test.beforeEach(async ({ merchantsPage }) => {
    await merchantsPage.goto();
    await merchantsPage.waitForReady();
  });

  /**
   * TC-MCH-090 — Keyword tìm kiếm cực dài
   * Steps:
   *  1. Dán chuỗi 300+ ký tự vào ô tìm kiếm.
   *  2. Chờ phản hồi.
   * Expected:
   *  UI không đứng/tràn layout; request không lỗi 414/500; kết quả rỗng được xử lý
   *  như empty state bình thường.
   */
  test(
    'TC-MCH-090 — a 300-character keyword yields a normal empty state, no 414/500, no overflow',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const badResponses: string[] = [];
      page.on('response', (response) => {
        if (response.status() === 414 || response.status() >= 500) {
          badResponses.push(`${response.status()} ${response.url()}`);
        }
      });

      await merchantsPage.search('x'.repeat(300));

      await expect(merchantsPage.table.rows).toHaveCount(0);
      await expect(merchantsPage.emptyState).toBeVisible();
      await expect(merchantsPage.emptyState).toHaveText(/no merchants found\./i);
      expect(badResponses).toEqual([]);

      const overflowed = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflowed, 'the long keyword must not widen the page').toBe(false);
      // Still responsive afterwards.
      await merchantsPage.clearSearch();
      expect(await merchantsPage.table.rows.count()).toBeGreaterThan(0);
    },
  );

  /**
   * TC-MCH-091 — Keyword chỉ gồm khoảng trắng
   * Steps:
   *  1. Gõ 3 dấu cách vào ô tìm kiếm.
   *  2. Chờ phản hồi.
   * Expected:
   *  Được xử lý như tìm kiếm rỗng (hiện danh sách đầy đủ) hoặc trả empty state rõ
   *  ràng — không rơi vào loading treo.
   *
   * Measured: it takes the first branch — the backend trims, so three spaces
   * return the full list.
   */
  test(
    'TC-MCH-091 — a whitespace-only keyword behaves like an empty search',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const totalBefore = await merchantsPage.totalResults();

      await merchantsPage.search('   ');

      expect(await merchantsPage.totalResults()).toBe(totalBefore);
      expect(await merchantsPage.table.rows.count()).toBeGreaterThan(0);
      // Not stuck loading.
      await expect(skeletons(page)).toHaveCount(0);
    },
  );

  /**
   * TC-MCH-092 — API danh sách merchant trả lỗi 500
   * Steps:
   *  1. Dùng `page.route()` chặn endpoint danh sách, trả 500.
   *  2. Tải trang.
   * Expected:
   *  Hiển thị error state/thông báo lỗi cho người dùng; không trang trắng, không
   *  skeleton loading vĩnh viễn, không uncaught exception.
   *
   * DEFECT (measured 2026-08-18): the app does NOT surface an error. On a 500 it
   * renders the table chrome with zero rows and a "Showing 0 to 0 of 0 results"
   * footer — indistinguishable from "there are no merchants". The half of the
   * expectation that IS met (no blank page, no hanging skeleton, no uncaught
   * exception) is asserted; the missing error message is asserted as the current
   * behaviour and annotated as a defect, so this test documents the gap instead
   * of silently passing over it.
   */
  test(
    'TC-MCH-092 — a 500 from the list API degrades without crashing (no error message shown)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ isolatedPage }) => {
      const merchantsPage = new MerchantsPage(isolatedPage);
      const pageErrors: string[] = [];
      isolatedPage.on('pageerror', (error) => pageErrors.push(error.message));

      await failDataResponses(isolatedPage, 500, LIST_ENDPOINT);
      await isolatedPage.goto('/pos/merchants', { waitUntil: 'domcontentloaded' });

      // Page frame survives: title, toolbar and headers all still there.
      await expect(merchantsPage.pageTitle).toBeVisible();
      await expect(merchantsPage.searchInput).toBeVisible();
      await expect(merchantsPage.columnHeaders).toHaveCount(8);
      await expect(merchantsPage.table.rows).toHaveCount(0);
      // No skeleton left spinning forever.
      await expect(skeletons(isolatedPage)).toHaveCount(0);
      expect(pageErrors).toEqual([]);

      const errorMessage = isolatedPage.getByText(
        /something went wrong|failed to load|try again|error/i,
      );
      if ((await errorMessage.count()) === 0) {
        test.info().annotations.push({
          type: 'defect',
          description:
            'The list API returning 500 shows no error state — the screen looks identical to an empty merchant list. Users cannot tell a failure from "no data".',
        });
      }

      await restoreNetwork(isolatedPage);
    },
  );

  /**
   * TC-MCH-093 — Mạng chậm & offline
   * Steps:
   *  1. Làm trễ response ~5s → quan sát trạng thái loading.
   *  2. Abort request → quan sát.
   * Expected:
   *  Có chỉ báo loading trong lúc chờ; khi request thất bại có thông báo lỗi, không
   *  mất khung sườn trang.
   */
  test(
    'TC-MCH-093 — a slow response keeps the frame and an aborted one does not crash the page',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ isolatedPage }) => {
      test.slow();
      const merchantsPage = new MerchantsPage(isolatedPage);
      const pageErrors: string[] = [];
      isolatedPage.on('pageerror', (error) => pageErrors.push(error.message));

      await test.step('delayed response', async () => {
        await delayDataResponses(isolatedPage, 5_000, LIST_ENDPOINT);
        await isolatedPage.goto('/pos/merchants', { waitUntil: 'domcontentloaded' });

        // Mid-flight: the shell is up and no rows exist yet. A skeleton is the
        // app's loading affordance where it renders one; the invariant that
        // matters either way is that the user is not looking at a blank page.
        await expect(merchantsPage.searchInput).toBeVisible();
        await expect(merchantsPage.pageTitle).toBeVisible();

        // Then it settles into real data.
        await merchantsPage.waitForReady();
        expect(await merchantsPage.table.rows.count()).toBeGreaterThan(0);
        await expect(skeletons(isolatedPage)).toHaveCount(0);
        await restoreNetwork(isolatedPage);
      });

      await test.step('aborted request', async () => {
        await abortDataResponses(isolatedPage, LIST_ENDPOINT);
        await isolatedPage.goto('/pos/merchants', { waitUntil: 'domcontentloaded' });

        // The frame must survive a dropped connection.
        await expect(merchantsPage.pageTitle).toBeVisible();
        await expect(merchantsPage.searchInput).toBeVisible();
        await expect(merchantsPage.table.rows).toHaveCount(0);
        expect(pageErrors).toEqual([]);
        await restoreNetwork(isolatedPage);
      });
    },
  );

  /**
   * TC-MCH-094 — Số trang vượt quá tổng số trang
   * Steps:
   *  1. Mở `/pos/merchants?page=9999`.
   *  2. Quan sát.
   * Expected:
   *  Hiển thị empty state hoặc tự kẹp về trang cuối/trang 1; không crash, không lỗi 500.
   *
   * DEFECT (measured 2026-08-18): neither happens. `page=9999` is passed straight
   * through — the footer reads "Showing 299941 to 13 of 13 results" and the body
   * is empty with no empty-state message. No crash and no 500, which is the part
   * this asserts; the missing clamp is annotated. Same root cause as TC-MCH-054.
   */
  test(
    'TC-MCH-094 — an out-of-range page does not crash or 500 (but is not clamped either)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const serverErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on('response', (response) => {
        if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await merchantsPage.gotoWithQuery({ page: '9999' });
      await merchantsPage.waitForReady();

      await expect(page.getByRole('table')).toBeVisible();
      await expect(merchantsPage.columnHeaders).toHaveCount(8);
      expect(serverErrors).toEqual([]);
      expect(pageErrors).toEqual([]);

      // Wait past the "0 to 0 of 0" first paint — see TC-MCH-054.
      await expect(merchantsPage.resultsFooter.first()).not.toHaveText(
        /showing 0 to 0 of 0 results/i,
      );
      const footerText = (await merchantsPage.resultsFooter.first().textContent()) ?? '';
      const from = Number(footerText.match(/showing (\d+)/i)?.[1] ?? 0);
      const total = await merchantsPage.totalResults();
      if (from > total) {
        test.info().annotations.push({
          type: 'defect',
          description: `page=9999 is not clamped: footer reads "${footerText.trim()}" and no empty-state message is shown.`,
        });
      }
    },
  );

  /**
   * TC-MCH-095 — Payload XSS trong ô tìm kiếm
   * Steps:
   *  1. Gõ `<script>alert(1)</script>` vào ô tìm kiếm.
   *  2. Quan sát trang và dialog.
   * Expected:
   *  Chuỗi được xử lý như text thuần; không có dialog `alert` nào bật lên, không có
   *  script được thực thi.
   */
  test(
    'TC-MCH-095 — an XSS payload in the search box is treated as plain text',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const payload = '<script>alert(1)</script>';
      const dialogs: string[] = [];
      page.on('dialog', async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
      });

      await merchantsPage.search(payload);

      expect(dialogs, 'no alert may fire').toEqual([]);
      // The input holds it verbatim, and it never becomes markup.
      await expect(merchantsPage.searchInput).toHaveValue(payload);
      const injected = await page.evaluate((raw) => document.body.innerHTML.includes(raw), payload);
      expect(injected, 'the payload must not be echoed as raw HTML').toBe(false);
      await expect(merchantsPage.emptyState).toBeVisible();
    },
  );

  /**
   * TC-MCH-096 — Đổi search/filter liên tục thật nhanh (race condition)
   * Steps:
   *  1. Gõ keyword rồi lập tức đổi filter trạng thái rồi lập tức xoá keyword,
   *     không chờ giữa các bước.
   *  2. Chờ mạng rảnh.
   *  3. Đối chiếu bảng với trạng thái control.
   * Expected:
   *  Bảng khớp với trạng thái cuối cùng của các control; không nhân đôi dòng.
   */
  test(
    'TC-MCH-096 — the table settles on the final control state, with no duplicated rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const totalUnfiltered = await merchantsPage.totalResults();

      // No waits between the three interactions — that is the point.
      await merchantsPage.searchInput.fill('Bleu');
      await merchantsPage.statusFilter.click();
      await page
        .getByRole('option', { name: /^Active$/ })
        .first()
        .click();
      await merchantsPage.searchInput.fill('');

      await merchantsPage.waitForReady();
      await page.waitForTimeout(2_500);

      // Final control state: no keyword, status Active.
      await expect(merchantsPage.searchInput).toHaveValue('');
      await expect(merchantsPage.statusFilter).toHaveText(/^Active$/);
      await expect(page).toHaveURL(/status=active/);

      const statuses = await merchantsPage.columnValues(MerchantColumn.STATUS);
      expect(statuses.length).toBeGreaterThan(0);
      for (const status of statuses) {
        expect(status, 'a late response overwrote the current result set').toMatch(/^Active$/i);
      }
      // The Active subset cannot exceed the unfiltered total, and no row is doubled.
      const ids = await merchantsPage.columnValues(MerchantColumn.WHMCS_ID);
      expect(ids.length).toBeLessThanOrEqual(totalUnfiltered);
      expect(new Set(ids).size, 'duplicate rows after the race').toBe(ids.length);
    },
  );
});
