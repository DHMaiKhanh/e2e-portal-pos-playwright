import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { env } from '@configs/env/loadEnv';
import { expectCrossStoreBlocked, UNAUTHORISED_STORE_ID } from '@helpers/security';
import {
  INCOME_URL_PATTERN,
  INCOME_XSS_PAYLOADS,
  IncomeTab,
  incomeIsoDateFromToday,
  incomeTabUrlPattern,
} from '@pages/income/IncomePage';

/**
 * The only query params this screen is allowed to carry.
 *
 * Straight off the case (`ngày, period, search, page, stat, tab`), with the
 * date filter spelled out in the names the app actually writes — `date` on the
 * Daily tab, `dateAfter`/`dateBefore` on Summary and Staff — plus the Staff
 * tab's own checkbox filter (`showStaffNoIncome`, see TC-INC-107).
 */
const ALLOWED_PARAMS = new Set([
  'tab',
  'date',
  'dateAfter',
  'dateBefore',
  'period',
  'search',
  'page',
  'stat',
  'showStaffNoIncome',
]);

/** `eyJ…` — the shape of a JWT header, i.e. an access or refresh token. */
const JWT_SHAPE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;

/** A money figure with cents — the financial data that must stay off the URL and out of the log. */
const MONEY_SHAPE = /-?\$\s?[\d,]+\.\d{2}/;

/** An email address — the PII this screen sits next to (staff / owner accounts). */
const EMAIL_SHAPE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/**
 * Console noise that is not this screen's doing.
 *
 * The Portal's own session bootstrap answers `GET /sessions/current` with a 401
 * before refreshing (documented on the Merchants screen, TC-MCH-* notes) and
 * DEV drops a route chunk now and then — neither is a data leak, so neither may
 * fail the log assertion.
 */
const CONSOLE_NOISE =
  /status of 401|\[vite\]|Download the React DevTools|ResizeObserver|dynamically imported module|Loading chunk|ChunkLoadError|source ?map/i;

/** Hosts whose traffic belongs to the app; third-party beacons are not this case's business. */
const APP_HOSTS = [new URL(env.BASE_URL).host, new URL(env.API_URL).host];

/**
 * Bảo mật — the access-control and injection cases of the Income Reports screen.
 *
 * This is the store's whole revenue picture (per-order totals, staff earnings),
 * so the two questions worth asking hardest are "can a URL reach another
 * store's numbers" and "does anything typed into the screen become markup".
 * Both are answerable with the single admin session the suite holds. The
 * role-permission case needs a second account and is parked as a documented
 * scaffold.
 *
 * Nothing here mutates data: the blocked-store case only navigates, and the
 * unauthenticated API probe replays GETs from a throwaway context so it can
 * neither write anything nor touch the reused session.
 */
