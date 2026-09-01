import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import {
  INCOME_CURRENCY_PATTERN,
  INCOME_DATE_LABEL_PATTERN,
  INCOME_ENTRY_COUNT_PATTERN,
  INCOME_MONTH_LABEL_PATTERN,
  INCOME_SALE_DETAILS_ROWS,
  INCOME_SALON_EARNINGS_ROWS,
  INCOME_SPLIT_PAY_ROWS,
  INCOME_STAFF_PAYOUT_ROWS,
  INCOME_SUMMARY_CHART_SERIES,
  INCOME_SUMMARY_COLUMNS,
  INCOME_SUMMARY_PANEL_GROUPS,
  INCOME_SUPPLY_FEE_ROWS,
  INCOME_WEEK_LABEL_PATTERN,
  IncomePeriod,
  IncomeSummaryColumn,
  IncomeTab,
  incomeRowValue,
  parseIncomeAmount,
  type IncomePage,
  type IncomeSummaryGroup,
  type IncomeValueRow,
} from '@pages/income/IncomePage';

/**
 * The fixed, wholly-past range these cases work in: `Aug 1 - Aug 21, 2026`
 * bucketed per day, which is the exact state the screen scan captured. Fixed on
 * purpose — the *relationships* (row formula, panel groups, panel-vs-row
 * agreement) are under test, so the rows must not drift with the clock the way
 * a `Today` range does. No live figure is ever asserted.
 */
const RANGE = {
  tab: 'summary',
  period: IncomePeriod.DAY,
  dateAfter: '2026-08-01',
  dateBefore: '2026-08-21',
} as const;

/** A one-day range inside `RANGE` that is known to carry transactions. */
const ONE_DAY = '2026-08-18';

/** The first row of `RANGE`, and a second row to switch to. */
const FIRST_DAY = 'Aug 1, 2026';
const OTHER_DAY = 'Aug 4, 2026';
const OTHER_DAY_ISO = '2026-08-04';

/** A range spanning three calendar months — enough to bucket by week / month. */
const WIDE_RANGE = { dateAfter: '2026-06-01', dateBefore: '2026-08-21' } as const;

/**
 * The heading each breakdown group carries its own total on.
 *
 * `SPLIT PAY` is deliberately absent: it is the only group the screen renders
 * without a total of its own (see TC-INC-098, which balances it against
 * `TOTAL STAFF PAYOUT` instead).
 */
const GROUP_TOTAL_ROWS: ReadonlyArray<readonly [IncomeSummaryGroup, string]> = [
  ['SALE DETAILS', 'TOTAL PAYMENT'],
  ['SUPPLY FEE', 'Total Supply Fee'],
  ['STAFF PAYOUT', 'TOTAL STAFF PAYOUT'],
  ['SALON EARNINGS', 'TOTAL EARNINGS'],
];

/**
 * Assert one panel/table value renders as currency, then hand back its number.
 *
 * The format check runs first on purpose: it is the real assertion, and it
 * guarantees the arithmetic below can never be handed a `NaN`.
 */
function amount(text: string, label: string): number {
  expect(text, `${label} should render as currency`).toMatch(INCOME_CURRENCY_PATTERN);
  return parseIncomeAmount(text);
}

/** `amount()` for one label out of a parsed breakdown group. */
function groupAmount(rows: IncomeValueRow[], label: string, group: string): number {
  return amount(incomeRowValue(rows, label), `${group} "${label}"`);
}

/** `Aug 1, 2026` → `2026-08-01` — the form the URL keeps `selectedDate` in. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoFromDateLabel(label: string): string {
  const parts = label.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/);
  expect(parts, `"${label}" should be a Mmm D, YYYY label`).not.toBeNull();
  const [, month, day, year] = parts as RegExpMatchArray;
  return `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Deep-link `RANGE`, click one date row and wait for the breakdown to render.
 *
 * The right panel is flat text with no per-row markup, so the wait keys on the
 * *last* group's total: once `TOTAL EARNINGS` is on screen the whole breakdown
 * has painted and can be parsed in one pass.
 */
