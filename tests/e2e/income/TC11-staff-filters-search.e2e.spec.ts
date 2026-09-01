import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_DATE_RANGE_LABEL_PATTERN,
  INCOME_EMPTY_STATES,
  INCOME_LONG_SEARCH_TERM,
  INCOME_RESULTS_FOOTER_PATTERN,
  INCOME_SPECIAL_SEARCH_TERMS,
  INCOME_STAFF_PAGE_SIZE,
  IncomeStaffColumn,
  IncomeTab,
  incomeTabUrlPattern,
  type IncomePage,
} from '@pages/income/IncomePage';

/**
 * Tab `Staff Income` — its two own filters (`Show staff with no income`, the
 * `Search by staff name...` box) on top of the shared date range and
 * `Clear filters`.
 *
 * Three things shape how these cases are written:
 *
 * 1. Every filter is URL state (`dateAfter`, `dateBefore`, `showStaffNoIncome`,
 *    `search`, `page`), so the query string is the primary assertion surface
 *    and `gotoWithQuery()` is the cheapest way into a state.
 * 2. Search terms are cut from the store's OWN data rather than hard-coded to
 *    the `Erin` / `Kerin` pair the scan happened to see. The claim under test
 *    is "the term filters the rows by name", and a probe taken from a live row
 *    proves it without pinning a name the dev store may rename — while a
 *    hard-coded name would go quietly vacuous the day it disappears.
 * 3. Row totals are asserted as RELATIONSHIPS (superset, intersection, back to
 *    baseline), never as the `70 → 244` figures observed during the scan: the
 *    store is shared and its takings move with the clock.
 */

/**
 * A fixed, wholly-past range the dev store has transactions in — the same
 * `Aug 1 – Aug 21, 2026` window the cases name. Hard-coded on purpose: these
 * cases are about the *other* two filters, so the range must not drift the way
 * the default `Today` does.
 */
const RANGE = { dateAfter: '2026-08-01', dateBefore: '2026-08-21' } as const;

/** The Staff tab over {@link RANGE} — the starting point of nearly every case. */
const STAFF_QUERY = { tab: IncomeTab.STAFF, ...RANGE } as const;

/** Headroom for the search debounce plus the refetch behind it. */
const SETTLE_TIMEOUT = 20_000;

/**
 * The two labels the date trigger can carry while no range is applied: entering
 * the tab defaults to today (`Today`), clearing the filters drops the params
 * and falls back to the placeholder. Both mean "no date filter".
 */
const DEFAULT_DATE_LABEL = /^(?:Today|Pick a date range)$/;

/**
 * DEV drops a route chunk now and then (a known defect, recovered by
 * `IncomePage.recoverIfUnavailable`). Those errors are not what the security
 * case is looking at, so they are filtered out of its `pageerror` tally.
 */
const CHUNK_NOISE =
  /dynamically imported module|Loading chunk|ChunkLoadError|module script failed|ResizeObserver/i;

/** First word of a `STAFF` cell — the part the search box matches on. */
function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** The `STAFF` column of the page currently shown, lower-cased for matching. */
async function lowerStaffNames(incomePage: IncomePage): Promise<string[]> {
  return (await incomePage.staffNames()).map((name) => name.toLowerCase());
}

/**
 * A search probe guaranteed to match at least the row it was cut from: the
 * first name token on the current page that is at least `minLength` long.
 * '' when the page holds no usable name — the caller asserts on that.
 */
async function searchProbe(incomePage: IncomePage, minLength = 3): Promise<string> {
  const tokens = (await incomePage.staffNames()).map(firstToken);
  return tokens.find((token) => token.length >= minLength) ?? '';
}

/**
 * Rows on the visible Staff page that are entirely empty — `0` orders AND a
 * `$0.00` TOTAL INCOME. Only `Show staff with no income` can produce them, so
 * this is the row-level fingerprint of that flag.
 */
async function zeroIncomeRowCount(incomePage: IncomePage): Promise<number> {
  const orders = await incomePage.columnAmounts(incomePage.staffTable, IncomeStaffColumn.ORDERS);
  const income = await incomePage.columnAmounts(
    incomePage.staffTable,
    IncomeStaffColumn.TOTAL_INCOME,
  );
  return orders.filter((count, index) => count === 0 && income[index] === 0).length;
}

/**
 * {@link zeroIncomeRowCount} for the whole result set rather than one page.
 *
 * The table's sort order is not part of the contract, so a zero-income row can
 * legitimately sit off page 1; when it does, the last page is where the tail
 * is. Checking both ends covers ascending, descending and by-name orderings.
 */
