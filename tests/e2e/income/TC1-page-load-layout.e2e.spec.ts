import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_COUNT_PATTERN,
  INCOME_CURRENCY_PATTERN,
  INCOME_DAILY_COLUMNS,
  INCOME_DATE_RANGE_LABEL_PATTERN,
  INCOME_KPI_CARDS,
  INCOME_PAGE_TITLE,
  INCOME_PERCENT_BADGE_PATTERN,
  INCOME_TABS,
  IncomeStaffColumn,
  IncomeTab,
  incomeTabLabel,
  incomeTabUrlPattern,
} from '@pages/income/IncomePage';

/**
 * A verified data-bearing day on the shared dev store (full 9AM–7PM chart axis,
 * populated Order Details table, INCOME DETAIL + PAYMENT DETAIL rails). Pinned so
 * the "every region renders with content" case runs deterministically instead of
 * skipping on days the dev store happened to have no activity.
 */
const DATA_BEARING_DATE = '2026-08-18';

/**
 * Income Reports — "Tải trang & bố cục" (page load / layout).
 *
 * Runs on the reused authenticated storageState (global.setup.ts) at the default
 * 1920x1080 desktop viewport from playwright.config. Store-scoped routes are
 * matched by regex (`/\/pos\/\d+\/income/`) — never a hardcoded store id.
 *
 * Two screen facts shape the assertions below (see IncomePage's header comment):
 * the screen has NO `h1`–`h6` and NO `data-testid`, and all three tab panels
 * stay mounted at once — so page-level lookups go through the page object, which
 * filters for the visible copy.
 */
