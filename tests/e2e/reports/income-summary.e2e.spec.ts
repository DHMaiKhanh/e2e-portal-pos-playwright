import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RPT_COLUMNS,
  RPT_CURRENCY,
  RPT_DATE_LABEL,
  RPT_DATE_RANGE_LABEL,
  RPT_MONTH_LABEL,
  RPT_PERIOD_OPTIONS,
  RPT_SUMMARY_BREAKDOWN_GROUPS,
  RPT_SUMMARY_CHART_SERIES,
  RPT_TEXT,
  RPT_WEEK_LABEL,
  ReportPagesPage,
  rptAmount,
  rptBlockSort,
  rptDateLabel,
  rptIsoDay,
  rptParseRows,
  rptRangeLabel,
} from '@pages/reports/ReportPagesPage';

/**
 * Reports › Income Summary (TC-RPT-035 … 048). docs/test-cases/reports.md
 */
const SLUG = ReportPageSlug.INCOME_SUMMARY;
const BLOCK = 'income-summary';

/** A 7-day window ending yesterday — always in the past, always 7 rows. */
const WEEK_AFTER = rptIsoDay(-7);
const WEEK_BEFORE = rptIsoDay(-1);

async function pickPeriod(rp: ReportPagesPage, option: (typeof RPT_PERIOD_OPTIONS)[number]): Promise<void> {
  await rp.periodCombobox.click();
  await rp.page.getByRole('option', { name: option, exact: true }).click();
  await expect(rp.periodValue).toHaveText(option);
}

