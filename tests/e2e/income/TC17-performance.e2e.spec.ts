import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Timeouts } from '@configs/constants/timeouts';
import { Urls } from '@constants/urls';
import {
  INCOME_DATE_RANGE_LABEL_PATTERN,
  INCOME_RESULTS_FOOTER_PATTERN,
  INCOME_STAFF_PAGE_SIZE,
  IncomePeriod,
  IncomeTab,
  incomeDateRangeLabel,
  incomeIsoDateFromToday,
  incomeTabUrlPattern,
} from '@pages/income/IncomePage';

/**
 * Hiệu năng (Performance) — Income Reports.
 *
 * These are DEV-environment budgets, not production SLAs: the remote DEV Portal
 * is the bottleneck (see the worker-saturation note in playwright.config.ts), so
 * every timing assertion runs against the MEDIAN of repeated samples and the raw
 * samples are attached as a `measurement` annotation — a regression stays
 * legible even while the assertion passes.
 *
 * Ground rules for this file:
 *  - Nothing here writes: every case is a read (navigation, tab switch, paging,
 *    typing in the search box). No state is seeded and none is mutated.
 *  - Figures are never asserted; only shapes, counts and *relationships* are —
 *    the store is shared and its data moves with the clock.
 *  - `waitForLoadState('networkidle')` is useless on this screen, so every wait
 *    is an `expect(locator)` or the Page Object's `waitForDataSettled()`
 *    (skeletons gone + pagination footer rendered).
 *
 * Cache caveat: the `reuseContext` fixture shares one BrowserContext per worker
 * and the convention's `beforeEach` has already loaded the screen once, so the
 * load samples below are WARM. They therefore read lower than a cold first hit;
 * the annotations list every sample so a cold-vs-warm gap stays visible.
 */

/** The day the screen scan recorded as data-bearing — chart, table and KPIs all populated. */
const DATA_BEARING_DATE = '2026-08-18';

/** `?tab=daily&date=<data-bearing day>` — the exact target TC-INC-176 times. */
const DAILY_URL = `${Urls.INCOME}?tab=${IncomeTab.DAILY}&date=${DATA_BEARING_DATE}`;

/** The doc's recommendation for a first paint on DEV. Recorded, not enforced (see TC-INC-176). */
const FIRST_LOAD_RECOMMENDATION_MS = 5_000;

/** How long the loading-indicator phase of TC-INC-176 holds the data requests. */
const STALL_MS = 1_200;

/**
 * Caps for one tab switch. A tab that fetched "everything" would blow the
 * request cap; a duplicate burst would blow the repeat cap. Both are deliberately
 * generous — the failure mode the case describes is a storm, not a request or two.
 */
const MAX_REQUESTS_PER_TAB = 12;
const MAX_SAME_URL_PER_TAB = 2;
const MAX_ENDPOINTS_PER_TAB = 6;

/** Budget for one Staff page hop (median). The hard ceiling stays `Timeouts.LONG`. */
const PAGE_HOP_BUDGET_MS = 10_000;

/** Exactly ten keystrokes, as TC-INC-179 specifies. */
const SEARCH_TERM = 'Alexandria';

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const formatSamples = (samples: number[]): string => samples.map((ms) => `${ms}ms`).join(', ');

/** How many times the single most-repeated URL appears — the duplicate-burst signal. */
const maxRepeat = (urls: string[]): number => {
  const counts = new Map<string, number>();
  for (const url of urls) counts.set(url, (counts.get(url) ?? 0) + 1);
  return urls.length === 0 ? 0 : Math.max(...counts.values());
};

/** Distinct endpoint paths (query stripped) — "how many APIs did this tab touch". */
const endpointsOf = (urls: string[]): string[] => [
  ...new Set(
    urls.map((url) => {
      try {
        return new URL(url).pathname;
      } catch {
        return url;
      }
    }),
  ),
];

