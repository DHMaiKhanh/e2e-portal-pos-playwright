import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_CALENDAR_CAPTION_PATTERN,
  INCOME_DATE_RANGE_LABEL_PATTERN,
  INCOME_MONTH_LABEL_PATTERN,
  INCOME_PERIOD_OPTIONS,
  INCOME_RESULTS_FOOTER_PATTERN,
  INCOME_WEEK_LABEL_PATTERN,
  IncomePeriod,
  IncomeSummaryColumn,
  IncomeTab,
  incomeTabUrlPattern,
} from '@pages/income/IncomePage';

/**
 * A fixed, wholly-past range used by the period-bucketing cases: 82 days that
 * span exactly three calendar months (Jun / Jul / Aug 2026). Hard-coded on
 * purpose — the *bucketing* is what is under test, so the range must not drift
 * with the clock the way `Today` does.
 */
const RANGE = { dateAfter: '2026-06-01', dateBefore: '2026-08-21' } as const;

/** The three month buckets `RANGE` can possibly produce, newest-agnostic. */
const RANGE_MONTHS = ['Jun 2026', 'Jul 2026', 'Aug 2026'];

/** A range far enough back that the dev store cannot hold a transaction in it. */
const EMPTY_RANGE = { dateAfter: '2020-01-01', dateBefore: '2020-01-31' } as const;

/**
 * The two labels the date trigger can carry while no filter is applied.
 *
 * Entering the tab defaults the range to today and reads `Today`; clearing the
 * filters drops the params altogether and the picker falls back to its
 * placeholder. Both mean "no date filter", so both satisfy a reset assertion.
 */
const DEFAULT_DATE_LABEL = /^(?:Today|Pick a date range)$/;

/**
 * `?period=` is only written to the URL once it differs from the default, so
 * "the period is Day" is either an absent param or an explicit `day`.
 */
const DEFAULT_PERIOD_PARAMS = ['', IncomePeriod.DAY];

/**
 * Tab Income Summary — the filter bar: the shared date-range trigger, the
 * `Income period` combobox (Day / Week / Month) and `Clear filters`.
 *
 * Every filter on this screen is URL state, so the query string is the primary
 * assertion surface and `gotoWithQuery()` is the way into each state. Values
 * are asserted by format and by relationship (bucket labels, row counts,
 * zero-result footers) — never against live figures, which are store-scoped
 * and move with the clock.
 */