test.describe('Reports › Income Summary', () => {
  test(
    'TC-RPT-035 — defaults: Today in the range trigger, period Day, no breakdown open',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      await expect(rp.dateRangeButton).toHaveText('Today');
      await expect(rp.periodValue).toHaveText('Day');
      // 2026-10-20: the "No Row Selected" side panel is gone — the breakdown is a sheet opened by a row click.
      await expect(rp.breakdownDialog).toHaveCount(0);
      await expect(page.locator('tbody tr[data-state="selected"]')).toHaveCount(0);
    },
  );

  test(
    'TC-RPT-036 — the range calendar sets start then end and shows one row per day',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      // Both days of the window must be in the month the calendar opens on.
      // The end day must differ from the trigger's current end (today): clicking
      // the current end again collapses the range onto that day.
      const start = rptIsoDay(0).slice(0, 8) + '01';
      const end = rptIsoDay(-1);
      expect(end.slice(0, 7) !== start.slice(0, 7) || end <= start, 'Too early in the month for a window').toBeFalsy();
      await rp.openWithData(SLUG);
      await rp.dateRangeButton.click();
      // 2026-10-20: the picker shows two months and commits on Apply.
      await rp.dayButton(start).click();
      await rp.dayButton(end).click();
      await expect(rp.calendar).toContainText(rptRangeLabel(start, end));
      await rp.calendar.getByRole('button', { name: 'Apply', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`after=${start}&before=${end}`));
      await expect(rp.calendar).toBeHidden();
      await expect(rp.dateRangeButton).toHaveText(rptRangeLabel(start, end));
      await expect(rp.dateRangeButton).toHaveText(RPT_DATE_RANGE_LABEL);
      const days = Number(end.slice(8, 10));
      await rp.expectTotal(days);
    },
  );

  test(
    'TC-RPT-037 — the period combobox offers Day, Week and Month',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.open(SLUG);
      await rp.periodCombobox.click();
      await expect(page.getByRole('option')).toHaveText([...RPT_PERIOD_OPTIONS]);
      await page.keyboard.press('Escape');
    },
  );

  test(
    'TC-RPT-038 — Week groups rows by week and writes period=weekly',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const before = await rp.footerText();
      await pickPeriod(rp, 'Week');
      await expect(page).toHaveURL(/[?&]period=weekly/);
      await rp.waitForFooterChange(before);
      await rp.waitForData();
      for (const label of await rp.columnTexts(0)) expect(label).toMatch(RPT_WEEK_LABEL);
    },
  );

  test(
    'TC-RPT-039 — Month groups rows by month and writes period=monthly',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const before = await rp.footerText();
      await pickPeriod(rp, 'Month');
      await expect(page).toHaveURL(/[?&]period=monthly/);
      await rp.waitForFooterChange(before);
      await rp.waitForData();
      for (const label of await rp.columnTexts(0)) expect(label).toMatch(RPT_MONTH_LABEL);
    },
  );

  test(
    'TC-RPT-040 — the chart legend shows Gross Income, Net Income and Total Tip',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      for (const series of RPT_SUMMARY_CHART_SERIES) {
        await expect(page.getByRole('img', { name: `${series} legend icon` })).toBeVisible();
      }
    },
  );

  test(
    'TC-RPT-041 — the table has five columns, date labels and currency cells',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(SLUG, { after: WEEK_AFTER, before: WEEK_BEFORE });
      expect((await rp.headerLabels()).map((h) => h.toLowerCase())).toEqual(
        RPT_COLUMNS.incomeSummary.map((h) => h.toLowerCase()),
      );
      await rp.expectTotal(7);
      for (const d of await rp.columnTexts(0)) expect(d).toMatch(RPT_DATE_LABEL);
      for (let c = 1; c <= 4; c++) for (const v of await rp.columnTexts(c)) expect(v).toMatch(RPT_CURRENCY);
    },
  );

  test(
    'TC-RPT-042 — Total Payment = Sale + Tip + Tax on every row',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(SLUG, { after: WEEK_AFTER, before: WEEK_BEFORE });
      const [sale, tip, tax, total] = await Promise.all([1, 2, 3, 4].map((c) => rp.columnTexts(c)));
      total.forEach((t, i) => {
        expect(Math.abs(rptAmount(sale[i]) + rptAmount(tip[i]) + rptAmount(tax[i]) - rptAmount(t)), `row ${i + 1}`).toBeLessThan(0.011);
      });
    },
  );

  test(
    'TC-RPT-043 — clicking a row selects it and opens the five-group breakdown sheet',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      expect((await rp.dataRows().count()) === 0, 'No summary row').toBeFalsy();
      const url = page.url();
      await rp.dataRows().first().click();
      await expect(rp.breakdownDialog).toBeVisible({ timeout: Timeouts.MEDIUM });
      for (const group of RPT_SUMMARY_BREAKDOWN_GROUPS) {
        await expect(rp.breakdownDialog.getByText(group, { exact: true }).first()).toBeVisible({ timeout: Timeouts.MEDIUM });
      }
      await expect(rp.dataRows().first()).toHaveAttribute('data-state', 'selected');
      expect(page.url()).toBe(url);
    },
  );

  test(
    'TC-RPT-044 — breakdown Payment details equals the row Total Payment; Sale details = Net Total + Tip + Tax Collected',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      expect((await rp.dataRows().count()) === 0, 'No summary row').toBeFalsy();
      const rowTotal = rptAmount((await rp.columnTexts(4))[0]);
      await rp.dataRows().first().click();
      await expect(rp.breakdownDialog.getByText('Salon earnings', { exact: true })).toBeVisible({ timeout: Timeouts.MEDIUM });
      const text = await rp.rightPanelText();
      const pay = rptParseRows(ReportPagesPage.section(text, 'Payment details', RPT_SUMMARY_BREAKDOWN_GROUPS));
      expect(rptAmount(pay[0].value)).toBeCloseTo(rowTotal, 2);
      const payVal = (l: string) => rptAmount(pay.filter((r) => r.label === l).pop()?.value ?? '');
      expect(payVal('Amount Collected') + payVal('Gift Card Redemption')).toBeCloseTo(rowTotal, 2);
      const sale = rptParseRows(ReportPagesPage.section(text, 'Sale details', RPT_SUMMARY_BREAKDOWN_GROUPS));
      const saleVal = (l: string) => rptAmount(sale.filter((r) => r.label === l).pop()?.value ?? '');
      expect(rptAmount(sale[0].value)).toBeCloseTo(saleVal('Net Total') + saleVal('Tip') + saleVal('Tax Collected'), 2);
    },
  );

  test(
    'TC-RPT-045 — Date sort cycles ascending → descending → none, mirrored in blockSort and aria',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG, { after: WEEK_AFTER, before: WEEK_BEFORE });
      const th = page.getByRole('columnheader', { name: /^Sort by Date/ });
      expect(await rp.sortState('Date')).toBe('none');
      await rp.clickSort('Date');
      expect(await rp.sortState('Date')).toBe('ascending');
      await expect(th).toHaveAttribute('aria-sort', 'ascending');
      expect(rptBlockSort(page.url())[BLOCK]).toBe('date:asc');
      await rp.clickSort('Date');
      expect(await rp.sortState('Date')).toBe('descending');
      expect(rptBlockSort(page.url())[BLOCK]).toBe('date:desc');
      await expect.poll(async () => (await rp.columnTexts(0))[0]).toBe(rptDateLabel(WEEK_BEFORE));
      await rp.clickSort('Date');
      expect(await rp.sortState('Date')).toBe('none');
      expect(rptBlockSort(page.url())[BLOCK]).toBeUndefined();
    },
  );

  test(
    'TC-RPT-046 — a numeric column sorts descending first and the values really descend',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG, { after: WEEK_AFTER, before: WEEK_BEFORE });
      await rp.clickSort('Sale');
      expect(await rp.sortState('Sale')).toBe('descending');
      expect(rptBlockSort(page.url())[BLOCK]).toMatch(/:desc$/);
      await expect
        .poll(async () => {
          const v = (await rp.columnTexts(1)).map(rptAmount);
          return v.every((x, i) => i === 0 || v[i - 1] >= x);
        })
        .toBe(true);
    },
  );

  test(
    'TC-RPT-047 — a period + range deep link survives a reload',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      const q = { after: rptIsoDay(-60), before: rptIsoDay(-1), period: 'monthly' };
      await rp.openWithData(SLUG, q);
      await expect(rp.periodValue).toHaveText('Month');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await rp.waitForData();
      await expect(rp.periodValue).toHaveText('Month');
      expect(rp.param('period')).toBe('monthly');
      for (const label of await rp.columnTexts(0)) expect(label).toMatch(RPT_MONTH_LABEL);
    },
  );

  test(
    'TC-RPT-048 — a reversed range (after > before) is swapped or rejected with a message',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      // Product bug (re-checked 2026-10-20): the reversed range is accepted, labelled "Oct 19 – 13, 2026" and renders no rows.
      await rp.openWithData(SLUG, { after: WEEK_BEFORE, before: WEEK_AFTER });
      const counts = await rp.footerCounts();
      expect(counts.total).toBe(7);
    },
  );
});