test.describe('Hiệu năng — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  /**
   * TC-INC-176 — Thời gian load lần đầu ở mức chấp nhận được
   * Steps:
   *  1. Đo từ lúc điều hướng tới khi biểu đồ + bảng + KPI đều hiển thị (tab
   *     Daily, ngày có dữ liệu).
   * Expected:
   *  Hoàn tất trong ngưỡng của dự án (khuyến nghị ≤ 5s trên DEV); không có giai
   *  đoạn nào đứng im quá lâu mà không có loading indicator.
   *
   * Two phases, because the Expected has two halves.
   *
   * Phase 1 is the stopwatch: three unrouted loads of the data-bearing day, each
   * timed to the moment ALL THREE surfaces the case names are up (KPI cards +
   * chart + Order Details table). The Expected sets the 5 s figure as a
   * recommendation ("khuyến nghị"), not a project threshold, so the tracked
   * signal is the annotation and the hard line is the suite's own ceiling
   * (`Timeouts.LONG`) — tighten `FIRST_LOAD_RECOMMENDATION_MS` into the
   * assertion once DEV can hold it.
   *
   * Phase 2 is "never silent": the initial data requests are held for
   * `STALL_MS` so the pending state is observable at all (catching it on a live
   * load would be a race), and the screen has to answer that wait with its
   * skeletons — then clear them once the data lands.
   */
  test(
    'TC-INC-176 — first load paints KPIs, chart and table, and never waits silently',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      test.slow(); // four full loads of the Daily tab against remote DEV.

      const samples: number[] = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        const started = Date.now();
        await page.goto(DAILY_URL, { waitUntil: 'domcontentloaded' });
        // A dropped route chunk is a known DEV defect, not this case's subject;
        // recovering costs time, so such a sample is discarded below.
        const recovered = await incomePage.recoverIfUnavailable();

        await expect(incomePage.kpiCards.first()).toBeVisible({ timeout: Timeouts.LONG });
        await expect(incomePage.chartRegion).toBeVisible({ timeout: Timeouts.LONG });
        await expect(incomePage.orderDetailsHeaders.first()).toBeVisible({
          timeout: Timeouts.LONG,
        });

        if (!recovered) samples.push(Date.now() - started);
      }

      expect(samples.length, 'at least one load completed without a chunk failure').toBeGreaterThan(
        0,
      );
      const measured = median(samples);
      test.info().annotations.push({
        type: 'measurement',
        description: `goto → KPI + chart + table (warm cache): ${formatSamples(samples)} → median ${measured}ms (doc recommendation ${FIRST_LOAD_RECOMMENDATION_MS}ms; ceiling ${Timeouts.LONG}ms)`,
      });
      expect(measured, `samples: ${formatSamples(samples)}`).toBeLessThanOrEqual(Timeouts.LONG);

      // The screen is usable the moment it paints — no dead first render.
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.DAILY));
      await incomePage.waitForDataSettled();
      await expect(incomePage.dateTrigger).toBeEnabled();

      // Phase 2 — hold the first data requests so the wait is long enough to
      // observe, then prove the screen fills it with a loading indicator.
      let stallsLeft = 6;
      await page.route('**/*', async (route) => {
        const type = route.request().resourceType();
        if (stallsLeft > 0 && (type === 'xhr' || type === 'fetch')) {
          stallsLeft -= 1;
          await new Promise<void>((resolve) => {
            setTimeout(resolve, STALL_MS);
          });
        }
        await route.continue();
      });

      try {
        // `commit` returns as soon as navigation starts, so the skeletons are
        // not already gone by the time the assertion begins waiting.
        await page.goto(DAILY_URL, { waitUntil: 'commit' });
        await expect(
          incomePage.skeletons.first(),
          'a loading indicator covers the wait for data',
        ).toBeVisible({ timeout: Timeouts.MEDIUM });
      } finally {
        stallsLeft = 0;
        await page.unroute('**/*');
      }

      // …and the indicator gives way to real content rather than lingering.
      await incomePage.waitForDataSettled();
      await expect(incomePage.skeletons).toHaveCount(0);
      await expect(incomePage.kpiCards).toHaveCount(4);
      await expect(incomePage.chartRegion).toBeVisible();
      await expect(incomePage.orderDetailsHeaders.first()).toBeVisible();
    },
  );

  /**
   * TC-INC-177 — Chuyển tab không gọi lại toàn bộ dữ liệu không cần thiết
   * Steps:
   *  1. Ghi lại network.
   *  2. Chuyển Daily → Summary → Staff → Daily.
   * Expected:
   *  Mỗi tab chỉ gọi API của nó; quay lại tab cũ với cùng filter không tạo ra
   *  loạt request trùng lặp bất thường.
   *
   * `captureDataRequests()` keeps only xhr/fetch, so assets cannot inflate the
   * tally. Each leg of the walk is measured on its own by slicing the shared
   * array, with a short settle so a late request still lands in its own leg.
   *
   * The assertions are the three shapes the Expected describes, and none of them
   * is a fixed figure: a leg touches only a handful of endpoints ("only its own
   * API"), no single URL is fetched more than twice ("no duplicate burst"), and
   * the return to Daily under unchanged filters obeys the same caps as a first
   * visit. A leg legitimately issuing ZERO requests is a pass — that is a cache
   * hit, the best possible outcome for this case.
   */
  test(
    'TC-INC-177 — each tab switch fetches only its own data, without duplicate bursts',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      test.slow(); // four tab loads plus per-leg settle waits.
      await incomePage.waitForDataSettled();

      const requests = incomePage.captureDataRequests();
      const legs: Array<{ name: string; urls: string[] }> = [];

      const walk = [
        { name: 'Daily → Summary', tab: IncomeTab.SUMMARY },
        { name: 'Summary → Staff', tab: IncomeTab.STAFF },
        { name: 'Staff → Daily (same filters)', tab: IncomeTab.DAILY },
      ];

      for (const { name, tab } of walk) {
        const before = requests.length;
        await incomePage.openTab(tab);
        await expect(page).toHaveURL(incomeTabUrlPattern(tab));
        // Let a trailing request land inside the leg that caused it.
        await page.waitForTimeout(1_500);
        legs.push({ name, urls: requests.slice(before) });
      }

      test.info().annotations.push({
        type: 'measurement',
        description: legs
          .map(
            (leg) =>
              `${leg.name}: ${leg.urls.length} data requests / ${endpointsOf(leg.urls).length} endpoints (max repeat ${maxRepeat(leg.urls)})`,
          )
          .join(' | '),
      });

      for (const leg of legs) {
        const endpoints = endpointsOf(leg.urls);
        expect(leg.urls.length, `${leg.name}: total data requests`).toBeLessThanOrEqual(
          MAX_REQUESTS_PER_TAB,
        );
        expect(
          endpoints.length,
          `${leg.name}: distinct endpoints — ${endpoints.join(', ')}`,
        ).toBeLessThanOrEqual(MAX_ENDPOINTS_PER_TAB);
        expect(maxRepeat(leg.urls), `${leg.name}: repeats of a single URL`).toBeLessThanOrEqual(
          MAX_SAME_URL_PER_TAB,
        );
      }

      // The walk really ended back on a working Daily tab — not on a half-torn
      // panel that simply had nothing left to request.
      await expect(incomePage.kpiCards).toHaveCount(4);
      await expect(incomePage.orderDetailsHeaders.first()).toBeVisible();
      await expect(incomePage.resultsFooter).toHaveText(INCOME_RESULTS_FOOTER_PATTERN);
    },
  );

  /**
   * TC-INC-178 — Tập dữ liệu lớn vẫn render mượt
   * Steps:
   *  1. Tab Staff, khoảng ngày rộng + bật `Show staff with no income` (≈244 kết
   *     quả, 9 trang).
   *  2. Chuyển vài trang liên tiếp.
   * Expected:
   *  Mỗi lần chuyển trang render trong ngưỡng cho phép; không treo UI, không rò
   *  rỉ tăng dần thời gian render.
   *
   * The large set is reached the way the doc documents it: a wide range plus
   * `showStaffNoIncome=true`, which the scan measured at 70 → 244 rows. That the
   * set really is large is asserted as the case's own precondition (more rows
   * than one page holds) rather than against the literal 244, which drifts.
   *
   * "No leak" is read as the trend, not the absolute: the last hop may not cost
   * multiples of the first. "No UI freeze" is proven by the controls still
   * answering after the hops, and by every hop landing on the page it claimed.
   */
  test(
    'TC-INC-178 — paging a 200+ row Staff set stays inside budget and does not drift',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage }) => {
      test.slow(); // one wide-range load plus several page hops on remote DEV.

      await incomePage.gotoWithQuery({
        tab: IncomeTab.STAFF,
        dateAfter: incomeIsoDateFromToday(-365),
        dateBefore: incomeIsoDateFromToday(0),
        showStaffNoIncome: 'true',
      });
      await incomePage.waitForDataSettled();

      expect(
        await incomePage.isShowStaffWithNoIncomeChecked(),
        'the deep-linked toggle is on',
      ).toBe(true);

      const total = await incomePage.totalResults();
      expect(
        total,
        'precondition: the wide range + toggle yields more rows than one page holds',
      ).toBeGreaterThan(INCOME_STAFF_PAGE_SIZE);

      const [firstPage, pages] = await incomePage.pagePosition();
      expect(firstPage).toBe(1);
      expect(pages, 'the large set really paginates').toBeGreaterThanOrEqual(2);
      expect(await incomePage.staffTable.rowCount()).toBeLessThanOrEqual(INCOME_STAFF_PAGE_SIZE);

      const hops = Math.min(4, pages - 1);
      const samples: number[] = [];
      for (let hop = 0; hop < hops; hop++) {
        const started = Date.now();
        await incomePage.goToNextPage();
        await expect(incomePage.staffTable.rows.first()).toBeVisible({ timeout: Timeouts.LONG });
        samples.push(Date.now() - started);

        // Each hop landed where it said it did, with a full-but-not-overfull page.
        const [current] = await incomePage.pagePosition();
        expect(current, `hop ${hop + 1} advanced the page indicator`).toBe(hop + 2);
        const rows = await incomePage.staffTable.rowCount();
        expect(rows).toBeGreaterThan(0);
        expect(rows).toBeLessThanOrEqual(INCOME_STAFF_PAGE_SIZE);
      }

      const measured = median(samples);
      test.info().annotations.push({
        type: 'measurement',
        description: `Staff page hops over ${total} rows / ${pages} pages: ${formatSamples(samples)} → median ${measured}ms (budget ${PAGE_HOP_BUDGET_MS}ms, ceiling ${Timeouts.LONG}ms)`,
      });
      expect(measured, `samples: ${formatSamples(samples)}`).toBeLessThanOrEqual(
        PAGE_HOP_BUDGET_MS,
      );
      expect(Math.max(...samples), `samples: ${formatSamples(samples)}`).toBeLessThanOrEqual(
        Timeouts.LONG,
      );

      // No creeping render cost: the last hop must not cost multiples of the first.
      if (samples.length >= 2) {
        expect(
          samples[samples.length - 1],
          `render time must not drift upward — samples: ${formatSamples(samples)}`,
        ).toBeLessThanOrEqual(samples[0] * 3 + 3_000);
      }

      // The UI is still alive after the hops: filters kept their state and the
      // controls still answer.
      expect(await incomePage.isShowStaffWithNoIncomeChecked()).toBe(true);
      await expect(incomePage.staffSearchInput).toBeEditable();
      await expect(incomePage.staffHeaders.first()).toBeVisible();
      const { previous } = await incomePage.paginationDisabled();
      expect(previous, 'Previous is live once past page 1').toBe(false);
    },
  );

  /**
   * TC-INC-179 — Gõ tìm kiếm có debounce
   * Steps:
   *  1. Ghi lại network.
   *  2. Gõ liên tục 10 ký tự vào ô tìm kiếm.
   * Expected:
   *  Số request ít hơn hẳn số lần gõ (có debounce); không bắn 1 request cho mỗi
   *  ký tự.
   *
   * `typeStaffSearch()` presses the ten keys WITHOUT waiting for the debounce —
   * that separation is the whole point, so the settle wait
   * (`waitForSearchSettled`) is a later step and the request tally is read at
   * both moments. Counting all xhr/fetch traffic rather than a guessed search
   * endpoint keeps the count honest: any per-keystroke request lands in it.
   */
  test(
    'TC-INC-179 — ten keystrokes debounce into far fewer than ten requests',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      await incomePage.gotoTab(IncomeTab.STAFF);
      await incomePage.waitForDataSettled();
      await expect(incomePage.staffSearchInput).toBeEditable();

      const requests = incomePage.captureDataRequests();
      await incomePage.typeStaffSearch(SEARCH_TERM);
      const whileTyping = requests.length;

      await incomePage.waitForSearchSettled();
      await incomePage.waitForDataSettled();
      const afterSettle = requests.length;

      test.info().annotations.push({
        type: 'measurement',
        description: `${SEARCH_TERM.length} keystrokes → ${whileTyping} data requests while typing, ${afterSettle} once settled`,
      });

      // The literal line of the Expected: not one request per character…
      expect(whileTyping, `requests while typing ${SEARCH_TERM.length} characters`).toBeLessThan(
        SEARCH_TERM.length,
      );
      // …and "ít hơn hẳn" — even counting the debounced trailing call, the total
      // stays at half the keystrokes or under.
      expect(afterSettle, 'total requests for the whole burst').toBeLessThanOrEqual(
        Math.floor(SEARCH_TERM.length / 2),
      );

      // Debounced, not dropped: the term is in the box, on the URL, and applied.
      expect(await incomePage.staffSearchValue()).toBe(SEARCH_TERM);
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.STAFF));
      expect(incomePage.param('search')).toBe(SEARCH_TERM);
      await expect(incomePage.resultsFooter).toHaveText(INCOME_RESULTS_FOOTER_PATTERN);
    },
  );

  /**
   * TC-INC-180 — Khoảng ngày rất rộng
   * Steps:
   *  1. Tab Summary, period `Day`, chọn khoảng ~2 năm.
   * Expected:
   *  Vẫn trả về và phân trang được trong thời gian hợp lý, hoặc có thông báo giới
   *  hạn khoảng ngày rõ ràng; không treo tab trình duyệt.
   *
   * The Expected offers two acceptable outcomes, so the wait races them: either
   * the pagination footer arrives (the screen answered) or a range-limit message
   * does (the screen refused, clearly). Whichever wins decides which half of the
   * assertions runs — there is no third outcome, and neither is a spin forever.
   *
   * "The browser tab does not hang" is asserted as responsiveness AFTER the wide
   * range has rendered: the period combobox still opens and closes promptly,
   * which a blocked main thread could not do.
   */
  test(
    'TC-INC-180 — a ~2 year range either paginates or says why, and never hangs',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ incomePage, page }) => {
      test.slow(); // a two-year aggregation on remote DEV.

      const dateAfter = incomeIsoDateFromToday(-730);
      const dateBefore = incomeIsoDateFromToday(0);

      const limitMessage = page
        .getByText(/date range (?:is )?too (?:wide|large|long)|(?:maximum|max) date range/i)
        .filter({ visible: true })
        .first();

      const started = Date.now();
      await incomePage.gotoWithQuery({
        tab: IncomeTab.SUMMARY,
        period: IncomePeriod.DAY,
        dateAfter,
        dateBefore,
      });
      await expect(
        incomePage.resultsFooter.or(limitMessage).first(),
        'the wide range resolves to either data or a stated limit',
      ).toBeVisible({ timeout: Timeouts.LONG });
      const respondedMs = Date.now() - started;

      const answered = await incomePage.resultsFooter.isVisible();
      test.info().annotations.push({
        type: 'measurement',
        description: `${dateAfter} → ${dateBefore} (period=day): ${answered ? 'returned data' : 'returned a range-limit message'} in ${respondedMs}ms (ceiling ${Timeouts.LONG}ms)`,
      });

      if (answered) {
        await incomePage.waitForDataSettled();
        await expect(incomePage.incomePeriodCombobox).toHaveText(/^Day$/);
        await expect(incomePage.summaryHeaders.first()).toBeVisible();

        // The range survived the round trip — otherwise nothing wide was tested.
        if (incomePage.param('dateAfter') === dateAfter) {
          expect(await incomePage.dateTriggerLabel()).toBe(
            incomeDateRangeLabel(dateAfter, dateBefore),
          );
        } else {
          // A clamp is acceptable; the label must still read as a range.
          expect(await incomePage.dateTriggerLabel()).toMatch(INCOME_DATE_RANGE_LABEL_PATTERN);
        }

        const total = await incomePage.totalResults();
        expect(Number.isNaN(total), 'the footer reports a readable total').toBe(false);

        // …and it paginates: two years of daily buckets cannot fit one page.
        const [current, pages] = await incomePage.pagePosition();
        expect(current).toBe(1);
        expect(pages, 'a two-year daily range spans more than one page').toBeGreaterThan(1);
        await incomePage.goToNextPage();
        expect((await incomePage.pagePosition())[0]).toBe(2);
        await expect(incomePage.summaryTable.rows.first()).toBeVisible();
      } else {
        // The other acceptable outcome: a clear, readable limit message and no
        // half-rendered table left behind.
        await expect(limitMessage).toBeVisible();
        expect((await limitMessage.textContent())?.trim()).toBeTruthy();
      }

      // Not hung: the screen still answers input promptly after the wide range.
      const interactionStarted = Date.now();
      await incomePage.openIncomePeriod();
      await page.keyboard.press('Escape');
      await expect(incomePage.incomePeriodOptions.first()).toBeHidden();
      const interactionMs = Date.now() - interactionStarted;
      test.info().annotations.push({
        type: 'measurement',
        description: `combobox open+close after the wide range: ${interactionMs}ms (ceiling ${Timeouts.MEDIUM}ms)`,
      });
      expect(interactionMs, 'the main thread is not blocked').toBeLessThanOrEqual(Timeouts.MEDIUM);
    },
  );
});
