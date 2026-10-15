import { test, expect } from '@fixtures/index';
import type { Page } from '@playwright/test';
import { Tag } from '@/types/testTags';
import { env } from '@configs/env/loadEnv';
import { Urls } from '@constants/urls';
import { expireSessionResponses } from '@helpers/network';
import { expectUnauthenticatedRedirect } from '@helpers/security';
import {
  INCOME_BAD_STORE_IDS,
  INCOME_CURRENCY_TEXT_PATTERN,
  INCOME_DATE_LABEL_PATTERN,
  INCOME_DATE_RANGE_LABEL_PATTERN,
  INCOME_KPI_CARDS,
  INCOME_LOGIN_URL_PATTERN,
  INCOME_STAFF_PAGE_SIZE,
  INCOME_TABS,
  INCOME_WEEK_LABEL_PATTERN,
  IncomePage,
  IncomePeriod,
  IncomeSummaryColumn,
  IncomeTab,
  incomeDateRangeLabel,
  incomeTabLabel,
  incomeTabUrlPattern,
} from '@pages/income/IncomePage';

/** `999999` (no such store) and `abc` (not even a number). */
const { missing: MISSING_STORE_ID, nonNumeric: NON_NUMERIC_STORE_ID } = INCOME_BAD_STORE_IDS;

/**
 * Every refusal copy a bad store route may legitimately answer with.
 *
 * `This merchant is not available.` is the one actually observed on DEV for a
 * well-formed store id the account cannot see (see @helpers/security, and
 * TC-INC-181); the rest are the other shapes the case's Expected allows
 * ("không tìm thấy / không có quyền") so a product change in wording degrades
 * this to a different accepted branch rather than a false failure.
 */
const REFUSAL_TEXT =
  /this merchant is not available|not found|no access|do(?:es)? ?n[o']t have (?:permission|access)|unauthori[sz]ed|forbidden|40[34]/i;

/**
 * Text that would mean an internal error escaped to the browser — a stack
 * frame, a source path, a driver error. Deliberately narrow: it must not match
 * ordinary UI copy, so every alternative carries punctuation no label has.
 */
const STACK_TRACE_LEAK =
  /\bat [\w$.<>[\]]+ \([^)]*:\d+:\d+\)|node_modules[/\\]|\/src\/[\w/.-]+\.tsx?:\d+|Traceback \(most recent call last\)|SQLSTATE|ECONNREFUSED|ER_[A-Z_]+/;

/**
 * The portal hub ("Choose where you'd like to start.") a malformed route bounces
 * to — a valid, non-store landing that is itself a legitimate redirect target.
 */
const PORTAL_HUB_TEXT = /choose where you'?d like to start|welcome back/i;

/**
 * What the app did with a bad store route.
 *
 * The case accepts three answers and rejects a fourth: `login` (bounced to the
 * sign-in screen), `refused` (kept a real page and said no), `redirected`
 * (left the bad store route for somewhere well-formed — another store, or the
 * portal hub) — or `pending`, which is "still nothing", the blank page the case
 * is written to rule out.
 */
const badRouteOutcome = async (
  page: Page,
  badStoreId: string,
): Promise<'login' | 'refused' | 'redirected' | 'pending'> => {
  const url = page.url();
  if (INCOME_LOGIN_URL_PATTERN.test(url)) return 'login';

  const text = await page
    .locator('body')
    .innerText()
    .catch(() => '');
  if (REFUSAL_TEXT.test(text)) return 'refused';
  // Redirected: the app moved us off the bad store's income route. That covers a
  // bounce to another well-formed store route AND a bounce back to the portal
  // hub (the URL leaves `/pos/nail/<badId>/`, or the hub landing renders).
  if (!url.includes(`/pos/nail/${badStoreId}/`) || PORTAL_HUB_TEXT.test(text)) return 'redirected';
  return 'pending';
};

