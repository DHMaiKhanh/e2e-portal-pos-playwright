import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_CALENDAR_CAPTION_PATTERN,
  INCOME_DATE_LABEL_PATTERN,
  INCOME_KPI_CARDS,
  INCOME_URL_PATTERN,
  IncomeTab,
  incomeTabLabel,
  type IncomePage,
} from '@pages/income/IncomePage';

/* ------------------------------------------------------------------------- *
 * Date arithmetic
 *
 * The .md pins its examples to the scan day (`date=2026-08-18`, caption
 * `August 2026`, label `Aug 18, 2026`). Hard-coding those would rot on the
 * 22nd, so every date below is derived from "now" — in the *browser's*
 * timezone, which playwright.config sets from `TZ_ID`, not the runner's, so a
 * CI box on UTC still agrees with the app about which day "Today" is.
 * ------------------------------------------------------------------------- */

const TIME_ZONE = process.env.TZ_ID ?? 'Asia/Ho_Chi_Minh';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** The seven weekday headers the calendar renders above the grid. */
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

/** A plain calendar date. `month` is 1-based, the way `YYYY-MM-DD` reads. */
interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** Today as the browser sees it. `en-CA` renders ISO-ordered parts. */
function today(): CalendarDate {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .split('-')
    .map(Number);
  return { year, month, day };
}

/** `2026-08-18` — the `?date=` wire format. */
function isoDate(date: CalendarDate): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/**
 * `Aug 18, 2026` — the trigger label (`MMM D, YYYY`).
 *
 * Formatted off a UTC instant so the runner's own offset cannot shift the day
 * back or forward while rendering it.
 */
function dateLabel(date: CalendarDate): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
}

/** `August 2026` — the one-month calendar caption. */
function monthCaption(date: Pick<CalendarDate, 'year' | 'month'>): string {
  return `${MONTH_NAMES[date.month - 1]} ${date.year}`;
}

/** Months since year 0 — lets two captions be compared without parsing dates. */
function monthOrdinal(caption: string): number {
  const [name, year] = caption.trim().split(/\s+/);
  return Number(year) * 12 + MONTH_NAMES.indexOf(name as (typeof MONTH_NAMES)[number]);
}

function previousMonth(date: CalendarDate): CalendarDate {
  return date.month === 1
    ? { ...date, year: date.year - 1, month: 12 }
    : { ...date, month: date.month - 1 };
}

function nextMonth(date: CalendarDate): CalendarDate {
  return date.month === 12
    ? { ...date, year: date.year + 1, month: 1 }
    : { ...date, month: date.month + 1 };
}

/**
 * Day 18, but only while day 18 is already in the past.
 *
 * The .md says "day 18 of the current month" because it was scanned on the
 * 21st. Run it on the 5th and day 18 is a *future* day — which the picker may
 * disable, and whose data the case says nothing about. Earlier in the month the
 * target therefore rolls back to day 18 of the previous month; the tests reach
 * it through {@link showMonth} rather than assuming zero month-nav clicks.
 */
function pastDayTarget(now = today()): CalendarDate {
  return now.day > 18 ? { ...now, day: 18 } : { ...previousMonth(now), day: 18 };
}

/**
 * A past day whose month the calendar is expected to open on — the deep-link
 * TC-INC-030 starts from. On the 1st there is no earlier day in this month, so
 * it falls back to the previous one.
 */