test.describe('Tải trang & bố cục — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  test(
    'TC-INC-001 — direct visit to /pos/<id>/income normalises to ?tab=daily',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ incomePage, page }) => {
      // Not bounced to the login screen — the reused session is honoured.
      await expect(page).not.toHaveURL(/\/login/);
      // The bare route self-redirects to the default tab.
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.DAILY));
      expect(incomePage.currentTab()).toBe(IncomeTab.DAILY);
      // The on-page "Income Reports" label rendered (last match — the sidebar
      // link carries the exact same text and comes first in DOM order).
      await expect(incomePage.pageTitle).toBeVisible();
      // `Daily Sale Report` is the selected tab.
      const dailyTab = incomePage.tab(incomeTabLabel(IncomeTab.DAILY));
      await expect(dailyTab).toBeVisible();
      await expect(dailyTab).toHaveAttribute('aria-selected', 'true');
    },
  );

  test(
    'TC-INC-002 — document.title is exactly "Income Reports | Portal"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      // `toHaveTitle` with a string is an exact match, which is what the case asks for.
      await expect(page).toHaveTitle(INCOME_PAGE_TITLE);
    },
  );

  test(
    'TC-INC-003 — every main region of the Daily tab renders with content',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ incomePage }) => {
      // Pinned to a verified data-bearing day so every Daily region renders with
      // content deterministically, instead of skipping on days the shared dev
      // store had no activity. The data-gated skip below is kept as a safety net.
      await incomePage.gotoWithQuery({ tab: IncomeTab.DAILY, date: DATA_BEARING_DATE });
      await incomePage.waitForDataSettled();

      // Data-gated: "every region renders WITH CONTENT" needs the store to have
      // traded on the viewed day. On an untraded day the chart, order table and
      // right rail all drop to their empty states ("No income data for this day
      // yet."), so skip softly rather than assert content that cannot exist.
      const emptyIncome = await incomePage.incomeDetailEmptyState.count();
      expect(
        emptyIncome > 0,
        'store has no income today; the Daily regions show their empty states',
      ).toBeFalsy();

      // Tab strip — all three tabs.
      await expect(incomePage.tabList).toBeVisible();
      await expect(incomePage.tabs).toHaveCount(INCOME_TABS.length);

      // Date picker trigger (label reflects the pinned day, e.g. `Aug 18, 2026`).
      await expect(incomePage.dateTrigger).toBeVisible();

      // Chart card — the title follows the `<stat> by Hour` rule.
      await expect(incomePage.chartTitle).toBeVisible();
      await expect(incomePage.chartTitle).toHaveText(/ by Hour$/);

      // `Order Details` card: title, `<N> orders` counter and the table itself.
      await expect(incomePage.orderDetailsTitle).toBeVisible();
      await expect(incomePage.orderCountLabel).toBeVisible();
      await incomePage.orderDetailsTable.waitForVisible();
      await expect(incomePage.orderDetailsHeaders).toHaveCount(INCOME_DAILY_COLUMNS.length);

      // Pagination footer.
      await expect(incomePage.resultsFooter).toBeVisible();
      await expect(incomePage.pageIndicator).toBeVisible();
      await expect(incomePage.previousPageButton).toBeVisible();
      await expect(incomePage.nextPageButton).toBeVisible();

      // Four KPI cards, each carrying a value and a comparison badge — the
      // "no region is abnormally empty" half of the expected result.
      await expect(incomePage.kpiCards).toHaveCount(INCOME_KPI_CARDS.length);
      for (const card of INCOME_KPI_CARDS) {
        await expect(incomePage.kpiCard(card.label), `${card.label} card missing`).toBeVisible();
        const value = await incomePage.kpiValue(card.label);
        expect(value, `${card.label} has no headline value`).toMatch(
          new RegExp(`${INCOME_CURRENCY_PATTERN.source}|${INCOME_COUNT_PATTERN.source}`),
        );
        expect(await incomePage.kpiPercent(card.label), `${card.label} has no % badge`).toMatch(
          INCOME_PERCENT_BADGE_PATTERN,
        );
      }

      // Right rail: both panels present and actually populated with rows.
      await expect(incomePage.incomeDetailHeading).toBeVisible();
      await expect(incomePage.paymentDetailHeading).toBeVisible();
      expect(
        (await incomePage.incomeDetailRows()).length,
        'INCOME DETAIL is empty',
      ).toBeGreaterThan(0);
      expect(
        (await incomePage.paymentDetailRows()).length,
        'PAYMENT DETAIL is empty',
      ).toBeGreaterThan(0);
    },
  );

  test(
    'TC-INC-007 — reload preserves tab, date range and search read from the URL',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.gotoWithQuery({
        tab: IncomeTab.STAFF,
        dateAfter: '2026-08-01',
        dateBefore: '2026-08-21',
        search: 'Erin',
      });
      await incomePage.waitForDataSettled();

      // Baseline: the deep link landed on the Staff tab with all filters applied.
      expect(incomePage.param('tab')).toBe(IncomeTab.STAFF);
      const dateLabelBefore = await incomePage.dateTriggerLabel();
      expect(dateLabelBefore).toMatch(INCOME_DATE_RANGE_LABEL_PATTERN);
      const urlBefore = page.url();
      // `totalResults()` reads the `X–Y of Z` pagination text, or 0 when the
      // search matches nothing (an empty result renders no pagination at all).
      const footerBefore = await incomePage.totalResults();
      const staffNamesBefore = await incomePage.columnValues(
        incomePage.staffTable,
        IncomeStaffColumn.STAFF,
      );

      await page.reload({ waitUntil: 'domcontentloaded' });
      await incomePage.recoverIfUnavailable();
      await incomePage.waitForReady();
      await incomePage.waitForDataSettled();

      // The URL is the state, so it must survive verbatim.
      await expect(page).toHaveURL(urlBefore);
      expect(incomePage.param('tab')).toBe(IncomeTab.STAFF);
      expect(incomePage.param('dateAfter')).toBe('2026-08-01');
      expect(incomePage.param('dateBefore')).toBe('2026-08-21');
      expect(incomePage.param('search')).toBe('Erin');

      // ...and the controls must be rehydrated from it.
      const staffTab = incomePage.tab(incomeTabLabel(IncomeTab.STAFF));
      await expect(staffTab).toHaveAttribute('aria-selected', 'true');
      await expect(incomePage.staffSearchInput).toHaveValue('Erin');
      expect(await incomePage.dateTriggerLabel()).toBe(dateLabelBefore);

      // Same result set: the footer totals and the STAFF column are unchanged.
      // (Compared as read — the search may legitimately match zero rows.)
      expect(await incomePage.totalResults()).toBe(footerBefore);
      expect(await incomePage.columnValues(incomePage.staffTable, IncomeStaffColumn.STAFF)).toEqual(
        staffNamesBefore,
      );
    },
  );

  /**
   * Console noise this screen is known to emit, which the case explicitly puts
   * out of scope ("bỏ qua warning đã biết/nhiễu bên thứ ba"):
   *  - resource/transport failures — these are network conditions on a shared
   *    DEV portal, not application defects, and they are what TC-INC-005 covers;
   *  - the documented intermittent route-chunk failure (income.md, anomaly 4),
   *    which `IncomePage.goto()` already recovers from and TC-INC-006 owns;
   *  - browser/devtools/framework notices nothing on the page can act on.
   * Anything else — a React render error, an unhandled rejection, a TypeError —
   * is a real regression and fails the test.
   */
  const IGNORED_CONSOLE_ERRORS =
    /favicon|Failed to load resource|net::ERR_|Failed to fetch dynamically imported module|ResizeObserver loop|React DevTools|third-party cookie|Content Security Policy|\[vite\]|\[HMR\]/i;

  test(
    'TC-INC-008 — loading all three tabs raises no application console errors',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage, page }) => {
      const errors: string[] = [];
      // Attached before the navigations below; the beforeEach load already
      // happened, so each tab is visited again with the listener in place.
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });

      for (const { value, label } of INCOME_TABS) {
        await test.step(label, async () => {
          await incomePage.gotoTab(value);
          await incomePage.waitForDataSettled();
          await expect(incomePage.tab(label)).toHaveAttribute('aria-selected', 'true');
        });
      }

      const appErrors = errors.filter((text) => !IGNORED_CONSOLE_ERRORS.test(text));
      expect(appErrors, `console errors:\n${appErrors.join('\n')}`).toEqual([]);
    },
  );
});