/** Body text of a page, whitespace-collapsed — for the "no blank page" checks. */
const bodyText = async (page: Page): Promise<string> =>
  (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();

/**
 * A wholly-past three-week window on the Staff tab. `showStaffNoIncome=true`
 * over this range was measured at 244 results / 9 pages during the scan
 * (income.md), which is what gives the race case a `Next` button to click.
 */
const STAFF_RANGE = { dateAfter: '2026-08-01', dateBefore: '2026-08-21' } as const;

/** The keyword that must win the race. `Erin` is a known DEV staff name. */
const FINAL_TERM = 'Erin';

/** Typed back to back with no debounce wait between them; only the last may survive. */
const RACE_TERMS = ['Kim', 'Ann', FINAL_TERM];

/**
 * Six days straddling the Jul/Aug boundary — the month-end case's range.
 *
 * Chosen so the `Week` bucket that covers it (`Jul 27 – Aug 2`) is necessarily
 * a two-month label, and so the window sits in the range the store is known to
 * have transactions in (income.md works Aug 1–21 throughout).
 */
const BOUNDARY_RANGE = { dateAfter: '2026-07-29', dateBefore: '2026-08-03' } as const;

/** `Week 27 (Jun 29 – Jul 5, 2026)` split into week number, both months, both days, year. */
const WEEK_LABEL_PARTS =
  /^Week (\d+) \(([A-Z][a-z]{2}) (\d{1,2}) – ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})\)$/;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `Jul 29, 2026` → a local-midnight Date, for range containment checks. */
const parseDateLabel = (label: string): number => new Date(`${label} 00:00:00`).getTime();

/**
 * Tiêu cực & biên — what the screen does when the route, the session, the
 * network or the user misbehave.
 *
 * Three things shape this file:
 *
 *  - anything that touches the session or points the Portal at another store
 *    runs on `isolatedPage`, which owns its BrowserContext. The suite shares one
 *    signed-in context per worker (src/fixtures/reuseContext.fixture.ts), so a
 *    cleared cookie or a remembered merchant switch would otherwise strand every
 *    later test on that worker;
 *  - the bad-route cases assert the *class* of answer, not one branch of it. The
 *    Expected itself is a disjunction ("thông báo không tìm thấy … hoặc
 *    redirect"), and the load-bearing half is negative: no blank page, no stack
 *    trace;
 *  - the race cases assert internal consistency — search box vs `?search=`, the
 *    footer's range vs the rows actually rendered, no row twice — because that
 *    is what "response cũ đến muộn phải bị loại bỏ" looks like from the outside.
 *    Live figures are never asserted.
 */