function dayBeforeToday(now = today()): CalendarDate {
  return now.day > 1 ? { ...now, day: now.day - 1 } : { ...previousMonth(now), day: 15 };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Step the open calendar until it displays `target`'s month.
 *
 * Which month the picker opens on depends on whether a date is already
 * selected, so walking the caption is safer than counting arrow clicks. Three
 * steps is plenty: no case here moves more than one month.
 */
async function showMonth(incomePage: IncomePage, target: CalendarDate): Promise<void> {
  const wanted = monthCaption(target);

  for (let step = 0; step < 3; step += 1) {
    const shown = ((await incomePage.calendarCaption.textContent()) ?? '').trim();
    if (shown === wanted) return;

    const button =
      monthOrdinal(wanted) < monthOrdinal(shown)
        ? incomePage.calendarPreviousMonthButton
        : incomePage.calendarNextMonthButton;
    await button.click();
    await expect(incomePage.calendarCaption).not.toHaveText(shown);
  }

  await expect(incomePage.calendarCaption).toHaveText(wanted);
}

test.describe('Tab Daily — bộ chọn ngày — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  test(
    'TC-INC-024 — trigger defaults to `Today` and the URL carries no `date`',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ incomePage, page }) => {
      await expect(page).toHaveURL(INCOME_URL_PATTERN);
      await expect(incomePage.dateTrigger).toBeVisible();
      await expect(incomePage.dateTrigger).toBeEnabled();

      // The default is the relative label, not today's absolute date.
      await expect(incomePage.dateTrigger).toHaveText('Today');
      expect(incomePage.hasParam('date'), '`date` stays off the URL until a day is picked').toBe(
        false,
      );
    },
  );

  test(
    'TC-INC-025 — clicking the trigger opens a one-month calendar popover',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.openDatePicker();

      await expect(incomePage.dateTrigger).toHaveAttribute('aria-expanded', 'true');

      const caption = await incomePage.calendarCaption.textContent();
      expect((caption ?? '').trim(), 'calendar caption reads `<Month> <YYYY>`').toMatch(
        INCOME_CALENDAR_CAPTION_PATTERN,
      );
      await expect(incomePage.calendarCaption).toHaveText(monthCaption(today()));

      for (const weekday of WEEKDAYS) {
        await expect(
          incomePage.calendarPopover.getByText(weekday, { exact: true }).first(),
          `weekday header "${weekday}"`,
        ).toBeVisible();
      }

      // One month only — a range calendar would also render the next month.
      await expect(
        incomePage.calendarPopover.getByText(monthCaption(nextMonth(today())), { exact: true }),
        'the popover shows a single month',
      ).toHaveCount(0);
    },
  );

  test(
    'TC-INC-026 — picking a past day writes `date=` and reloads the day',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const target = pastDayTarget();

      await incomePage.openDatePicker();
      await showMonth(incomePage, target);
      await incomePage.calendarDay(target.day).click();

      await expect(page).toHaveURL(new RegExp(`[?&]date=${isoDate(target)}(?:&|$)`));
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.DAILY));
      await expect(incomePage.dateTrigger).toHaveText(dateLabel(target));

      // Chart, KPI cards and the Order Details table all re-read the new day.
      await incomePage.waitForDataSettled();
      await expect(incomePage.chartTitle).toHaveText(/ by Hour$/);
      await expect(incomePage.kpiCards).toHaveCount(INCOME_KPI_CARDS.length);
      await expect(incomePage.orderDetailsTitle).toBeVisible();
      await expect(incomePage.orderCountLabel).toBeVisible();
    },
  );

  test(
    'TC-INC-027 — deep-linked `date=` renders as `MMM D, YYYY`, not `Today`',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      const target = pastDayTarget();
      await incomePage.gotoWithQuery({ tab: IncomeTab.DAILY, date: isoDate(target) });

      const label = await incomePage.dateTriggerLabel();
      expect(label, 'trigger label format').toMatch(INCOME_DATE_LABEL_PATTERN);
      expect(label, 'trigger label spells out the deep-linked day').toBe(dateLabel(target));
      expect(label, 'a specific day is never labelled `Today`').not.toBe('Today');
    },
  );

  test(
    'TC-INC-028 — Escape closes the calendar, keeps the date and restores focus',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      const before = await incomePage.dateTriggerLabel();

      await incomePage.openDatePicker();
      // closeDatePicker() presses Escape and waits for the popover to go away.
      await incomePage.closeDatePicker();

      await expect(incomePage.dateTrigger).toBeFocused();
      expect(await incomePage.dateTriggerLabel(), 'the selected day is unchanged').toBe(before);
      expect(incomePage.hasParam('date'), 'Escape must not commit a date').toBe(false);
    },
  );

  test(
    'TC-INC-029 — previous-month navigation then a pick lands in that month',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const now = today();
      const previous = previousMonth(now);
      // Day 15 exists in every month and is always in the past once the
      // calendar has stepped back one month.
      const target: CalendarDate = { ...previous, day: 15 };

      await incomePage.openDatePicker();
      await expect(incomePage.calendarCaption).toHaveText(monthCaption(now));

      await incomePage.calendarPreviousMonthButton.click();
      await expect(incomePage.calendarCaption).toHaveText(monthCaption(previous));

      await incomePage.calendarDay(target.day).click();

      await expect(page).toHaveURL(new RegExp(`[?&]date=${isoDate(target)}(?:&|$)`));
      await expect(incomePage.dateTrigger).toHaveText(dateLabel(target));

      await incomePage.waitForDataSettled();
      await expect(incomePage.orderDetailsTitle).toBeVisible();
    },
  );

  test(
    'TC-INC-030 — picking today from a past date restores the `Today` label',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      const now = today();
      const preset = dayBeforeToday(now);

      await incomePage.gotoWithQuery({ tab: IncomeTab.DAILY, date: isoDate(preset) });
      await incomePage.waitForDataSettled();
      expect(await incomePage.dateTriggerLabel(), 'starts on the deep-linked day').toBe(
        dateLabel(preset),
      );

      await incomePage.openDatePicker();
      await showMonth(incomePage, now);
      await incomePage.calendarDay(now.day).click();

      // The case accepts either the relative label or today's absolute date,
      // as long as it is one consistent format.
      await expect(incomePage.dateTrigger).toHaveText(
        new RegExp(`^(?:Today|${escapeRegExp(dateLabel(now))})$`),
      );

      await incomePage.waitForDataSettled();
      const dateParam = incomePage.param('date');
      expect(
        dateParam === '' || dateParam === isoDate(now),
        `data is today's: date= is cleared or set to ${isoDate(now)}, got "${dateParam}"`,
      ).toBe(true);
    },
  );

  test(
    'TC-INC-031 — an unparseable `date=` falls back to today and still renders',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: IncomeTab.DAILY, date: 'not-a-date' });

      // No blank page and no stuck skeleton: waitForDataSettled() fails on
      // either (skeletons gone AND the results footer rendered).
      await incomePage.waitForDataSettled();
      await expect(incomePage.pageTitle).toBeVisible();
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.DAILY));

      // The junk value is discarded rather than applied — the trigger is back
      // on `Today`. That is asserted through the label instead of the raw query
      // string: the label is what proves the filter was dropped, and a build
      // that leaves the typed param in the address bar while ignoring it still
      // satisfies the case.
      await expect(incomePage.dateTrigger).toHaveText('Today');
      await expect(incomePage.kpiCards).toHaveCount(INCOME_KPI_CARDS.length);
      await expect(incomePage.orderDetailsTitle).toBeVisible();
    },
  );

  /**
   * Steps:
   *   1. Load `?tab=daily&date=<hôm nay + 30 ngày>`.
   *
   * Expected:
   *   Ứng dụng xử lý xác định — hoặc chặn/kẹp về hôm nay, hoặc hiển thị báo
   *   cáo rỗng có empty state rõ ràng; không được lỗi JS hay treo loading.
   *   *(Cần xác nhận hành vi mong muốn với team.)*
   */
  // TODO(manual/setup): the Expected itself defers to the team — clamp to today
  // vs. render an empty report are mutually exclusive outcomes, and asserting
  // either one would lock in behaviour nobody has agreed to yet. docs/test-
  // cases/income.md repeats this under its open questions. Unfixme once the
  // product decision lands, then assert that one branch.
  test.fixme(
    'TC-INC-032 — a future `date=` is handled deterministically',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      const now = today();
      const future = new Date(Date.UTC(now.year, now.month - 1, now.day + 30));
      await incomePage.gotoWithQuery({
        tab: IncomeTab.DAILY,
        date: isoDate({
          year: future.getUTCFullYear(),
          month: future.getUTCMonth() + 1,
          day: future.getUTCDate(),
        }),
      });
    },
  );

  test(
    'TC-INC-033 — a date with no data reports zeros and empty states',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      // Fixed on purpose: 2020-01-01 predates the store, so "no data" is a
      // property of the date, not of today's live figures.
      const emptyDay: CalendarDate = { year: 2020, month: 1, day: 1 };
      await incomePage.gotoWithQuery({ tab: IncomeTab.DAILY, date: isoDate(emptyDay) });
      await incomePage.waitForDataSettled();

      expect(await incomePage.dateTriggerLabel()).toBe(dateLabel(emptyDay));

      // Footer: `Showing 0 to 0 of 0 results`.
      expect(await incomePage.resultsRange(), 'results footer counts').toEqual([0, 0, 0]);

      // Order Details holds no data rows — DataTable.rows already excludes the
      // empty-state placeholder row and skeleton rows.
      expect(await incomePage.orderDetailsTable.rowCount(), 'Order Details rows').toBe(0);

      for (const card of INCOME_KPI_CARDS) {
        const text = ((await incomePage.kpiCard(card.label).innerText()) ?? '')
          .replace(/\s+/g, ' ')
          .trim();
        // Money cards read `$0.00`; the count card reads a bare `0`.
        expect(text, `${card.label} card on a day with no data`).toMatch(
          card.stat === 'totalOrders' ? /(?:^|\s)0(?:\s|$)/ : /\$0\.00/,
        );
      }

      // The chart collapses to its empty state. The exact copy is only
      // documented for the Tip series ("No total tip recorded for this day
      // yet."), so accept either the message or a plot area rendered with no
      // series rather than inventing a string for the other three.
      await expect(incomePage.chartEmptyState.or(incomePage.chartRegion)).toBeVisible();
    },
  );

  test(
    'TC-INC-034 — the Daily tab exposes no `Clear filters` button',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ tab: IncomeTab.DAILY, date: isoDate(pastDayTarget()) });
      await incomePage.waitForDataSettled();

      // The Summary and Staff panels stay mounted and each owns a hidden
      // `Clear filters`, so the locator is visibility-filtered — count 0 means
      // none is offered on Daily, even with a non-default date applied.
      await expect(incomePage.clearFiltersButton, 'no visible Clear filters on Daily').toHaveCount(
        0,
      );
    },
  );
});