test.describe('Tab Income Summary — bộ lọc — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  test(
    'TC-INC-078 — Summary tab opens on period Day and a Today range',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ incomePage, page }) => {
      // beforeEach landed on the Daily tab; this is the click the case describes.
      await incomePage.openTab(IncomeTab.SUMMARY);
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.SUMMARY));

      // Default period: `Day`, whether or not the app spells it out on the URL.
      expect(DEFAULT_PERIOD_PARAMS).toContain(incomePage.param('period'));
      await expect(incomePage.incomePeriodCombobox).toHaveText(/^Day$/);

      // Default range: a single day — today — surfaced as the `Today` label.
      expect(await incomePage.dateTriggerLabel()).toBe('Today');

      const dateAfter = incomePage.param('dateAfter');
      const dateBefore = incomePage.param('dateBefore');
      if (dateAfter || dateBefore) {
        // Read "today" from the browser so the store's UTC+7 clock (set as
        // `timezoneId` in playwright.config) decides the date, not the host's.
        const today = await page.evaluate(() => new Date().toLocaleDateString('en-CA'));
        expect(dateAfter, 'dateAfter defaults to today').toBe(today);
        expect(dateBefore, 'dateBefore defaults to today').toBe(today);
      }
    },
  );

  test(
    'TC-INC-079 — picking a two-ended range in one month filters the tab',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.openTab(IncomeTab.SUMMARY);

      await incomePage.openDatePicker();
      await expect(incomePage.calendarCaption).toHaveText(INCOME_CALENDAR_CAPTION_PATTERN);

      // Days 6 and 12 exist in every month and are never rendered as an
      // adjacent month's outside day, so the same two clicks work whenever the
      // suite runs. The picker is a range picker: the first click sets the
      // start and keeps the popover open for the end.
      await incomePage.calendarDay(6).click();
      await incomePage.calendarDay(12).click();
      await page.keyboard.press('Escape');
      await incomePage.waitForDataSettled();

      // Both ends are on the URL, in order, and inside the same month.
      const dateAfter = incomePage.param('dateAfter');
      const dateBefore = incomePage.param('dateBefore');
      expect(dateAfter).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dateBefore).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dateAfter.localeCompare(dateBefore)).toBeLessThanOrEqual(0);
      expect(dateAfter.slice(0, 7), 'both ends in the same month').toBe(dateBefore.slice(0, 7));

      // The trigger switches from `Today` to the `Aug 6, 2026 - Aug 12, 2026` form.
      expect(await incomePage.dateTriggerLabel()).toMatch(INCOME_DATE_RANGE_LABEL_PATTERN);

      // Chart and table re-rendered against the new range.
      await expect(incomePage.summaryHeaders.first()).toBeVisible();
      await expect(incomePage.resultsFooter).toHaveText(INCOME_RESULTS_FOOTER_PATTERN);
    },
  );

  test(
    'TC-INC-080 — Income period listbox offers exactly Day, Week, Month',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.openTab(IncomeTab.SUMMARY);
      await incomePage.openIncomePeriod();

      await expect(incomePage.incomePeriodOptions).toHaveCount(INCOME_PERIOD_OPTIONS.length);
      await expect(incomePage.incomePeriodOptions).toHaveText([...INCOME_PERIOD_OPTIONS]);

      // Exactly one option is marked selected, and it is the current period.
      const selected = page.getByRole('option', { selected: true });
      await expect(selected).toHaveCount(1);
      await expect(selected).toHaveText('Day');
    },
  );

  test(
    'TC-INC-081 — period Week buckets the DATE column into weeks',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.gotoWithQuery({ tab: 'summary', period: IncomePeriod.DAY, ...RANGE });
      await incomePage.waitForDataSettled();
      const dayRows = await incomePage.totalResults();
      expect(dayRows).toBeGreaterThan(0);

      await incomePage.selectIncomePeriod('Week');

      await expect(page).toHaveURL(/period=week/);
      await expect(incomePage.incomePeriodCombobox).toHaveText(/^Week$/);

      // Every DATE cell is now a week bucket, e.g. `Week 23 (Jun 1 – Jun 7, 2026)`.
      const labels = await incomePage.columnValues(
        incomePage.summaryTable,
        IncomeSummaryColumn.DATE,
      );
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        expect(label, 'week bucket label').toMatch(INCOME_WEEK_LABEL_PATTERN);
      }

      // Weeks group days, so the row total can only shrink — never grow.
      const weekRows = await incomePage.totalResults();
      expect(weekRows).toBeGreaterThan(0);
      expect(weekRows).toBeLessThanOrEqual(dayRows);
    },
  );

  test(
    'TC-INC-082 — period Month buckets the same range into its 3 months',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.gotoWithQuery({ tab: 'summary', period: IncomePeriod.DAY, ...RANGE });
      await incomePage.waitForDataSettled();

      await incomePage.selectIncomePeriod('Month');

      await expect(page).toHaveURL(/period=month/);
      await expect(incomePage.incomePeriodCombobox).toHaveText(/^Month$/);

      const labels = await incomePage.columnValues(
        incomePage.summaryTable,
        IncomeSummaryColumn.DATE,
      );
      // Jun 1 – Aug 21 spans three calendar months and can bucket into no more
      // than those three; asserting membership rather than a fixed count keeps
      // the case honest if a month in the range holds no transaction at all.
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.length).toBeLessThanOrEqual(RANGE_MONTHS.length);
      for (const label of labels) {
        expect(label, 'month bucket label').toMatch(INCOME_MONTH_LABEL_PATTERN);
        expect(RANGE_MONTHS, 'month inside the filtered range').toContain(label);
      }
      // No duplicate buckets — one row per month.
      expect(new Set(labels).size).toBe(labels.length);
    },
  );

  test(
    'TC-INC-083 — combobox label reflects the period on the URL',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'summary', period: IncomePeriod.MONTH, ...RANGE });
      await incomePage.waitForDataSettled();

      // Deep-linked state has to win over the `Day` default.
      await expect(incomePage.incomePeriodCombobox).toHaveText(/^Month$/);
      expect(await incomePage.incomePeriodValue()).not.toBe('Day');
    },
  );

  test(
    'TC-INC-084 — an unknown period falls back to Day',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.gotoWithQuery({ tab: 'summary', period: 'bogus' });
      await incomePage.waitForDataSettled();

      // Still on the Summary tab; the junk value is dropped or normalised away.
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.SUMMARY));
      expect(incomePage.param('period')).not.toBe('bogus');
      expect(DEFAULT_PERIOD_PARAMS).toContain(incomePage.param('period'));
      await expect(incomePage.incomePeriodCombobox).toHaveText(/^Day$/);

      // And the table still renders rather than erroring out.
      await expect(incomePage.summaryHeaders.first()).toBeVisible();
      await expect(incomePage.resultsFooter).toHaveText(INCOME_RESULTS_FOOTER_PATTERN);
    },
  );

  test(
    'TC-INC-085 — Clear filters shows once a filter is off default',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({
        tab: 'summary',
        period: IncomePeriod.DAY,
        dateAfter: '2026-08-01',
        dateBefore: '2026-08-21',
      });
      await incomePage.waitForDataSettled();

      await expect(incomePage.clearFiltersButton.first()).toBeVisible();
      await expect(incomePage.clearFiltersButton.first()).toBeEnabled();
    },
  );

  test(
    'TC-INC-086 — Clear filters resets range and period to default',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'summary', period: IncomePeriod.WEEK, ...RANGE });
      await incomePage.waitForDataSettled();
      await expect(incomePage.clearFiltersButton.first()).toBeVisible();

      await incomePage.clearFilters();

      // Period back to `Day`.
      expect(DEFAULT_PERIOD_PARAMS).toContain(incomePage.param('period'));
      await expect(incomePage.incomePeriodCombobox).toHaveText(/^Day$/);

      // The filtered range is gone — asserted as "no longer these values"
      // rather than "no params at all", because the default state itself can
      // legitimately carry today's date on the URL (see TC-INC-078).
      expect(incomePage.param('dateAfter')).not.toBe(RANGE.dateAfter);
      expect(incomePage.param('dateBefore')).not.toBe(RANGE.dateBefore);
      expect(await incomePage.dateTriggerLabel()).toMatch(DEFAULT_DATE_LABEL);

      // The app's own signal that nothing is filtered any more.
      await expect(incomePage.clearFiltersButton).toHaveCount(0);
    },
  );

  test(
    'TC-INC-087 — a range with no transactions renders a clean empty state',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: 'summary', period: IncomePeriod.DAY, ...EMPTY_RANGE });
      await incomePage.waitForDataSettled();

      // The range survived the round trip — otherwise "empty" proves nothing.
      expect(await incomePage.dateTriggerLabel()).toMatch(INCOME_DATE_RANGE_LABEL_PATTERN);

      // Table: header still up, no data rows, and the footer counts nothing.
      await expect(incomePage.summaryHeaders.first()).toBeVisible();
      await expect(incomePage.summaryTable.rows).toHaveCount(0);
      await expect(incomePage.resultsFooter).toHaveText(/showing 0 to 0 of 0 results/i);

      // Right panel keeps its placeholder: with no rows there is nothing to pick.
      await expect(incomePage.noRowSelectedTitle.first()).toBeVisible();
      await expect(incomePage.noRowSelectedHint.first()).toBeVisible();
      await expect(incomePage.selectedTableRow).toHaveCount(0);
    },
  );

  test(
    'TC-INC-088 — an inverted range resolves deterministically',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const scriptErrors: string[] = [];
      page.on('pageerror', (error) => scriptErrors.push(error.message));

      await incomePage.gotoWithQuery({
        tab: 'summary',
        dateAfter: '2026-08-21',
        dateBefore: '2026-08-01',
      });

      // Skeletons gone + footer rendered: proof the screen settled instead of
      // spinning forever on a range it cannot satisfy.
      await incomePage.waitForDataSettled();
      await expect(incomePage.resultsFooter).toHaveText(INCOME_RESULTS_FOOTER_PATTERN);

      const total = await incomePage.totalResults();
      expect(Number.isNaN(total)).toBe(false);

      const dateAfter = incomePage.param('dateAfter');
      const dateBefore = incomePage.param('dateBefore');
      if (dateAfter && dateBefore) {
        // Either handling is acceptable: the ends were swapped/clamped into
        // order, or the inverted range was kept and simply matches nothing.
        const ordered = dateAfter.localeCompare(dateBefore) <= 0;
        expect(ordered || total === 0, 'range is normalised or yields no rows').toBe(true);
      }

      // No uncaught JS. Dev drops a route chunk now and then (a known DEV
      // defect, recovered by IncomePage.recoverIfUnavailable) — that is not
      // what this case is about, so those are filtered out.
      const relevant = scriptErrors.filter(
        (message) =>
          !/dynamically imported module|Loading chunk|ChunkLoadError|module script failed|ResizeObserver/i.test(
            message,
          ),
      );
      expect(relevant, 'no uncaught page errors').toEqual([]);
    },
  );
});