test.describe('Bảo mật — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  /**
   * TC-INC-181 — Không truy cập được store khác qua URL
   * Steps:
   *  1. Load `/pos/<storeId của store không được phép>/income`.
   * Expected:
   *  Bị chặn (403/404/redirect); không hiển thị bất kỳ số liệu doanh thu nào của
   *  store đó.
   *
   * `UNAUTHORISED_STORE_ID` (99999) is verified absent from this account's
   * merchant list, so the route exercises the authorisation path rather than
   * route-param validation. The DEV answer is an in-app block — the chrome
   * stays, the body becomes "This merchant is not available." — which covers
   * the "chặn" half. The load-bearing half is the negative one: not one revenue
   * figure of that store may reach the DOM.
   */
  test(
    'TC-INC-181 — a store the account cannot see serves no income figures',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await expectCrossStoreBlocked(page, (storeId) => `/pos/nail/${storeId}/income`);

      // None of the screen's own furniture rendered: no tab strip, no table,
      // no Order Details card.
      await expect(incomePage.tabs).toHaveCount(0);
      await expect(incomePage.visibleTables).toHaveCount(0);
      await expect(incomePage.orderDetailsTitle).toHaveCount(0);

      // And no money anywhere on the page — the leak this case actually guards.
      const currency = await incomePage.currencyTokens();
      expect(currency, `money rendered for store ${UNAUTHORISED_STORE_ID}`).toEqual([]);
    },
  );

  /**
   * TC-INC-182 — Dữ liệu tài chính không lộ trong URL hay log
   * Steps:
   *  1. Thao tác đủ các filter.
   *  2. Kiểm tra URL và console/network log.
   * Expected:
   *  URL chỉ chứa param filter (ngày, period, search, page, stat, tab); không có
   *  token/PII/số liệu tài chính; console không in dữ liệu thô.
   *
   * Every filter on this screen is URL state, so "exercise the filters" and
   * "read the URL" are one walk: a KPI card (`stat`), a day (`date`), a period
   * (`period`), a search term (`search`), the no-income checkbox
   * (`showStaffNoIncome`), across all three tabs (`tab`). Each URL the walk
   * produces is checked twice — its keys against the allowlist, its whole text
   * against the token / money / email shapes.
   */
  test(
    'TC-INC-182 — filters put nothing but filter params on the URL, and no raw data in the log',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const consoleLines: string[] = [];
      page.on('console', (message) => consoleLines.push(message.text()));
      const dataRequests = incomePage.captureDataRequests();

      // Reload with the listeners attached so the first fetch is observed too.
      await incomePage.reload();
      await incomePage.waitForDataSettled();

      const seen: string[] = [page.url()];

      // Daily: a KPI card writes `stat=`, the calendar writes `date=`.
      await incomePage.selectKpiCard('Total Tip');
      seen.push(page.url());
      // Day 15 exists in every month and is always in the past when the suite
      // runs after mid-month, so it is never a disabled future day.
      await incomePage.selectDay(15);
      seen.push(page.url());

      // Summary: `period=`.
      await incomePage.openTab(IncomeTab.SUMMARY);
      await incomePage.selectIncomePeriod('Week');
      seen.push(page.url());

      // Staff: `search=` and `showStaffNoIncome=`.
      await incomePage.gotoTab(IncomeTab.STAFF);
      await incomePage.searchStaff('an');
      seen.push(page.url());
      await incomePage.setShowStaffWithNoIncome(true);
      seen.push(page.url());

      test.info().annotations.push({ type: 'urls-visited', description: seen.join('\n') });

      for (const visited of seen) {
        const url = new URL(visited);
        expect(url.pathname, 'still on the income route').toMatch(INCOME_URL_PATTERN);

        for (const key of url.searchParams.keys()) {
          expect(ALLOWED_PARAMS, `unexpected query param "${key}" on ${visited}`).toContain(key);
        }
        for (const [key, value] of url.searchParams) {
          expect(value, `token-shaped value in "${key}"`).not.toMatch(JWT_SHAPE);
          expect(value, `money in "${key}"`).not.toMatch(MONEY_SHAPE);
          // `search=an` is a name fragment, not PII; an address would be.
          expect(value, `email in "${key}"`).not.toMatch(EMAIL_SHAPE);
        }
        expect(visited, 'credential smuggled onto the URL').not.toMatch(
          /(?:token|auth|password|secret|jwt|bearer)=/i,
        );
      }

      // Network: the session travels in headers, never in a query string.
      const leakyRequests = dataRequests.filter(
        (url) => JWT_SHAPE.test(url) || /[?&](?:token|access_token|auth|jwt)=/i.test(url),
      );
      expect(leakyRequests, 'credential on a request URL').toEqual([]);

      // Console: no token and no raw financial figures printed.
      const relevant = consoleLines.filter((line) => !CONSOLE_NOISE.test(line));
      expect(
        relevant.filter((line) => JWT_SHAPE.test(line)),
        'token-shaped string logged to the console',
      ).toEqual([]);
      expect(
        relevant.filter((line) => MONEY_SHAPE.test(line)),
        'raw financial data logged to the console',
      ).toEqual([]);
    },
  );

  /**
   * TC-INC-183 — Nội dung nhập không bị render thành HTML
   * Steps:
   *  1. Nhập `<img src=x onerror=alert(1)>` vào ô tìm kiếm nhân viên.
   *  2. Thử cả qua URL `?tab=staff&search=<script>alert(1)</script>`.
   * Expected:
   *  Chuỗi được xử lý như text thuần (escape), không có dialog/script chạy, không
   *  lỗi console về CSP.
   *
   * Both injection routes are covered: typed into the box, and fed straight
   * through `search=` — the more dangerous one, since it reaches the input from
   * outside the app. Escaping is proven three ways: the payload comes back out
   * of the input as text, `injectedNodeCount()` finds no node carrying it as
   * markup (no `<script>` holding `alert(1)`, no `onerror` attribute, no
   * `img[src=x]`), and no `alert(1)` dialog ever fires.
   */
  test(
    'TC-INC-183 — an XSS payload in the staff search is treated as plain text',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      // Listeners first: a dialog raised by an executed payload has to be
      // caught (and dismissed) rather than hanging the test.
      const dialogs = incomePage.captureDialogs();
      const consoleErrors = incomePage.captureConsoleErrors();

      const [scriptPayload, imgPayload] = INCOME_XSS_PAYLOADS;

      // 1 — typed into the staff search box.
      await incomePage.gotoTab(IncomeTab.STAFF);
      await incomePage.typeStaffSearch(imgPayload);
      await incomePage.waitForSearchSettled();

      expect(await incomePage.staffSearchValue(), 'payload survives as input text').toContain(
        'alert(1)',
      );
      expect(await incomePage.injectedNodeCount(), 'nodes parsed out of the payload').toBe(0);
      // No staff is named that, so the table simply has nothing to show.
      await expect(incomePage.staffTable.rows).toHaveCount(0);

      // 2 — fed through the URL instead of the keyboard.
      await incomePage.gotoWithQuery({ tab: IncomeTab.STAFF, search: scriptPayload });
      await incomePage.waitForSearchSettled();

      expect(await incomePage.staffSearchValue(), 'deep-linked payload stays text').toContain(
        'alert(1)',
      );
      expect(
        await incomePage.injectedNodeCount(),
        'nodes parsed out of the deep-linked payload',
      ).toBe(0);
      // The screen is still usable, not blanked by the injection attempt.
      await expect(incomePage.staffSearchInput).toBeVisible();

      // No script ran…
      expect(dialogs, 'a dialog fired from the injected payload').toEqual([]);
      // …and the browser reported no CSP violation on the way.
      const cspErrors = consoleErrors.filter((message) =>
        /content security policy|refused to (execute|load|apply)|unsafe-(inline|eval)/i.test(
          message,
        ),
      );
      expect(cspErrors, 'CSP violation in the console').toEqual([]);
    },
  );

  /**
   * TC-INC-184 — Phân quyền theo role
   * Preconditions:
   *  Cần một storageState của tài khoản role hạn chế (**hiện project chỉ có
   *  admin — case này bị chặn**).
   * Steps:
   *  1. Đăng nhập bằng role không có quyền xem báo cáo doanh thu.
   *  2. Load `/pos/<storeId>/income`.
   * Expected:
   *  Mục `Income Reports` bị ẩn khỏi sidebar và truy cập trực tiếp bị chặn.
   */
  // TODO(manual/setup): needs a second session for a role without
  // revenue-report permission. The suite holds exactly one captured
  // storageState, an admin one (scripts/capture-auth.mjs — Google OAuth + 2FA,
  // so it cannot be scripted per role), and configs/env/.env.local carries no
  // second credential. Unblocked by capturing a limited-role storageState, then
  // wrapping this test in `test.use({ storageState: <that file> })` and
  // asserting `incomePage.navLinkByHref(Urls.INCOME)` has count 0 and that the
  // deep link is refused. Highest-value unwritten case in this area — the
  // screen exposes every order total and every staff member's earnings.
  test.fixme(
    'TC-INC-184 — a role without report permission cannot see or reach Income Reports',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-INC-185 — Gọi API báo cáo trực tiếp không có auth
   * Steps:
   *  1. Bắt endpoint mà màn hình gọi.
   *  2. Gọi lại endpoint đó không kèm token.
   * Expected:
   *  Trả 401/403, không trả dữ liệu.
   *
   * Step 1 records the screen's own XHR/fetch traffic instead of hard-coding a
   * path, so the case keeps working when the API moves. Step 2 replays those
   * calls from a context created WITHOUT storageState — GETs only, so the probe
   * cannot write anything — and refuses to follow redirects, so a bounce to a
   * login page cannot be mistaken for a successful fetch.
   *
   * The status assertion accepts the whole "refused" family (401, 403, or a
   * redirect away) and records what each endpoint actually answered; what it
   * will not accept is a 2xx, because a report served without a session is the
   * defect this case exists to catch.
   */
  test(
    'TC-INC-185 — the report endpoints refuse a call carrying no session',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page, browser }) => {
      const calls: Array<{ url: string; method: string }> = [];
      page.on('request', (request) => {
        const type = request.resourceType();
        if (type !== 'xhr' && type !== 'fetch') return;
        if (request.method() !== 'GET') return;
        if (!APP_HOSTS.includes(new URL(request.url()).host)) return;
        calls.push({ url: request.url(), method: request.method() });
      });

      // Deep-link a concrete day so the report calls definitely fire.
      await incomePage.gotoWithQuery({ tab: IncomeTab.DAILY, date: incomeIsoDateFromToday(0) });
      await incomePage.waitForDataSettled();
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.DAILY));

      const unique = [...new Map(calls.map((call) => [call.url, call])).values()];
      expect(unique.length, 'the screen made no data call to probe').toBeGreaterThan(0);

      // The screen also polls the app shell's own public config (`/version.json`
      // and friends) over XHR. Those are unauthenticated-by-design — a 200 there
      // is correct, not a leak — so they are not "report endpoints" and must be
      // kept out of the probe. This case is about the data/report calls only.
      const PUBLIC_ENDPOINT =
        /\/(?:version|config|build-manifest|asset-manifest)\.json(?:$|\?)|\/manifest\.webmanifest|\/favicon\.|\/robots\.txt/i;
      const reportCalls = unique.filter((call) => !PUBLIC_ENDPOINT.test(call.url));
      expect(
        reportCalls.length,
        'no report endpoint to probe (only public assets seen)',
      ).toBeGreaterThan(0);

      const context = await browser.newContext({ storageState: undefined });
      const observed: string[] = [];
      try {
        // A handful is enough: the ones the Daily tab fires first are its data.
        for (const call of reportCalls.slice(0, 5)) {
          const response = await context.request.fetch(call.url, {
            method: call.method,
            failOnStatusCode: false,
            maxRedirects: 0,
            timeout: 30_000,
          });
          const status = response.status();
          const body = await response.text();
          observed.push(`${status} ${call.url}`);

          const refused = status === 401 || status === 403 || (status >= 300 && status < 400);
          expect(refused, `${call.url} answered ${status} without a session`).toBe(true);
          expect(body, `money in the unauthenticated response of ${call.url}`).not.toMatch(
            MONEY_SHAPE,
          );
        }
      } finally {
        test.info().annotations.push({
          type: 'unauthenticated-probe',
          description: observed.join('\n'),
        });
        await context.close();
      }
    },
  );
});
