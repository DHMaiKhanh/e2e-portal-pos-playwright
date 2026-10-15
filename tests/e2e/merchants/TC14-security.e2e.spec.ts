import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect } from '@helpers/security';
import { MerchantsPage } from '@pages/merchants/MerchantsPage';
import { expireSessionResponses, restoreNetwork } from '@helpers/network';

/**
 * This screen is the Portal's only cross-tenant list — it shows every merchant in
 * the system, with owner emails and phone numbers — so the access-control cases
 * here matter more than on any store-scoped screen.
 */
test.describe('Bảo mật & phân quyền (Security) — Merchants (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-MCH-130 — Chưa đăng nhập → redirect về trang login
   * Steps:
   *  1. Mở `/pos/merchants?tab=overview`.
   *  2. Đọc URL cuối.
   * Expected:
   *  Redirect về `/login?redirect=%2Fpos%2Fmerchants`, hiển thị trang đăng nhập;
   *  không rò rỉ dữ liệu merchant nào ra HTML.
   *
   * Already observed directly on 2026-08-18 (the expired-session scan bounced to
   * exactly this URL), so this codifies a confirmed behaviour.
   */
  test(
    'TC-MCH-130 — an unauthenticated visitor is bounced to /login with no merchant data',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, `${Urls.MERCHANTS}?tab=overview`, [
        page.getByRole('table'),
        page.locator('tbody tr'),
      ]);

      await expect(page).toHaveURL(/redirect=%2Fpos%2Fnail%2Fadmin%2Fmerchant/);
      // The login page offers "Continue with GCI Business" (a button) and
      // "Continue with Google" (a link). `.first()` goes on the union, not on
      // each side, or the composed locator still matches both.
      await expect(
        page
          .getByRole('button', { name: /continue with/i })
          .or(page.getByRole('link', { name: /continue with/i }))
          .first(),
      ).toBeVisible();

      // Nothing of the cross-tenant list reaches the HTML: no owner emails, no
      // phone numbers, no merchant table. Key off a merchants-table-specific
      // column header ("OWNER EMAIL") rather than the generic word "Merchants",
      // which is too common to be a reliable leak signal.
      const html = await page.content();
      expect(html).not.toMatch(/\(\d{3}\) \d{3}-\d{4}/);
      expect(html).not.toMatch(/OWNER EMAIL/i);
    },
  );
});