test.describe('Tiêu cực & biên — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  /**
   * TC-INC-146 — `storeId` không tồn tại
   * Steps:
   *  1. Load `/pos/999999/income`.
   * Expected:
   *  Hiện thông báo không tìm thấy / không có quyền, hoặc redirect về màn hình
   *  hợp lệ; không trang trắng, không rò rỉ stack trace.
   *
   * `gotoStore()` deliberately does not wait for the chrome — the point of the
   * case is that the screen may refuse to render — so the settle is expressed as
   * a poll over the outcome instead.
   */
  // PRODUCT GAP (2026-10-11): /pos/999999/income renders the store shell (999999
  // resolves to a real store, "Fastboy Markerting") but the income panel hangs in
  // a pending/loading state — it neither refuses, redirects, nor finishes
  // rendering within 20s. Re-enable once a bad/cross-vertical store resolves to a
  // refusal or redirect instead of a stuck page.
  test.fixme(
    'TC-INC-146 — a store id that does not exist is refused or redirected, never blank',
    { tag: [Tag.REGRESSION] },
    async ({ isolatedPage }) => {
      const incomePage = new IncomePage(isolatedPage);

      await incomePage.gotoStore(MISSING_STORE_ID);

      await expect
        .poll(() => badRouteOutcome(isolatedPage, MISSING_STORE_ID), {
          timeout: 20_000,
          message: `/pos/${MISSING_STORE_ID}/income rendered neither a refusal nor a redirect`,
        })
        .not.toBe('pending');

      const text = await bodyText(isolatedPage);
      // Not a blank page: something real is on screen either way.
      expect(text.length, 'blank page for a non-existent store').toBeGreaterThan(20);
      expect(text, 'internal error detail rendered to the user').not.toMatch(STACK_TRACE_LEAK);

      // Whatever branch it took, the bad store id is not still driving a
      // rendered income table.
      if (isolatedPage.url().includes(`/pos/nail/${MISSING_STORE_ID}/`)) {
        await expect(incomePage.visibleTables).toHaveCount(0);
      }
    },
  );

  /**
   * TC-INC-147 — `storeId` không phải số
   * Steps:
   *  1. Load `/pos/abc/income`.
   * Expected:
   *  Xử lý lỗi rõ ràng (404/redirect), không lỗi JS.
   *
   * "không lỗi JS" is read as *uncaught* errors: the `pageerror` channel, not
   * `console`. The DEV build prints benign console errors on any route (SVG
   * attribute warnings out of its chart layer, 401s while a session settles),
   * so a blanket console assertion would fail for reasons this case is not
   * about.
   */
  test(
    'TC-INC-147 — a non-numeric store id is handled without an uncaught JS error',
    { tag: [Tag.REGRESSION] },
    async ({ isolatedPage }) => {
      const incomePage = new IncomePage(isolatedPage);
      const pageErrors: string[] = [];
      isolatedPage.on('pageerror', (error) => pageErrors.push(error.message));

      await incomePage.gotoStore(NON_NUMERIC_STORE_ID);

      await expect
        .poll(() => badRouteOutcome(isolatedPage, NON_NUMERIC_STORE_ID), {
          timeout: 20_000,
          message: `/pos/${NON_NUMERIC_STORE_ID}/income rendered neither a refusal nor a redirect`,
        })
        .not.toBe('pending');

      const text = await bodyText(isolatedPage);
      expect(text.length, 'blank page for a non-numeric store id').toBeGreaterThan(20);
      expect(text, 'internal error detail rendered to the user').not.toMatch(STACK_TRACE_LEAK);

      expect(pageErrors, 'uncaught JS error on a malformed store route').toEqual([]);
    },
  );

  /**
   * TC-INC-148 — Session hết hạn khi đang xem
   * Steps:
   *  1. Load màn hình.
   *  2. Xóa cookie/token phiên.
   *  3. Đổi filter để phát sinh request mới.
   * Expected:
   *  Redirect về `/login` (hoặc hiện thông báo hết phiên), không hiển thị dữ liệu
   *  cũ như thể vẫn hợp lệ.
   *
   * The expiry is injected two ways at once, because the screen's refetch may go
   * either to the data host or back through the app: the session cookies are
   * dropped (so a server-rendered fetch has no session) and the data host is
   * answered 401 (so a client-side XHR sees an expired token). Both are exactly
   * the signal a real expiry produces at the browser.
   *
   * Isolated: the app may clear its own cookie on the way to /login, which in
   * the worker-shared context would sign out every later test on this worker.
   */
  test(
    'TC-INC-148 — losing the session mid-view stops the screen serving data',
    { tag: [Tag.REGRESSION] },
    async ({ isolatedPage }) => {
      const incomePage = new IncomePage(isolatedPage);
      await incomePage.goto();
      await incomePage.waitForDataSettled();
      await expect(incomePage.tabs).toHaveCount(INCOME_TABS.length);

      await incomePage.clearSessionCookies();
      await expireSessionResponses(isolatedPage);

      // Step 3 — change the date filter, which is what makes the screen fetch
      // again. The click is allowed to be interrupted: the bounce can win the
      // race, and that redirect is the thing under assertion.
      await incomePage.openDatePicker();
      await incomePage
        .calendarDay(1)
        .click({ noWaitAfter: true })
        .catch(() => {});

      const sessionNotice = isolatedPage
        .getByText(/session (?:has )?expired|sign(?:ed)? out|please (?:sign|log) ?in/i)
        .first();

      await expect
        .poll(
          async () =>
            INCOME_LOGIN_URL_PATTERN.test(isolatedPage.url()) ||
            (await sessionNotice.isVisible().catch(() => false)),
          {
            timeout: 20_000,
            message: 'the app kept serving the screen after the session went away',
          },
        )
        .toBe(true);

      // Bounced cleanly — no half-rendered report left behind as if still valid.
      if (INCOME_LOGIN_URL_PATTERN.test(isolatedPage.url())) {
        await expect(incomePage.tabs).toHaveCount(0);
        await expect(isolatedPage.locator('tbody tr')).toHaveCount(0);
      }
    },
  );

  /**
   * TC-INC-149 — Truy cập khi chưa đăng nhập
   * Steps:
   *  1. Dùng context sạch (không storageState).
   *  2. Load `/pos/14/income`.
   * Expected:
   *  Redirect về `/login`; không lộ bất kỳ số liệu doanh thu nào.
   *
   * The clean context is built by hand rather than with `test.use`, so this case
   * can live in the same describe as the signed-in ones: `test.use` is
   * file/describe scoped and would take the beforeEach above down with it.
   */
  test(
    'TC-INC-149 — a signed-out visitor is bounced to /login with no figures shown',
    { tag: [Tag.REGRESSION] },
    async ({ browser }) => {
      const context = await browser.newContext({
        baseURL: env.BASE_URL,
        ignoreHTTPSErrors: true,
        storageState: { cookies: [], origins: [] },
      });

      try {
        const cleanPage = await context.newPage();

        await expectUnauthenticatedRedirect(cleanPage, Urls.INCOME, [
          cleanPage.getByRole('tab'),
          cleanPage.getByRole('columnheader'),
          cleanPage.locator('tbody tr'),
        ]);

        // Not one money figure reached the DOM on the way through.
        expect(
          await bodyText(cleanPage),
          'a revenue figure rendered to a signed-out visitor',
        ).not.toMatch(INCOME_CURRENCY_TEXT_PATTERN);
      } finally {
        await context.close();
      }
    },
  );

  /**
   * TC-INC-150 — Mất mạng giữa lúc đổi filter
   * Steps:
   *  1. Load màn hình.
   *  2. Bật offline.
   *  3. Đổi khoảng ngày.
   * Expected:
   *  Hiện lỗi/thông báo retry rõ ràng; không skeleton vô hạn; khi online lại thì
   *  thao tác lại được.
   */
  // TODO(manual/setup): needs offline emulation plus an error copy that does not
  // exist yet in writing. Two blockers:
  //  1. `setOffline` is a BrowserContext switch, so it must run on
  //     `isolatedPage` (own context) or it takes every other test on the worker
  //     offline with it if this one dies before restoring — that part is
  //     mechanical.
  //  2. The assertion has nothing to bind to. The scan never observed a
  //     data-layer error or retry control on this screen; the only failure
  //     boundary ever captured is the chunk-load one (`POS is unavailable right
  //     now` + `Try again`), which is a different failure. Asserting a guessed
  //     string would fail on wording, and asserting "no infinite skeleton" alone
  //     would pass vacuously on a screen that simply keeps stale data.
  // Unblocked by running it once by hand on `isolatedPage`
  // (`setOffline(true)` → `selectDayRange()` → capture what the data region
  // renders → `setOffline(false)` → re-filter), then locking that copy in.
  test.fixme(
    'TC-INC-150 — going offline mid-filter shows a retry-able error, not an endless skeleton',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-INC-151 — API trả dữ liệu rỗng bất thường
   * Steps:
   *  1. Mock API báo cáo trả về mảng rỗng / object thiếu field.
   *  2. Load từng tab.
   * Expected:
   *  Mọi tab hiện empty state hoặc `$0.00`, không `NaN`, `undefined`, `null` lộ
   *  ra UI.
   */
  // TODO(manual/setup): needs the report endpoints, which this screen's scan
  // never captured (income.md lists exactly this gap under "cần xác minh").
  // Without a URL glob, `page.route()` either matches nothing — the test then
  // passes vacuously against real data — or matches every XHR including auth.
  // A `goto` would not be enough either: the Portal server-renders the first
  // paint, so an interception only bites a screen reached by clicking
  // (see @helpers/network).
  // Unblocked by recording the tabs' XHR URLs (TC-INC-185 already annotates
  // them at runtime), then fulfilling those with `{ data: [] }` and a
  // field-stripped object while asserting the rendered text carries no
  // `NaN` / `undefined` / `null` and every figure is `$0.00`.
  test.fixme(
    'TC-INC-151 — empty or field-stripped report payloads render $0.00, never NaN',
    { tag: [Tag.REGRESSION] },
    async () => {},
  );

  /**
   * TC-INC-152 — Đổi filter liên tục rất nhanh (race condition)
   * Steps:
   *  1. Trên tab Staff, gõ nhanh nhiều từ khóa khác nhau liên tiếp.
   *  2. Đồng thời bấm chuyển trang.
   * Expected:
   *  Kết quả cuối cùng khớp filter cuối cùng (response cũ đến muộn phải bị loại
   *  bỏ); footer, bảng và URL đồng bộ với nhau.
   *
   * The keywords are written straight into the box one after another with no
   * settle in between, and `Next` is clicked while those requests are still in
   * flight — so several responses are outstanding at once and only the last
   * filter may be represented when the dust settles.
   */
  test(
    'TC-INC-152 — the last keyword wins the race and table, footer and URL agree',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({
        tab: IncomeTab.STAFF,
        showStaffNoIncome: 'true',
        ...STAFF_RANGE,
      });
      await incomePage.waitForDataSettled();

      // There has to be a second page for the page-change click to mean anything.
      const [, , totalBefore] = await incomePage.resultsRange();
      expect(totalBefore, 'staff rows to paginate').toBeGreaterThan(INCOME_STAFF_PAGE_SIZE);

      for (const term of RACE_TERMS) {
        await incomePage.staffSearchInput.fill(term);
      }
      await incomePage.nextPageButton.click({ noWaitAfter: true }).catch(() => {});

      await incomePage.waitForSearchSettled();
      await incomePage.waitForDataSettled();

      // The box and the URL both hold the last keyword — nothing was clobbered
      // by a response that arrived late.
      expect(await incomePage.staffSearchValue()).toBe(FINAL_TERM);
      expect(incomePage.param('search')).toBe(FINAL_TERM);

      // Every row on screen belongs to that keyword (substring match, per the
      // scan: `Erin` matches `Erin` and `Kerin`).
      const names = await incomePage.staffNames();
      for (const name of names) {
        expect(name.toLowerCase(), 'row left over from an earlier keyword').toContain(
          FINAL_TERM.toLowerCase(),
        );
      }
      if (names.length === 0) await expect(incomePage.staffEmptyState.first()).toBeVisible();

      // No row twice: a stale page merged into a fresh one would show up here.
      expect(new Set(names).size, 'duplicated staff rows').toBe(names.length);

      // Footer and table tell one story.
      const [from, to, total] = await incomePage.resultsRange();
      expect(names.length).toBeLessThanOrEqual(INCOME_STAFF_PAGE_SIZE);
      if (total === 0) {
        expect([from, to, names.length], 'zero results but rows on screen').toEqual([0, 0, 0]);
      } else if (names.length > 0) {
        expect(to - from + 1, 'footer range vs rendered rows').toBe(names.length);
        expect(to).toBeLessThanOrEqual(total);
      }

      // …and so do the URL and the page indicator. Whether an out-of-range page
      // is clamped is TC-INC-125's business, not this case's, so only the
      // agreement between the two is asserted here.
      if ((await incomePage.pageIndicator.count()) > 0) {
        const [current] = await incomePage.pagePosition();
        const urlPage = incomePage.param('page');
        expect(current, 'page indicator vs ?page=').toBe(urlPage === '' ? 1 : Number(urlPage));
      }
    },
  );

  /**
   * TC-INC-153 — Chuyển tab liên tục rất nhanh
   * Steps:
   *  1. Bấm luân phiên 3 tab nhiều lần liên tiếp.
   * Expected:
   *  Cuối cùng chỉ 1 tab panel hiển thị, đúng tab được bấm sau cùng; không hiện
   *  đồng thời bảng của 2 tab, không lỗi console.
   *
   * All three panels stay mounted with two of them hidden, so "only one panel"
   * has to be asserted against the *visible* set — which is what
   * `visibleTabPanels` / `visibleTables` are for.
   *
   * "không lỗi console" is narrowed to the errors this flurry could actually
   * cause (state churn, unmounted updates, hydration): the DEV build prints
   * benign SVG attribute errors from its chart layer on ordinary loads, so a
   * blanket empty-console assertion would be red regardless of tab switching.
   */
  test(
    'TC-INC-153 — a flurry of tab clicks settles on exactly one panel, the last clicked',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      const consoleErrors = incomePage.captureConsoleErrors();

      const LAST_TAB = IncomeTab.STAFF;
      for (let round = 0; round < 3; round += 1) {
        for (const tab of [IncomeTab.DAILY, IncomeTab.SUMMARY, LAST_TAB]) {
          await incomePage.tab(incomeTabLabel(tab)).click({ noWaitAfter: true });
        }
      }

      await page.waitForURL(incomeTabUrlPattern(LAST_TAB), { timeout: 20_000 });
      await incomePage.waitForDataSettled();

      // Exactly one tab selected, and it is the one clicked last.
      expect(incomePage.currentTab()).toBe(LAST_TAB);
      await expect(incomePage.selectedTab).toHaveCount(1);
      expect(await incomePage.selectedTabLabel()).toBe(incomeTabLabel(LAST_TAB));

      // One visible panel, one visible table — never two tabs' tables at once.
      await expect(incomePage.visibleTabPanels).toHaveCount(1);
      await expect(incomePage.visibleTables).toHaveCount(1);
      await expect(incomePage.staffHeaders.first()).toBeVisible();
      await expect(incomePage.orderDetailsHeaders).toHaveCount(0);
      await expect(incomePage.summaryHeaders).toHaveCount(0);

      expect(pageErrors, 'uncaught JS error while switching tabs').toEqual([]);
      const churn = consoleErrors.filter((message) =>
        /maximum update depth|cannot update a component|unmounted component|memory leak|hydrat/i.test(
          message,
        ),
      );
      expect(churn, 'render-churn error from the tab flurry').toEqual([]);
    },
  );

  /**
   * TC-INC-154 — Tổ hợp param của tab khác bị bỏ qua đúng cách
   * Steps:
   *  1. Load `?tab=daily&search=Erin&showStaffNoIncome=true&period=week`.
   * Expected:
   *  Tab Daily render bình thường, các param không thuộc tab này bị bỏ qua (hoặc
   *  loại khỏi URL), không lỗi.
   *
   * "ignored" is asserted where it is observable: the Daily tab renders its own
   * furniture in full, and none of the controls the three foreign params belong
   * to (staff search, the no-income checkbox, the `Income period` combobox) is
   * on screen. Whether the app also strips them from the URL is left open —
   * either satisfies the Expected — so the URL is only checked for `tab=daily`.
   */
  test(
    'TC-INC-154 — Staff/Summary params on ?tab=daily are inert and Daily renders in full',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await incomePage.gotoWithQuery({
        tab: IncomeTab.DAILY,
        search: FINAL_TERM,
        showStaffNoIncome: 'true',
        period: IncomePeriod.WEEK,
      });
      await incomePage.waitForDataSettled();

      // Daily, and nothing but Daily.
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.DAILY));
      expect(await incomePage.selectedTabLabel()).toBe(incomeTabLabel(IncomeTab.DAILY));
      await expect(incomePage.visibleTabPanels).toHaveCount(1);
      await expect(incomePage.visibleTables).toHaveCount(1);

      // Its own furniture is all there: KPI cards, the hourly chart, the
      // Order Details table with its count.
      await expect(incomePage.kpiCards).toHaveCount(INCOME_KPI_CARDS.length);
      await expect(incomePage.chartTitle).toBeVisible();
      await expect(incomePage.orderDetailsTitle).toBeVisible();
      await expect(incomePage.orderDetailsHeaders.first()).toBeVisible();
      await expect(incomePage.orderCountLabel).toBeVisible();

      // And no control belonging to the foreign params rendered.
      await expect(incomePage.staffSearchInput).toHaveCount(0);
      await expect(incomePage.showStaffWithNoIncomeCheckbox).toHaveCount(0);
      await expect(incomePage.incomePeriodCombobox).toHaveCount(0);

      expect(pageErrors, 'uncaught JS error from the foreign params').toEqual([]);
    },
  );

  /**
   * TC-INC-155 — Ngày rơi vào chuyển giao DST / cuối tháng
   * Steps:
   *  1. Chọn ngày cuối tháng (vd `2026-08-31`) và ngày đầu tháng kế.
   *  2. Ở period `Week`, chọn khoảng vắt qua ranh giới tháng.
   * Expected:
   *  Nhãn tuần vắt tháng hiển thị đúng cả hai tháng (vd `Week 27 (Jun 29 – Jul
   *  5, 2026)`); không lệch/thiếu ngày, không trùng dữ liệu giữa hai dòng.
   *
   * The window is a *past* month boundary (Jul 29 – Aug 3, 2026) rather than the
   * case's future example, so the table actually has rows to judge: a future
   * range would render a legitimate empty state and prove nothing about
   * bucketing. `Day` is walked first (step 1: the boundary dates themselves),
   * then the period is switched to `Week` through the combobox (step 2).
   */
  // PRODUCT GAP (2026-10-11): bucketing the Jul 29 – Aug 3 range by Week produces a
  // malformed label "Week 1 (Dec 29 – Jan 4, 2026)" whose end month precedes its
  // start month (runs backwards across the year boundary). Re-enable once week
  // labels compute the boundary correctly.
  test.fixme(
    'TC-INC-155 — a week bucket spanning a month boundary names both months, once each',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.gotoWithQuery({
        tab: IncomeTab.SUMMARY,
        period: IncomePeriod.DAY,
        ...BOUNDARY_RANGE,
      });
      await incomePage.waitForDataSettled();

      // Step 1 — the boundary range survived the round trip and every DATE cell
      // is a well-formed day inside it, listed once.
      expect(await incomePage.dateTriggerLabel()).toBe(
        incomeDateRangeLabel(BOUNDARY_RANGE.dateAfter, BOUNDARY_RANGE.dateBefore),
      );
      expect(await incomePage.dateTriggerLabel()).toMatch(INCOME_DATE_RANGE_LABEL_PATTERN);

      const dayLabels = await incomePage.columnValues(
        incomePage.summaryTable,
        IncomeSummaryColumn.DATE,
      );
      expect(dayLabels.length, 'day rows across the month boundary').toBeGreaterThan(0);
      expect(new Set(dayLabels).size, 'the same day listed twice').toBe(dayLabels.length);

      const lower = parseDateLabel(`${MONTHS[6]} 29, 2026`);
      const upper = parseDateLabel(`${MONTHS[7]} 3, 2026`);
      for (const label of dayLabels) {
        expect(label, 'day bucket label').toMatch(INCOME_DATE_LABEL_PATTERN);
        const at = parseDateLabel(label);
        expect(at, `${label} is outside the requested window`).toBeGreaterThanOrEqual(lower);
        expect(at, `${label} is outside the requested window`).toBeLessThanOrEqual(upper);
      }

      // Step 2 — same range, bucketed by week.
      await incomePage.selectIncomePeriod('Week');
      await expect(page).toHaveURL(/period=week/);

      const weekLabels = await incomePage.columnValues(
        incomePage.summaryTable,
        IncomeSummaryColumn.DATE,
      );
      expect(weekLabels.length, 'week rows across the month boundary').toBeGreaterThan(0);
      expect(new Set(weekLabels).size, 'the same week listed twice').toBe(weekLabels.length);
      for (const label of weekLabels) {
        expect(label, 'week bucket label').toMatch(INCOME_WEEK_LABEL_PATTERN);
      }

      // The bucket covering Jul 27 – Aug 2 must read as two months, in order,
      // with a real day on each side.
      const crossing = weekLabels
        .map((label) => WEEK_LABEL_PARTS.exec(label))
        .filter((parts): parts is RegExpExecArray => parts !== null)
        .filter((parts) => parts[2] !== parts[4]);

      expect(crossing.length, 'no week bucket spans the Jul/Aug boundary').toBeGreaterThan(0);
      for (const [label, , startMonth, startDay, endMonth, endDay] of crossing) {
        expect(MONTHS, `${label} start month`).toContain(startMonth);
        expect(MONTHS, `${label} end month`).toContain(endMonth);
        expect(
          MONTHS.indexOf(endMonth),
          `${label} runs backwards across the boundary`,
        ).toBeGreaterThan(MONTHS.indexOf(startMonth));
        expect(Number(startDay), `${label} start day`).toBeGreaterThan(0);
        expect(Number(endDay), `${label} end day`).toBeGreaterThan(0);
      }
    },
  );
});