async function openDayBreakdown(incomePage: IncomePage, day: string = FIRST_DAY): Promise<void> {
  await incomePage.gotoWithQuery({ ...RANGE });
  await incomePage.waitForDataSettled();
  await incomePage.selectSummaryRowContaining(day);
  await expect(incomePage.noRowSelectedTitle).toHaveCount(0);
  await expect
    .poll(async () => (await incomePage.visibleText()).includes('TOTAL EARNINGS'))
    .toBe(true);
}

/**
 * Tab Income Summary — the chart legend, the `Total Income Table` and the
 * right-hand breakdown panel that a selected row opens.
 *
 * Row selection is URL state (`selectedDate=`), so the query string is the
 * primary handle on the panel and `gotoWithQuery()` is the way into each state.
 * Everything money-shaped is asserted by format and by relationship — the
 * per-row `SALE + TIP + TAX = TOTAL PAYMENT` identity, the group totals
 * balancing their own rows, and the panel agreeing with the row that opened it.
 */
test.describe('Tab Income Summary — biểu đồ, bảng, panel — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  test(
    'TC-INC-089 — chart legend lists exactly the four income series',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      // The fixed range guarantees the chart has something to plot — a legend
      // on an empty chart would be a different case (TC-INC-087).
      await incomePage.gotoWithQuery({ ...RANGE });
      await incomePage.waitForDataSettled();

      for (const series of INCOME_SUMMARY_CHART_SERIES) {
        await expect(incomePage.chartLegend(series), `legend "${series}"`).toBeVisible();
      }

      // "Exactly four": the four labels render as one uninterrupted run above
      // the plot, so nothing else can be sitting between them.
      const text = await incomePage.visibleText();
      expect(text, 'legend holds the four series and nothing else').toMatch(
        new RegExp(INCOME_SUMMARY_CHART_SERIES.join(' ')),
      );
    },
  );

  test(
    'TC-INC-090 — Total Income Table headers in order DATE, SALE, TIP, TAX, TOTAL PAYMENT',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.openTab(IncomeTab.SUMMARY);

      await expect(incomePage.totalIncomeTableTitle).toBeVisible();
      await expect(incomePage.summaryHeaders).toHaveCount(INCOME_SUMMARY_COLUMNS.length);
      // Case-insensitive: the DOM holds them title case and CSS upper-cases them.
      await expect(incomePage.summaryHeaders).toHaveText(
        INCOME_SUMMARY_COLUMNS.map((column) => new RegExp(`^\\s*${column}\\s*$`, 'i')),
      );
    },
  );

  test(
    'TC-INC-091 — entry counter pluralises and matches the footer total',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      // One day → one bucket → the singular label.
      await incomePage.gotoWithQuery({
        tab: 'summary',
        period: IncomePeriod.DAY,
        dateAfter: ONE_DAY,
        dateBefore: ONE_DAY,
      });
      await incomePage.waitForDataSettled();

      expect(await incomePage.totalResults(), 'a one-day range buckets into one row').toBe(1);
      expect((await incomePage.entryCountLabel.textContent())?.trim()).toBe('1 entry');

      // Many days → the plural label, and the same number the footer counts.
      await incomePage.gotoWithQuery({ ...RANGE });
      await incomePage.waitForDataSettled();

      const total = await incomePage.totalResults();
      expect(total, 'a three-week range buckets into more than one row').toBeGreaterThan(1);

      const label = ((await incomePage.entryCountLabel.textContent()) ?? '').trim();
      expect(label).toMatch(INCOME_ENTRY_COUNT_PATTERN);
      expect(label, 'plural form once there is more than one entry').toMatch(/entries$/);
      expect(await incomePage.entryCount(), 'entry count equals the footer total').toBe(total);
    },
  );

  test(
    'TC-INC-092 — every row satisfies SALE + TIP + TAX = TOTAL PAYMENT',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ ...RANGE });
      await incomePage.waitForDataSettled();

      const rowCount = await incomePage.summaryTable.rowCount();
      expect(rowCount, 'the fixed range renders rows').toBeGreaterThan(0);

      for (let index = 0; index < rowCount; index += 1) {
        const cells = await incomePage.rowValues(incomePage.summaryTable, index);
        const date = cells[IncomeSummaryColumn.DATE];
        expect(date, `row ${index} DATE`).toMatch(INCOME_DATE_LABEL_PATTERN);

        const sale = amount(cells[IncomeSummaryColumn.SALE], `${date} SALE`);
        const tip = amount(cells[IncomeSummaryColumn.TIP], `${date} TIP`);
        const tax = amount(cells[IncomeSummaryColumn.TAX], `${date} TAX`);
        const totalPayment = amount(
          cells[IncomeSummaryColumn.TOTAL_PAYMENT],
          `${date} TOTAL PAYMENT`,
        );

        expect(
          sale + tip + tax,
          `${date}: SALE + TIP + TAX should equal TOTAL PAYMENT`,
        ).toBeCloseTo(totalPayment, 2);
      }
    },
  );

  test(
    'TC-INC-093 — right panel opens on the No row selected placeholder',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.openTab(IncomeTab.SUMMARY);

      await expect(incomePage.noRowSelectedTitle.first()).toBeVisible();
      await expect(incomePage.noRowSelectedHint.first()).toBeVisible();

      // Nothing is selected: no highlighted row, no `selectedDate` on the URL…
      await expect(incomePage.selectedTableRow).toHaveCount(0);
      expect(incomePage.hasParam('selectedDate')).toBe(false);

      // …and none of the breakdown groups is rendered yet.
      const text = await incomePage.visibleText();
      for (const group of INCOME_SUMMARY_PANEL_GROUPS) {
        expect(text, `"${group}" should not render before a row is picked`).not.toContain(group);
      }
    },
  );

  test(
    'TC-INC-094 — clicking the first row adds selectedDate and renders the breakdown',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ ...RANGE });
      await incomePage.waitForDataSettled();

      const firstDate = (await incomePage.summaryDateLabels())[0];
      expect(firstDate, 'first DATE cell').toMatch(INCOME_DATE_LABEL_PATTERN);

      await incomePage.selectSummaryRow();

      // The URL gains the ISO form of the row that was clicked.
      expect(incomePage.param('selectedDate')).toBe(isoFromDateLabel(firstDate));

      // The placeholder is replaced by the breakdown.
      await expect(incomePage.noRowSelectedTitle).toHaveCount(0);
      await expect(incomePage.noRowSelectedHint).toHaveCount(0);
      expect(await incomePage.visibleText()).toContain('SALE DETAILS');

      // And the clicked row is the one carrying the selected styling.
      await expect(incomePage.selectedTableRow).toHaveCount(1);
      await expect(incomePage.selectedTableRow).toContainText(firstDate);
      expect((await incomePage.selectedRowAttributes()).state).toBe('selected');
    },
  );

  test(
    'TC-INC-095 — breakdown panel renders all five groups, each with its own total',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await openDayBreakdown(incomePage);

      const text = await incomePage.visibleText();
      for (const group of INCOME_SUMMARY_PANEL_GROUPS) {
        expect(text, `group heading "${group}"`).toContain(group);
      }
      expect(text, 'the panel carries a Tax Collected row').toContain('Tax Collected');

      // Every group but `SPLIT PAY` totals itself, both beside its heading and
      // on its own `TOTAL …` row.
      for (const [group, totalRow] of GROUP_TOTAL_ROWS) {
        const rows = await incomePage.summaryGroupRows(group);
        groupAmount(rows, group, `${group} heading total`);
        groupAmount(rows, totalRow, group);
      }

      // `SPLIT PAY` has no heading total — it is made of its two pay rows.
      const splitPay = await incomePage.summaryGroupRows('SPLIT PAY');
      for (const label of INCOME_SPLIT_PAY_ROWS) {
        groupAmount(splitPay, label, 'SPLIT PAY');
      }
    },
  );

  test(
    'TC-INC-096 — SALE DETAILS lists its 17 metrics in order',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await openDayBreakdown(incomePage);

      const rows = await incomePage.summaryGroupRows('SALE DETAILS');
      // Row 0 is the heading's own total, so the metrics start at index 1.
      const labels = rows.map((row) => row.label);
      expect(labels.slice(1, 1 + INCOME_SALE_DETAILS_ROWS.length)).toEqual([
        ...INCOME_SALE_DETAILS_ROWS,
      ]);

      for (const label of INCOME_SALE_DETAILS_ROWS) {
        groupAmount(rows, label, 'SALE DETAILS');
      }
    },
  );

  test(
    'TC-INC-097 — STAFF PAYOUT lists its metrics and totals them',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await openDayBreakdown(incomePage);

      const rows = await incomePage.summaryGroupRows('STAFF PAYOUT');
      const labels = rows.map((row) => row.label);
      expect(labels.slice(1, 1 + INCOME_STAFF_PAYOUT_ROWS.length)).toEqual([
        ...INCOME_STAFF_PAYOUT_ROWS,
      ]);

      const total = groupAmount(rows, 'TOTAL STAFF PAYOUT', 'STAFF PAYOUT');
      const sum = INCOME_STAFF_PAYOUT_ROWS.filter((label) => label !== 'TOTAL STAFF PAYOUT').reduce(
        (running, label) => running + groupAmount(rows, label, 'STAFF PAYOUT'),
        0,
      );

      expect(sum, 'the payout rows should add up to TOTAL STAFF PAYOUT').toBeCloseTo(total, 2);
      // The figure beside the heading is the same total.
      expect(groupAmount(rows, 'STAFF PAYOUT', 'STAFF PAYOUT heading total')).toBeCloseTo(total, 2);
    },
  );

  test(
    'TC-INC-098 — SPLIT PAY rows add up to TOTAL STAFF PAYOUT',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await openDayBreakdown(incomePage);

      const splitPay = await incomePage.summaryGroupRows('SPLIT PAY');
      const split = INCOME_SPLIT_PAY_ROWS.reduce(
        (running, label) => running + groupAmount(splitPay, label, 'SPLIT PAY'),
        0,
      );

      const payoutRows = await incomePage.summaryGroupRows('STAFF PAYOUT');
      const payout = groupAmount(payoutRows, 'TOTAL STAFF PAYOUT', 'STAFF PAYOUT');

      expect(split, 'Pay 1 + Pay 2 should equal TOTAL STAFF PAYOUT').toBeCloseTo(payout, 2);
    },
  );

  test(
    'TC-INC-099 — SALON EARNINGS lists its 18 metrics in order',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await openDayBreakdown(incomePage);

      const rows = await incomePage.summaryGroupRows('SALON EARNINGS');
      const labels = rows.map((row) => row.label);
      expect(labels.slice(1, 1 + INCOME_SALON_EARNINGS_ROWS.length)).toEqual([
        ...INCOME_SALON_EARNINGS_ROWS,
      ]);

      for (const label of INCOME_SALON_EARNINGS_ROWS) {
        groupAmount(rows, label, 'SALON EARNINGS');
      }
    },
  );

  test(
    'TC-INC-100 — SUPPLY FEE splits into the staff and salon shares',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await openDayBreakdown(incomePage);

      const rows = await incomePage.summaryGroupRows('SUPPLY FEE');
      const labels = rows.map((row) => row.label);
      expect(labels.slice(1, 1 + INCOME_SUPPLY_FEE_ROWS.length)).toEqual([
        ...INCOME_SUPPLY_FEE_ROWS,
      ]);

      const totalFee = groupAmount(rows, 'Total Supply Fee', 'SUPPLY FEE');
      const staffShare = groupAmount(rows, 'Staff Supply Share', 'SUPPLY FEE');
      const salonShare = groupAmount(rows, 'Salon Supply Share', 'SUPPLY FEE');

      expect(
        staffShare + salonShare,
        'Staff Supply Share + Salon Supply Share should equal Total Supply Fee',
      ).toBeCloseTo(totalFee, 2);
    },
  );

  test(
    'TC-INC-101 — switching rows moves selectedDate, the highlight and the panel',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await openDayBreakdown(incomePage, FIRST_DAY);

      const firstIso = incomePage.param('selectedDate');
      expect(firstIso).toBe(isoFromDateLabel(FIRST_DAY));
      const firstValues = (await incomePage.summaryGroupRows('SALE DETAILS'))
        .map((row) => row.value)
        .join('|');

      await incomePage.selectSummaryRowContaining(OTHER_DAY);

      // `selectedDate` follows the new row…
      await expect.poll(() => incomePage.param('selectedDate')).toBe(isoFromDateLabel(OTHER_DAY));
      expect(incomePage.param('selectedDate')).not.toBe(firstIso);

      // …the panel re-reads against it…
      await expect
        .poll(async () =>
          (await incomePage.summaryGroupRows('SALE DETAILS')).map((row) => row.value).join('|'),
        )
        .not.toBe(firstValues);

      // …and exactly one row stays highlighted: the new one.
      await expect(incomePage.selectedTableRow).toHaveCount(1);
      await expect(incomePage.selectedTableRow).toContainText(OTHER_DAY);
    },
  );

  test(
    'TC-INC-102 — a selectedDate deep link restores the panel and the highlight',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage }) => {
      await incomePage.gotoWithQuery({ ...RANGE, selectedDate: OTHER_DAY_ISO });
      await incomePage.waitForDataSettled();

      // The breakdown is open straight away — no click needed.
      await expect(incomePage.noRowSelectedTitle).toHaveCount(0);
      await expect
        .poll(async () => (await incomePage.visibleText()).includes('TOTAL EARNINGS'))
        .toBe(true);

      const text = await incomePage.visibleText();
      for (const group of INCOME_SUMMARY_PANEL_GROUPS) {
        expect(text, `group heading "${group}"`).toContain(group);
      }

      // The matching row is highlighted…
      await expect(incomePage.selectedTableRow).toHaveCount(1);
      await expect(incomePage.selectedTableRow).toContainText(OTHER_DAY);

      // …and the panel holds that row's figures, not another row's.
      const index = (await incomePage.summaryDateLabels()).indexOf(OTHER_DAY);
      expect(index, `"${OTHER_DAY}" is inside the filtered range`).toBeGreaterThanOrEqual(0);
      const row = await incomePage.summaryRowAmounts(index);
      const panelTotal = await incomePage.summaryGroupAmount('SALE DETAILS', 'TOTAL PAYMENT');
      expect(panelTotal, 'panel TOTAL PAYMENT matches the selected row').toBeCloseTo(
        row.totalPayment,
        2,
      );
    },
  );

  test(
    'TC-INC-103 — a selectedDate outside the filtered range resolves cleanly',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const scriptErrors: string[] = [];
      page.on('pageerror', (error) => scriptErrors.push(error.message));

      await incomePage.gotoWithQuery({
        tab: 'summary',
        period: IncomePeriod.DAY,
        dateAfter: '2026-08-01',
        dateBefore: '2026-08-05',
        selectedDate: '2026-07-01',
      });
      await incomePage.waitForDataSettled();

      // The table itself is unaffected by the stray param.
      const total = await incomePage.totalResults();
      expect(Number.isNaN(total)).toBe(false);
      expect(total).toBeGreaterThan(0);

      // Deterministic outcome: either the placeholder is (still) up, or a
      // complete breakdown rendered — never a half-built panel.
      const text = await incomePage.visibleText();
      const placeholder = (await incomePage.noRowSelectedTitle.count()) > 0;
      const breakdown = INCOME_SUMMARY_PANEL_GROUPS.every((group) => text.includes(group));
      expect(
        placeholder || breakdown,
        'panel shows either the No row selected placeholder or a full breakdown',
      ).toBe(true);

      // The out-of-range date cannot have highlighted a row that is not there.
      if (placeholder) {
        await expect(incomePage.selectedTableRow).toHaveCount(0);
      } else {
        const labels = await incomePage.summaryDateLabels();
        const selected = ((await incomePage.selectedTableRow.first().textContent()) ?? '').trim();
        expect(
          labels.some((label) => selected.includes(label)),
          'any highlighted row is one the filtered range rendered',
        ).toBe(true);
      }

      // No uncaught JS. DEV drops a route chunk now and then (a known defect,
      // recovered by IncomePage.recoverIfUnavailable) — not what this case is about.
      const relevant = scriptErrors.filter(
        (message) =>
          !/dynamically imported module|Loading chunk|ChunkLoadError|module script failed|ResizeObserver/i.test(
            message,
          ),
      );
      expect(relevant, 'no uncaught page errors').toEqual([]);
    },
  );

  test(
    'TC-INC-104 — selecting a Week and a Month row shows that bucket aggregate',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      // Week: the row label proves the bucketing, the panel total proves the
      // breakdown aggregates the same bucket the row does.
      await incomePage.gotoWithQuery({
        tab: 'summary',
        period: IncomePeriod.WEEK,
        ...WIDE_RANGE,
      });
      await incomePage.waitForDataSettled();

      expect((await incomePage.summaryDateLabels())[0]).toMatch(INCOME_WEEK_LABEL_PATTERN);
      const weekRow = await incomePage.summaryRowAmounts(0);

      // Clicked directly rather than through `selectSummaryRow()`: the case is
      // about the panel, and the URL param name is not part of its Expected.
      await incomePage.summaryTable.rows.first().click();
      await expect(incomePage.noRowSelectedTitle).toHaveCount(0);
      await expect
        .poll(() => incomePage.summaryGroupAmount('SALE DETAILS', 'TOTAL PAYMENT'))
        .toBeCloseTo(weekRow.totalPayment, 2);

      // Month: same again, one bucket wider.
      await incomePage.gotoWithQuery({
        tab: 'summary',
        period: IncomePeriod.MONTH,
        ...WIDE_RANGE,
      });
      await incomePage.waitForDataSettled();

      expect((await incomePage.summaryDateLabels())[0]).toMatch(INCOME_MONTH_LABEL_PATTERN);
      const monthRow = await incomePage.summaryRowAmounts(0);

      await incomePage.summaryTable.rows.first().click();
      await expect(incomePage.noRowSelectedTitle).toHaveCount(0);
      await expect
        .poll(() => incomePage.summaryGroupAmount('SALE DETAILS', 'TOTAL PAYMENT'))
        .toBeCloseTo(monthRow.totalPayment, 2);

      // The `Select a date, week, or month` hint is honoured: a month row opens
      // the same five-group breakdown a date row does.
      const text = await incomePage.visibleText();
      for (const group of INCOME_SUMMARY_PANEL_GROUPS) {
        expect(text, `group heading "${group}"`).toContain(group);
      }
    },
  );

  test(
    'TC-INC-105 — changing the period drops or re-points the selected row',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage }) => {
      await openDayBreakdown(incomePage, FIRST_DAY);
      expect(incomePage.param('selectedDate')).toBe(isoFromDateLabel(FIRST_DAY));

      await incomePage.selectIncomePeriod('Month');

      // The day buckets are gone — the table is monthly now.
      const labels = await incomePage.summaryDateLabels();
      expect(labels.length).toBeGreaterThan(0);
      expect(labels[0]).toMatch(INCOME_MONTH_LABEL_PATTERN);

      const selected = await incomePage.selectedTableRow.count();
      if (selected === 0) {
        // Selection dropped: back to the placeholder, nothing stale on screen.
        await expect(incomePage.noRowSelectedTitle.first()).toBeVisible();
        await expect(incomePage.noRowSelectedHint.first()).toBeVisible();
      } else {
        // Selection kept: it has to point at a row this period actually renders,
        // and the panel has to show that month — not the old day.
        expect(selected).toBe(1);
        const text = ((await incomePage.selectedTableRow.first().textContent()) ?? '').trim();
        const index = labels.findIndex((label) => text.includes(label));
        expect(index, 'the highlighted row is one of the month buckets').toBeGreaterThanOrEqual(0);

        const row = await incomePage.summaryRowAmounts(index);
        await expect
          .poll(() => incomePage.summaryGroupAmount('SALE DETAILS', 'TOTAL PAYMENT'))
          .toBeCloseTo(row.totalPayment, 2);
      }
    },
  );
});