test.describe('Bảo mật & phân quyền (Security) — Merchants', () => {
  /**
   * TC-MCH-131 — Session hết hạn giữa phiên làm việc
   * Steps:
   *  1. Vào trang Merchants với session hợp lệ.
   *  2. Xoá/làm hỏng cookie `token` và `refreshToken`.
   *  3. Kích hoạt một lần fetch lại (tìm kiếm hoặc đổi trang).
   * Expected:
   *  App xử lý 401 êm — đưa về `/login` hoặc hiện thông báo hết hạn; không hiện dữ
   *  liệu cũ như thể còn hợp lệ; không lặp vô hạn request.
   *
   * The 401 is injected with `page.route` rather than by deleting the real
   * cookies: the storage state is shared by the whole suite, and invalidating it
   * for real would sign every other test out. Runs on `isolatedPage` so even the
   * app's own reaction (it may clear its session on the way to /login) cannot
   * reach the worker-shared context.
   *
   * The assertion is deliberately outcome-tolerant — bounce to /login, an explicit
   * expiry message, or an emptied table are all acceptable answers to the case;
   * an unbounded retry loop is not, and neither is silently keeping the stale rows
   * with no signal. Which branch fired is annotated.
   */
  test(
    'TC-MCH-131 — a mid-session 401 is handled without a retry storm or stale data',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ isolatedPage }) => {
      const merchantsPage = new MerchantsPage(isolatedPage);
      await merchantsPage.goto();
      await merchantsPage.waitForReady();
      expect(await merchantsPage.table.rows.count()).toBeGreaterThan(0);

      const listRequests: string[] = [];
      isolatedPage.on('request', (request) => {
        if (/\/merchant_settings/.test(request.url())) listRequests.push(request.url());
      });

      await expireSessionResponses(isolatedPage, /\/merchant_settings/);
      // Trigger a refetch through the UI, the way the case describes.
      await merchantsPage.searchInput.fill('Salon');
      await isolatedPage.waitForTimeout(8_000);

      // No retry storm.
      expect(
        listRequests.length,
        `list endpoint hit ${listRequests.length} times after the 401`,
      ).toBeLessThan(15);

      const onLogin = /\/login/.test(isolatedPage.url());
      const expiryMessage = await isolatedPage
        .getByText(/session (has )?expired|please (log|sign) in again|unauthor/i)
        .count();
      const rowsLeft = onLogin ? 0 : await merchantsPage.table.rows.count();

      test.info().annotations.push({
        type: 'behaviour',
        description: `401 on refetch → ${onLogin ? 'redirected to /login' : expiryMessage > 0 ? 'expiry message shown' : `stayed on the screen with ${rowsLeft} row(s)`}`,
      });

      // Handled somehow: signed out, told, or emptied — never stale-and-silent.
      expect(
        onLogin || expiryMessage > 0 || rowsLeft === 0,
        'the app kept showing the old rows with no sign the session had expired',
      ).toBe(true);

      await restoreNetwork(isolatedPage);
    },
  );

  /**
   * TC-MCH-132 — Tài khoản không phải admin không truy cập được
   * Steps:
   *  1. Mở trực tiếp `/pos/merchants`.
   *  2. Quan sát.
   * Expected:
   *  Bị chặn — 403 / redirect / trang "không có quyền"; nhóm `Internal` không hiển
   *  thị trong sidebar; không dòng merchant nào của merchant khác bị lộ.
   */
  // TODO(manual/setup): needs a non-admin (staff/owner) session. The suite holds a
  // single captured admin session (scripts/capture-auth.mjs, Google OAuth + 2FA)
  // and configs/env/.env.local has no second credential, so there is no role to
  // sign in as. Unblocked by capturing a second storageState for a limited-role
  // account and adding `test.use({ storageState: <that file> })` here.
  //
  // This is the highest-value unwritten case on the screen: the data is
  // cross-tenant, so a permission regression here leaks every merchant's owner
  // email and phone number.
  test.fixme(
    'TC-MCH-132 — a non-admin account cannot reach the Merchants screen',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-MCH-133 — Không lộ thông tin nhạy cảm trong payload
   * Steps:
   *  1. Bắt response của endpoint danh sách merchant.
   *  2. Soi các field trả về.
   * Expected:
   *  Response chỉ chứa các field cần cho bảng; không kèm secret (API key, token của
   *  merchant, hash mật khẩu, số tài khoản ngân hàng đầy đủ).
   *
   * The list returns a Hydra collection whose `member[]` records carried exactly
   * these keys on 2026-08-18: @id, @type, id, email, phoneNumber, businessName,
   * legalName, signatureTiming, website, postalCode, address, status, city,
   * country, state, createdAt, updatedAt — no secrets. Rather than freeze that
   * list (new columns are legitimate), the test walks every key in the payload and
   * fails on a *sensitive* one, and attaches the observed field list for review.
   *
   * Key matching is word-aware on purpose: a naive substring check for "ssn"
   * matches "businessName", which is how this assertion first went wrong.
   */
  test(
    'TC-MCH-133 — the list payload carries no credentials or secrets',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ merchantsPage, page }) => {
      const responseBody = page.waitForResponse(
        (response) => /\/merchant_settings/.test(response.url()) && response.ok(),
        { timeout: 30_000 },
      );
      await merchantsPage.goto();
      await merchantsPage.waitForReady();
      const payload = await (await responseBody).json();

      const BANNED_WORDS = new Set([
        'password',
        'passwd',
        'secret',
        'token',
        'apikey',
        'privatekey',
        'ssn',
        'cvv',
        'pin',
        'salt',
        'hash',
        'iban',
      ]);
      /** camelCase / snake_case → lowercase words, so "businessName" ≠ "ssn". */
      const words = (key: string): string[] =>
        key
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .split(/[^A-Za-z0-9]+/)
          .filter(Boolean)
          .map((word) => word.toLowerCase());

      const offending: string[] = [];
      const seenKeys = new Set<string>();
      const walk = (node: unknown, path: string): void => {
        if (Array.isArray(node)) {
          node.forEach((item, index) => walk(item, `${path}[${index}]`));
          return;
        }
        if (!node || typeof node !== 'object') return;
        for (const [key, value] of Object.entries(node)) {
          seenKeys.add(key);
          if (words(key).some((word) => BANNED_WORDS.has(word))) offending.push(`${path}.${key}`);
          walk(value, `${path}.${key}`);
        }
      };
      walk(payload, '$');

      test.info().annotations.push({
        type: 'payload-fields',
        description: [...seenKeys].sort().join(', '),
      });
      expect(offending, 'sensitive-looking fields in the list payload').toEqual([]);

      // Nor a bank account or a JWT smuggled in as a value.
      const raw = JSON.stringify(payload);
      expect(raw, 'JWT-shaped value in the payload').not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\./);
      expect(raw, 'full bank/card number in the payload').not.toMatch(/\b\d{13,19}\b/);
    },
  );

  /**
   * TC-MCH-134 — Token không bị ghi ra console/DOM
   * Steps:
   *  1. Ghi lại toàn bộ console output khi tải và tương tác với trang.
   *  2. Tìm chuỗi giống JWT trong console và trong HTML đã render.
   * Expected:
   *  Không có access/refresh token nào bị log ra console hay nhúng vào HTML.
   */
  test(
    'TC-MCH-134 — no access or refresh token is logged to the console or embedded in the HTML',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ merchantsPage, page }) => {
      const JWT_SHAPE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
      const consoleOutput: string[] = [];
      page.on('console', (message) => consoleOutput.push(message.text()));

      await merchantsPage.goto();
      await merchantsPage.waitForReady();
      // Interact, so anything logged on user actions is captured too.
      await merchantsPage.search('Bleu');
      await merchantsPage.selectStatus(/^Active$/);

      const leakedToConsole = consoleOutput.filter((line) => JWT_SHAPE.test(line));
      expect(leakedToConsole, 'token-shaped string logged to the console').toEqual([]);

      const html = await page.content();
      expect(JWT_SHAPE.test(html), 'token-shaped string embedded in the rendered HTML').toBe(false);
      // Also not parked in a global for convenience.
      const inGlobals = await page.evaluate(() => {
        const suspects = ['token', 'accessToken', 'refreshToken', 'authToken', 'jwt'];
        return suspects.filter((key) => {
          const value = (window as unknown as Record<string, unknown>)[key];
          return typeof value === 'string' && value.length > 20;
        });
      });
      expect(inGlobals, 'token exposed on window').toEqual([]);
    },
  );
});
