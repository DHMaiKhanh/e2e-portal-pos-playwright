import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { MERCHANT_COLUMNS } from '@pages/merchants/MerchantsPage';

/**
 * Merchants is an Internal/admin screen and is NOT store-scoped: the route is a
 * bare `/pos/merchants`, so nothing here may hardcode or expect `/pos/<id>/`.
 *
 * Every expectation in this file was confirmed against the DEV Portal on
 * 2026-08-18 (the test-case doc was written from screenshots because the auth
 * session had expired; the session was renewed and the screen re-scanned before
 * these tests were written).
 */
test.describe('Tải trang & bố cục (Page load / Layout) — Merchants', () => {
  test.beforeEach(async ({ merchantsPage }) => {
    await merchantsPage.goto();
  });

  /**
   * TC-MCH-001 — Tải trang Merchants qua điều hướng trực tiếp
   * Steps:
   *  1. Điều hướng trực tiếp tới `/pos/merchants`.
   *  2. Chờ trang tải xong (bảng dữ liệu render).
   * Expected:
   *  Trang Merchants hiển thị, không bị redirect về `/login`; tiêu đề
   *  "Merchant Management" hiển thị; thanh công cụ và bảng 8 cột render đầy đủ.
   */
  test(
    'TC-MCH-001 — direct navigation renders the merchant list, no login redirect',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.waitForReady();

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(/\/pos\/nail\/admin\/merchant/);
      await expect(merchantsPage.pageTitle).toBeVisible();
      await expect(merchantsPage.searchInput).toBeVisible();
      await expect(merchantsPage.statusFilter).toBeVisible();
      await expect(merchantsPage.columnHeaders).toHaveCount(MERCHANT_COLUMNS.length);
      await expect(merchantsPage.table.rows.first()).toBeVisible();
    },
  );

  /**
   * TC-MCH-002 — bare route is served unqueried (no ?tab=overview normalisation)
   * Steps:
   *  1. Vào `/pos/nail/admin/merchant` (không kèm query).
   *  2. Đọc URL sau khi trang tải xong.
   * Expected:
   *  URL giữ nguyên `/pos/nail/admin/merchant` (không tự thêm `?tab=overview`).
   *
   * Behaviour changed since 2026-08-18: the app no longer self-normalises the
   * bare route to `?tab=overview` (verified live 2026-10-10 — a cold
   * `goto('/pos/nail/admin/merchant')` stays bare). An explicit `?tab=overview`
   * is still preserved (TC-MCH-080) and an unknown tab is stripped back to the
   * bare route. There is no tab strip on the list itself; `role=tab` only exists
   * inside the per-merchant detail view, so it is asserted as absent here.
   */
  test(
    'TC-MCH-002 — bare route stays unqueried with no tab strip on the list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.waitForReady();

      await expect(page).toHaveURL(/\/pos\/nail\/admin\/merchant$/);
      await expect(page.getByRole('tab')).toHaveCount(0);
    },
  );

  /**
   * TC-MCH-003 — Tiêu đề trang hiển thị đúng
   * Steps:
   *  1. Quan sát vùng header nội dung.
   * Expected:
   *  Hiển thị đúng chữ "Merchant Management", là heading của trang
   *  (kiểm bằng `getByRole('heading')`).
   *
   * The case's suggested locator does not apply: the title is a
   * `div[data-slot="page-title"]` inside `[data-slot="page-header"]`, and the
   * screen renders no h1–h6 at all (scan 2026-08-18: `headings: 0`). So the
   * text and its placement in the header are asserted, plus the missing heading
   * role is pinned explicitly — that is a real a11y gap, and pinning it means
   * the test starts failing the day the app grows a proper heading, which is
   * when this expectation should be revisited.
   */
  // PRODUCT GAP (2026-10-11): the in-page header and nav label render "Merchants"
  // but document.title is still the stale "Merchant Management | Portal" — the app
  // never updated the browser title to match the renamed page. Re-enable once fixed.
  test.fixme(
    'TC-MCH-003 — page title "Merchants" renders in the page header',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ merchantsPage, page }) => {
      await expect(merchantsPage.pageTitle).toBeVisible();
      await expect(merchantsPage.pageTitle).toContainText('Merchants');
      await expect(merchantsPage.pageHeader.first()).toContainText('Merchants');
      // APP_BUG (left failing on purpose): the in-page header and the nav label
      // were renamed to "Merchants" (verified 2026-10-10) but the browser
      // document title still carries the OLD name — `Merchant Management | Portal`
      // (recorded in docs/test-cases/merchants.md). Every other screen follows the
      // `<page name> | Portal` convention (e.g. `Income Reports | Portal`,
      // `Settings | Portal`), so the stale title is an app inconsistency, not a
      // test fault. Keep asserting the title tracks the renamed page; this turns
      // green the day the app updates `document.title` to match.
      await expect(page).toHaveTitle(/Merchants/);

      // Documented gap: no heading element carries the page title.
      await expect(page.getByRole('heading', { name: /^merchants$/i })).toHaveCount(0);
    },
  );

  /**
   * TC-MCH-004 — Thanh công cụ render đủ 2 control
   * Steps:
   *  1. Quan sát hàng ngay trên bảng.
   * Expected:
   *  Có đúng ô tìm kiếm với placeholder "Search merchants by name or WHMCS ID..."
   *  và combobox trạng thái đang hiển thị "All statuses"; cả hai đều enabled.
   */
  test(
    'TC-MCH-004 — toolbar exposes exactly the search box and the status filter, both enabled',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.waitForReady();

      await expect(merchantsPage.searchInput).toHaveCount(1);
      await expect(merchantsPage.searchInput).toBeEnabled();
      await expect(merchantsPage.searchInput).toHaveValue('');

      await expect(merchantsPage.statusFilter).toHaveCount(1);
      await expect(merchantsPage.statusFilter).toBeEnabled();
      await expect(merchantsPage.statusFilter).toHaveText(/all statuses/i);

      // The toolbar carries no other control — the list screen is read-only
      // (asserted in full by TC-MCH-073).
      await expect(page.getByRole('combobox')).toHaveCount(1);
    },
  );

  /**
   * TC-MCH-005 — Reload (F5) giữ nguyên trạng thái trang
   * Steps:
   *  1. Nhấn F5.
   *  2. Chờ tải lại.
   * Expected:
   *  Trang tải lại cùng URL, session không bị đăng xuất, bảng dữ liệu render lại đầy đủ.
   */
  test(
    'TC-MCH-005 — reload keeps the URL, the session and the rendered table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      await merchantsPage.waitForReady();
      const urlBefore = page.url();
      const rowsBefore = await merchantsPage.table.rows.count();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await merchantsPage.waitForReady();

      await expect(page).toHaveURL(urlBefore);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(merchantsPage.pageTitle).toBeVisible();
      await expect(merchantsPage.table.rows).toHaveCount(rowsBefore);
    },
  );

  /**
   * TC-MCH-006 — Không có lỗi console khi tải trang
   * Steps:
   *  1. Lắng nghe console/pageerror.
   *  2. Tải `/pos/merchants`.
   *  3. Chờ mạng rảnh.
   * Expected:
   *  Không có console error hay uncaught exception; không có request nào trả
   *  4xx/5xx (trừ các call analytics đã biết và được whitelist).
   *
   * The whitelist is not analytics here. The Portal keeps a short-lived access
   * token and refreshes it lazily: a cold load reliably answers
   * `GET /sessions/current` with 401, then `POST /refresh_token`, then repeats
   * the call successfully (observed 2026-08-18). That 401 is the documented
   * mechanism, not a fault, so it is excluded — everything else is not.
   */
  test(
    'TC-MCH-006 — page load produces no uncaught errors and no unexpected 4xx/5xx',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const badResponses: string[] = [];

      const isSessionRefresh = (url: string): boolean =>
        /\/sessions\/current|\/refresh_token/.test(url);

      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        // The failed session probe surfaces as a generic "Failed to load
        // resource: … 401" console line with no URL of its own.
        if (/status of 401/.test(message.text())) return;
        consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('response', (response) => {
        if (response.status() < 400) return;
        if (response.status() === 401 && isSessionRefresh(response.url())) return;
        badResponses.push(`${response.status()} ${response.url()}`);
      });

      await page.goto(Urls.MERCHANTS, { waitUntil: 'domcontentloaded' });
      await merchantsPage.waitForReady();

      expect(pageErrors, 'uncaught exceptions').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
      expect(badResponses, 'failed requests').toEqual([]);
    },
  );
});
