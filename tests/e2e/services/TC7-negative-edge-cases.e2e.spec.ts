import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import {
  clientSideNavigate,
  failDataResponses,
  landOnShell,
  restoreNetwork,
  skeletons,
} from '@helpers/network';

test.describe('Tiêu cực & Biên (Negative / Edge cases) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  test(
    'TC-SVC-060 — category không có dịch vụ vẫn hiển thị đúng, không lỗi',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await expect(productsPage.pageTitle).toBeVisible();
      // Category list should still render even if a category has zero services.
      await expect(productsPage.tableHeading).toBeVisible();

      expect(consoleErrors).toEqual([]);
    },
  );

  /**
   * TC-SVC-061 — Tải trang khi API services trả lỗi/timeout
   * Steps:
   * 1. Chặn (mock lỗi 500 hoặc timeout) request API lấy danh sách dịch vụ.
   * 2. Tải trang Services.
   * Expected:
   * Hiển thị trạng thái lỗi/thông báo phù hợp thay vì màn hình trắng hoặc treo vô hạn;
   * sidebar/top bar vẫn render bình thường.
   */
  /**
   * The route-interception setup the note wanted now exists in
   * `@helpers/network`. The one constraint it comes with: the Portal
   * server-renders a `goto`, so an injected failure is only observable when the
   * screen is reached by clicking, which is what `clientSideNavigate` is for.
   */
  test(
    'TC-SVC-061 — tải trang khi API services trả lỗi/timeout',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      await test.step('Reach Services with the catalogue API failing', async () => {
        await landOnShell(page, Urls.DASHBOARD);
        await failDataResponses(page, 500);
        await clientSideNavigate(page, /^Services$/i);
      });

      await test.step('The failure is surfaced and the chrome survives', async () => {
        // No white screen and no endless spinner: the skeletons must clear.
        await expect(skeletons(page)).toHaveCount(0, { timeout: 30_000 });
        // The app shell is still navigable.
        await expect(productsPage.sidebarServicesLink).toBeVisible();
        // And no stale catalogue is presented as if it were current.
        await expect(productsPage.table.rows).toHaveCount(0);
      });

      await test.step('It recovers once the API is healthy again', async () => {
        await restoreNetwork(page);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await productsPage.waitForReady();
        await expect(productsPage.table.rows.first()).toBeVisible();
      });
    },
  );

  test(
    'TC-SVC-062 — tên dịch vụ/category dài hoặc đặc biệt không vỡ layout',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await expect(productsPage.pageTitle).toBeVisible();
      await expect(productsPage.tableHeading).toBeVisible();
      // Ensure the table container does not overflow the viewport horizontally.
      const box = await productsPage.tableHeading.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(1920 + 5);
      }
    },
  );

  /**
   * TC-SVC-063 — Điều hướng trực tiếp tới trang phân trang không hợp lệ (page vượt quá tổng số trang)
   * Steps:
   * 1. Điều hướng trực tiếp bằng query param tới một số trang lớn hơn tổng số trang thực tế (vd ?page=99 khi chỉ có 9 trang).
   * Expected:
   * App không hiển thị bảng trống/lỗi crash; hoặc tự động điều chỉnh về trang hợp lệ cuối cùng,
   * hoặc hiển thị trạng thái rỗng có kiểm soát.
   */
  /**
   * The param contract, read off the live screen, is `?page=<n>`. Out-of-range
   * and malformed values behave differently and both are covered: `page=0` and
   * `page=abc` are clamped back to page 1, while a page past the end renders a
   * controlled empty state. The case permits either outcome, so this asserts
   * the shared guarantee — no crash, chrome intact, no half-built table — plus
   * what each input actually does.
   */
  test(
    'TC-SVC-063 — điều hướng trực tiếp tới trang phân trang không hợp lệ',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await test.step('A page past the end renders a controlled empty state', async () => {
        await page.goto(`${Urls.PRODUCTS}?page=99`, { waitUntil: 'domcontentloaded' });
        await productsPage.waitForReady();

        await expect(productsPage.table.rows).toHaveCount(0);
        await expect(productsPage.nextPageButton).toBeDisabled();
        await expect(productsPage.addCategoryButton).toBeVisible();
      });

      await test.step('Zero and non-numeric pages fall back to page 1', async () => {
        for (const badPage of ['0', 'abc']) {
          await page.goto(`${Urls.PRODUCTS}?page=${badPage}`, { waitUntil: 'domcontentloaded' });
          await productsPage.waitForReady();

          await expect(productsPage.pageIndicator.first()).toHaveText(/^1\s*\/\s*\d+$/);
          await expect(productsPage.table.rows.first()).toBeVisible();
          await expect(productsPage.previousPageButton).toBeDisabled();
        }
      });

      expect(pageErrors, `unhandled page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
    },
  );
});