async function zeroIncomeRowsAnywhere(
  incomePage: IncomePage,
  query: Record<string, string>,
): Promise<number> {
  const onFirstPage = await zeroIncomeRowCount(incomePage);
  if (onFirstPage > 0) return onFirstPage;

  const [, totalPages] = await incomePage.pagePosition();
  if (!Number.isFinite(totalPages) || totalPages <= 1) return onFirstPage;

  await incomePage.gotoWithQuery({ ...query, page: String(totalPages) });
  await incomePage.waitForDataSettled();
  return zeroIncomeRowCount(incomePage);
}

test.describe('Tab Staff Income — bộ lọc & tìm kiếm — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  test(
    'TC-INC-106 — Staff tab opens on Today with both filters idle',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ incomePage, page }) => {
      // beforeEach landed on the Daily tab; this is the click the case describes.
      await incomePage.openTab(IncomeTab.STAFF);
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.STAFF));

      // The range defaults to a single day — today — surfaced as `Today`.
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

      // Neither of the tab's own filters is engaged.
      await expect(incomePage.showStaffWithNoIncomeCheckbox).toBeVisible();
      expect(await incomePage.ariaChecked(incomePage.showStaffWithNoIncomeCheckbox)).toBe('false');
      await expect(incomePage.staffSearchInput).toBeVisible();
      await expect(incomePage.staffSearchInput).toHaveValue('');
      expect(incomePage.hasParam('search'), 'no search on the URL yet').toBe(false);
    },
  );

  test(
    'TC-INC-107 — Show staff with no income widens the result set',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();
      const withIncomeOnly = await incomePage.totalResults();
      expect(withIncomeOnly, 'the range holds earning staff to begin with').toBeGreaterThan(0);

      await incomePage.toggleShowStaffWithNoIncome();

      await page.waitForURL(/showStaffNoIncome=true/, { timeout: SETTLE_TIMEOUT });
      expect(await incomePage.ariaChecked(incomePage.showStaffWithNoIncomeCheckbox)).toBe('true');
      await incomePage.waitForDataSettled();

      // Strictly a superset: the flag ADDS the staff who earned nothing and can
      // never drop one. Polling doubles as the wait for the refetch.
      await expect
        .poll(() => incomePage.totalResults(), { timeout: SETTLE_TIMEOUT })
        .toBeGreaterThan(withIncomeOnly);

      // And the rows it added are the all-zero ones.
      const zeros = await zeroIncomeRowsAnywhere(incomePage, {
        ...STAFF_QUERY,
        showStaffNoIncome: 'true',
      });
      expect(zeros, 'at least one 0-order / $0.00 row is now listed').toBeGreaterThan(0);
    },
  );

  test(
    'TC-INC-108 — unticking the checkbox restores the earlier set',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();
      const baseline = await incomePage.totalResults();
      expect(baseline).toBeGreaterThan(0);

      await incomePage.setShowStaffWithNoIncome(true);
      await page.waitForURL(/showStaffNoIncome=true/, { timeout: SETTLE_TIMEOUT });
      await incomePage.waitForDataSettled();
      await expect
        .poll(() => incomePage.totalResults(), { timeout: SETTLE_TIMEOUT })
        .toBeGreaterThan(baseline);

      await incomePage.setShowStaffWithNoIncome(false);

      // A predicate rather than a regex, so a lingering `=false` fails as the
      // assertion below instead of as an opaque waitForURL timeout.
      await page.waitForURL((url) => url.searchParams.get('showStaffNoIncome') !== 'true', {
        timeout: SETTLE_TIMEOUT,
      });
      expect(incomePage.hasParam('showStaffNoIncome'), 'param dropped, not set false').toBe(false);
      expect(await incomePage.ariaChecked(incomePage.showStaffWithNoIncomeCheckbox)).toBe('false');
      await incomePage.waitForDataSettled();

      // Back to exactly the set the tab started with ...
      await expect
        .poll(() => incomePage.totalResults(), { timeout: SETTLE_TIMEOUT })
        .toBe(baseline);
      // ... and the rows only the flag can produce are gone with it.
      expect(await zeroIncomeRowCount(incomePage), 'no all-zero row left').toBe(0);
    },
  );

  test(
    'TC-INC-109 — deep-linked showStaffNoIncome=true loads ticked',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ ...STAFF_QUERY, showStaffNoIncome: 'true' });
      await incomePage.waitForDataSettled();

      // Ticked on first paint — no click involved.
      expect(await incomePage.ariaChecked(incomePage.showStaffWithNoIncomeCheckbox)).toBe('true');
      const withNoIncome = await incomePage.totalResults();
      expect(withNoIncome).toBeGreaterThan(0);

      // "The table already includes them" is only provable against the same
      // range WITHOUT the flag: the deep-linked set has to be the bigger one.
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();
      expect(withNoIncome).toBeGreaterThan(await incomePage.totalResults());
    },
  );

  test(
    'TC-INC-110 — searching a name filters the table, URL and footer',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();
      const unfiltered = await incomePage.totalResults();
      expect(unfiltered).toBeGreaterThan(0);

      const probe = await searchProbe(incomePage);
      expect(probe, 'the range lists at least one named staff row').not.toBe('');

      await incomePage.searchStaff(probe);
      await incomePage.waitForDataSettled();

      expect(incomePage.param('search')).toBe(probe);

      // Every surviving row carries the term in its name.
      const names = await lowerStaffNames(incomePage);
      expect(names.length, 'the probe came from a real row, so it must match').toBeGreaterThan(0);
      for (const name of names) {
        expect(name, `row matches "${probe}"`).toContain(probe.toLowerCase());
      }

      // And the footer counts exactly what the table is showing.
      const [from, to, total] = await incomePage.resultsRange();
      expect(total).toBeGreaterThan(0);
      expect(total, 'a filter can only narrow').toBeLessThanOrEqual(unfiltered);
      expect(from).toBe(1);
      expect(to).toBe(Math.min(total, INCOME_STAFF_PAGE_SIZE));
      expect(names, 'the rendered rows match the footer window').toHaveLength(to - from + 1);
    },
  );

  test(
    'TC-INC-111 — search matches a substring anywhere in the name',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ ...STAFF_QUERY, showStaffNoIncome: 'true' });
      await incomePage.waitForDataSettled();

      // A probe cut from the MIDDLE of a real name (`Erin` out of `Kerin`, in
      // the scan's terms): if the row still comes back, matching cannot be
      // anchored to the start of the name. The candidate is also required not
      // to start with its own inner slice, so the proof cannot be accidental.
      const names = await incomePage.staffNames();
      const target = names.find((name) => {
        const token = firstToken(name);
        return (
          token.length >= 5 && !token.toLowerCase().startsWith(token.slice(1, 5).toLowerCase())
        );
      });
      expect(target, 'a staff name long enough to cut an inner probe from').toBeTruthy();
      const inner = firstToken(target ?? '').slice(1, 5);

      await incomePage.searchStaff(inner);
      await incomePage.waitForDataSettled();

      const matched = await lowerStaffNames(incomePage);
      expect(matched.length).toBeGreaterThan(0);
      for (const name of matched) {
        expect(name, `row contains "${inner}"`).toContain(inner.toLowerCase());
      }
      // At least one hit does not START with the probe — substring matching.
      expect(
        matched.some((name) => !name.startsWith(inner.toLowerCase())),
        'a hit that does not start with the term',
      ).toBe(true);

      // The row the probe was cut from is itself back, whenever the whole
      // filtered set fits on the page being read.
      const total = await incomePage.totalResults();
      if (total <= INCOME_STAFF_PAGE_SIZE) {
        expect(matched).toContain((target ?? '').toLowerCase());
      }
    },
  );

  test(
    'TC-INC-112 — search is case-insensitive',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const probe = await searchProbe(incomePage, 4);
      expect(probe, 'the range lists a name long enough to probe with').not.toBe('');

      const resultsFor = async (term: string): Promise<string[]> => {
        await incomePage.searchStaff(term);
        await incomePage.waitForDataSettled();
        return (await lowerStaffNames(incomePage)).sort();
      };

      const asTyped = await resultsFor(probe);
      const lower = await resultsFor(probe.toLowerCase());
      const upper = await resultsFor(probe.toUpperCase());

      expect(asTyped.length, 'the probe matches its own row').toBeGreaterThan(0);
      expect(lower, `"${probe.toLowerCase()}" matches the same rows`).toEqual(asTyped);
      expect(upper, `"${probe.toUpperCase()}" matches the same rows`).toEqual(asTyped);
    },
  );

  test(
    'TC-INC-113 — a term nothing matches renders the empty state',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();

      await incomePage.searchStaff('zzzznotexist');
      await incomePage.waitForDataSettled();

      await expect(incomePage.staffEmptyState.first()).toBeVisible();
      await expect(incomePage.staffEmptyState.first()).toHaveText(
        INCOME_EMPTY_STATES.NO_STAFF_INCOME,
      );
      await expect(incomePage.staffTable.rows).toHaveCount(0);
      await expect(incomePage.resultsFooter).toHaveText(/showing 0 to 0 of 0 results/i);

      // Nothing to page through, so both pager buttons are really disabled.
      expect(await incomePage.paginationDisabled()).toEqual({ previous: true, next: true });
    },
  );

  test(
    'TC-INC-114 — clearing the search restores the unfiltered list',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();
      const baseline = await incomePage.totalResults();
      expect(baseline).toBeGreaterThan(0);

      const probe = await searchProbe(incomePage);
      expect(probe).not.toBe('');
      await incomePage.searchStaff(probe);
      await incomePage.waitForDataSettled();
      expect(incomePage.param('search')).toBe(probe);

      await incomePage.clearStaffSearch();
      await incomePage.waitForDataSettled();

      // The param is dropped rather than kept as an empty string.
      expect(incomePage.param('search')).toBe('');
      expect(incomePage.hasParam('search'), 'search removed from the URL').toBe(false);
      await expect(incomePage.staffSearchInput).toHaveValue('');

      // Back to the full list the remaining (date) filter allows.
      await expect
        .poll(() => incomePage.totalResults(), { timeout: SETTLE_TIMEOUT })
        .toBe(baseline);
    },
  );

  test(
    'TC-INC-115 — special characters are treated as literal text',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      const serverErrors: string[] = [];
      page.on('response', (response) => {
        if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
      });
      // Any injected `alert(1)` that actually ran would land here.
      const dialogs = incomePage.captureDialogs();

      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();

      for (const term of INCOME_SPECIAL_SEARCH_TERMS) {
        await incomePage.searchStaff(term);
        await incomePage.waitForDataSettled();

        // The screen survived and is still counting.
        await expect(incomePage.resultsFooter).toHaveText(INCOME_RESULTS_FOOTER_PATTERN);
        const total = await incomePage.totalResults();
        expect(Number.isNaN(total), `"${term}" left a readable footer`).toBe(false);

        if (total === 0) {
          await expect(incomePage.staffEmptyState.first()).toBeVisible();
        } else {
          // Anything that did come back must contain the term as PLAIN TEXT —
          // a `%` or `_` behaving as a SQL wildcard would break this.
          for (const name of await lowerStaffNames(incomePage)) {
            expect(name, `literal-string match for "${term}"`).toContain(term.toLowerCase());
          }
        }

        // The payload stayed a value and never became markup.
        expect(await incomePage.staffSearchValue()).toBe(term);
        expect(await incomePage.injectedNodeCount(), `"${term}" was not parsed as HTML`).toBe(0);
      }

      expect(dialogs, 'no injected alert() ran').toEqual([]);
      expect(serverErrors, 'no 5xx from the search endpoint').toEqual([]);
      expect(
        pageErrors.filter((message) => !CHUNK_NOISE.test(message)),
        'no uncaught page errors',
      ).toEqual([]);
    },
  );

  test(
    'TC-INC-116 — a padded term resolves deterministically',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();

      const probe = await searchProbe(incomePage, 4);
      expect(probe).not.toBe('');

      await incomePage.searchStaff(probe);
      await incomePage.waitForDataSettled();
      const trimmedHits = (await lowerStaffNames(incomePage)).sort();
      expect(trimmedHits.length).toBeGreaterThan(0);

      await incomePage.searchStaff(`  ${probe}  `);
      await incomePage.waitForDataSettled();

      // Whichever way the app resolves the padding, it must resolve it: the
      // screen keeps rendering and the box keeps what was typed.
      await expect(incomePage.resultsFooter).toHaveText(INCOME_RESULTS_FOOTER_PATTERN);
      expect(await incomePage.staffSearchValue()).toBe(`  ${probe}  `);

      const paddedHits = (await lowerStaffNames(incomePage)).sort();
      const sameAsTrimmed = paddedHits.join('|') === trimmedHits.join('|');
      expect(
        sameAsTrimmed || paddedHits.length === 0,
        'padded term is either trimmed or matches nothing — never something else',
      ).toBe(true);
    },
  );

  test(
    'TC-INC-117 — a 500-character term degrades cleanly',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();

      await incomePage.searchStaff(INCOME_LONG_SEARCH_TERM);
      await incomePage.waitForDataSettled();

      // No crash — just nothing to show.
      await expect(incomePage.staffEmptyState.first()).toBeVisible();
      await expect(incomePage.resultsFooter).toHaveText(/showing 0 to 0 of 0 results/i);

      // The box took the string (possibly capped) and kept it as one token.
      const value = await incomePage.staffSearchValue();
      expect(value.length).toBeGreaterThan(0);
      expect(value).toMatch(/^a+$/);

      // Layout intact: the input absorbed the string instead of stretching out
      // of the viewport.
      await expect(incomePage.staffSearchInput).toBeVisible();
      expect(
        await incomePage.isWithinViewport(incomePage.staffSearchInput),
        'the search box still fits the viewport',
      ).toBe(true);
    },
  );

  test(
    'TC-INC-118 — range, checkbox and search apply together',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      // Filter 1 — the range. Deep-linked: it is the same URL state the picker
      // writes, and the two clicks are covered by the date-picker cases.
      await incomePage.gotoWithQuery(STAFF_QUERY);
      await incomePage.waitForDataSettled();
      expect(await incomePage.dateTriggerLabel()).toMatch(INCOME_DATE_RANGE_LABEL_PATTERN);

      // Filter 2 — the checkbox.
      await incomePage.setShowStaffWithNoIncome(true);
      await page.waitForURL(/showStaffNoIncome=true/, { timeout: SETTLE_TIMEOUT });
      await incomePage.waitForDataSettled();
      const rangeAndCheckbox = await incomePage.totalResults();
      expect(rangeAndCheckbox).toBeGreaterThan(0);

      // Filter 3 — the search term, cut from a row the first two allow through.
      const probe = await searchProbe(incomePage);
      expect(probe).not.toBe('');
      await incomePage.searchStaff(probe);
      await incomePage.waitForDataSettled();

      // All three ride the URL at once ...
      expect(incomePage.param('dateAfter')).toBe(RANGE.dateAfter);
      expect(incomePage.param('dateBefore')).toBe(RANGE.dateBefore);
      expect(incomePage.param('showStaffNoIncome')).toBe('true');
      expect(incomePage.param('search')).toBe(probe);

      // ... and the table is their intersection: narrower than the range +
      // checkbox alone, with every row still matching the term.
      const allThree = await incomePage.totalResults();
      expect(allThree).toBeGreaterThan(0);
      expect(allThree).toBeLessThanOrEqual(rangeAndCheckbox);
      const names = await lowerStaffNames(incomePage);
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(name).toContain(probe.toLowerCase());
      }

      // The other two controls kept their state through the search.
      expect(await incomePage.dateTriggerLabel()).toMatch(INCOME_DATE_RANGE_LABEL_PATTERN);
      expect(await incomePage.ariaChecked(incomePage.showStaffWithNoIncomeCheckbox)).toBe('true');
    },
  );

  test(
    'TC-INC-119 — Clear filters resets all three Staff filters',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ ...STAFF_QUERY, showStaffNoIncome: 'true' });
      await incomePage.waitForDataSettled();

      const probe = await searchProbe(incomePage);
      expect(probe).not.toBe('');
      await incomePage.searchStaff(probe);
      await incomePage.waitForDataSettled();
      await expect(incomePage.clearFiltersButton.first()).toBeVisible();

      await incomePage.clearFilters();

      // Range back to default, checkbox unticked, box empty.
      expect(await incomePage.dateTriggerLabel()).toMatch(DEFAULT_DATE_LABEL);
      expect(await incomePage.ariaChecked(incomePage.showStaffWithNoIncomeCheckbox)).toBe('false');
      await expect(incomePage.staffSearchInput).toHaveValue('');

      // Every filter param is off the URL. The range is asserted as "no longer
      // these values" rather than "absent": the default state itself may carry
      // today's date on the URL (see TC-INC-106).
      expect(incomePage.param('dateAfter')).not.toBe(RANGE.dateAfter);
      expect(incomePage.param('dateBefore')).not.toBe(RANGE.dateBefore);
      expect(incomePage.hasParam('showStaffNoIncome')).toBe(false);
      expect(incomePage.hasParam('search')).toBe(false);

      // The app's own signal that nothing is filtered any more.
      await expect(incomePage.clearFiltersButton).toHaveCount(0);
    },
  );
});
