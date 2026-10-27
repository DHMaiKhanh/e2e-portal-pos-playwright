import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportV4Slug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RV4_COLUMNS,
  RV4_DATA_DAY,
  RV4_DATE_LABEL,
  RV4_GROUP_BY,
  RV4_RANGE_PRESETS,
  RV4_WEEK_LABEL,
  rv4Cents,
  rv4DayCount,
  rv4Amount,
} from '@pages/reports-v4/ReportsV4Page';

/**
 * Reports V4 › C. Income Summary (RV4-C01 … C11) — docs/test-cases/reports-v4.md
 */
const SLUG = ReportV4Slug.INCOME_SUMMARY;
/** 21 days → one table page (30 rows/page), so column sums cover the whole range. */
const AUGUST = { after: '2026-08-01', before: '2026-08-21' };

test.describe('Reports V4 › Income Summary', () => {
  test(
    'RV4-C01 — range presets write the expected after/before',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG);
      await rp.dateRangeButton.click();
      for (const p of RV4_RANGE_PRESETS) await expect(rp.option(p)).toBeVisible();
      await rp.page.keyboard.press('Escape');

      await rp.pickRangePreset('Last 30 days');
      await expect(rp.dateRangeButton).toHaveText('Last 30 days');
      expect(rv4DayCount(rp.param('after')!, rp.param('before')!)).toBe(30);

      await rp.pickRangePreset('Last 7 days');
      expect(rv4DayCount(rp.param('after')!, rp.param('before')!)).toBe(7);

      await rp.pickRangePreset('Yesterday');
      expect(rp.param('after')).toBe(rp.param('before'));

      await rp.pickRangePreset('This month');
      expect(rp.param('after')).toMatch(/-01$/);
    },
  );

  test(
    'RV4-C02 — a custom deep-link range is applied; closing the picker without a choice keeps it',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG, AUGUST);
      const url = page.url();
      await expect(rp.bodyRows).toHaveCount(21);
      await rp.dateRangeButton.click();
      await expect(rp.popover.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(rp.dateRangeButton).toHaveAttribute('aria-expanded', 'false');
      expect(page.url()).toBe(url);
    },
  );

  test(
    'RV4-C03 — Group by Week writes period=weekly and labels rows "Week n (…)"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG, AUGUST);
      await rp.groupByChip.click();
      for (const g of RV4_GROUP_BY) await expect(rp.option(g)).toBeVisible();
      await rp.option('Week').click();
      await expect(page).toHaveURL(/period=weekly/);
      await rp.waitForData();
      await expect(rp.bodyRows.first().locator('td').first()).toHaveText(RV4_WEEK_LABEL);
    },
  );

  test(
    'RV4-C04 — changing Group by keeps the selected date range',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      // BUG — stays red until fixed: Product behaviour: switching Group by resets after/before to the whole year
      await rp.openWithData(SLUG, AUGUST);
      await rp.pickGroupBy('Week');
      expect(rp.param('after')).toBe(AUGUST.after);
      expect(rp.param('before')).toBe(AUGUST.before);
    },
  );

  test(
    'RV4-C05 — Day and Month grouping give the same Sale total for a month',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG, AUGUST);
      await expect(rp.bodyRows.first().locator('td').first()).toHaveText(RV4_DATE_LABEL);
      const daySale = await rp.columnSum(1);
      await rp.openWithData(SLUG, { ...AUGUST, period: 'monthly' });
      await expect(page).toHaveURL(/period=monthly/);
      await expect(rp.groupByChip).toHaveAttribute('aria-label', /Month$/);
      const monthSale = await rp.columnSum(1);
      expect(rv4Cents(monthSale)).toBe(rv4Cents(daySale));
    },
  );

  test(
    'RV4-C06 — one day here equals Daily Sale for that day',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      const day = { after: RV4_DATA_DAY, before: RV4_DATA_DAY };
      await rp.openWithData(SLUG, day);
      expect(await rp.headerLabels()).toEqual([...RV4_COLUMNS.incomeSummary]);
      const [, sale, tip, , total] = (await rp.bodyRows.first().locator('td').allInnerTexts()).map(
        rv4Amount,
      );
      await rp.openWithData(ReportV4Slug.DAILY_SALE, day);
      expect(rv4Cents(rv4Amount(await rp.statValue('Sale Income')))).toBe(rv4Cents(sale));
      expect(rv4Cents(rv4Amount(await rp.statValue('Total Tip')))).toBe(rv4Cents(tip));
      expect(rv4Cents(rv4Amount(await rp.statValue('Total Payment')))).toBe(rv4Cents(total));
    },
  );

  test(
    'RV4-C07 — clicking a row opens the Breakdown sheet',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, { after: RV4_DATA_DAY, before: RV4_DATA_DAY });
      await rp.bodyRows.first().click();
      await expect(rp.sheet).toContainText('Breakdown');
      for (const s of [
        'Payment details',
        'Sale details',
        'Cash',
        'Card',
        'Others',
        'Amount Collected',
      ]) {
        await expect(rp.sheet).toContainText(s);
      }
      await rp.page.keyboard.press('Escape');
      await expect(rp.sheet).toBeHidden();
    },
  );

  test(
    'RV4-C08 — Breakdown: Σ(Sale + Refund) by method = row Sale; Σ methods = Total Payment',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, { after: RV4_DATA_DAY, before: RV4_DATA_DAY });
      const cells = (await rp.bodyRows.first().locator('td').allInnerTexts()).map((t) =>
        rv4Amount(t.trim()),
      );
      await rp.bodyRows.first().click();
      await expect(rp.sheet).toContainText('Payment details');
      const text = await rp.sheet.innerText();
      const money = '([-−]?\\$[\\d,]+\\.\\d{2})';
      let net = 0;
      let paid = 0;
      for (const method of ['Cash', 'Card', 'Others']) {
        const m = new RegExp(
          `(?:^|\\n)${method}\\n${money}\\nSale\\n${money}\\nRefund\\n${money}`,
        ).exec(text);
        expect(m, `${method} block`).not.toBeNull();
        paid += rv4Amount(m![1]);
        net += rv4Amount(m![2]) + rv4Amount(m![3]);
      }
      expect(rv4Cents(net), 'net sale').toBe(rv4Cents(cells[1]));
      expect(rv4Cents(paid), 'total payment').toBe(rv4Cents(cells[4]));
      const collected = new RegExp(`Amount Collected\\n${money}`).exec(text);
      expect(rv4Cents(rv4Amount(collected![1]))).toBe(rv4Cents(cells[4]));
    },
  );

  test(
    'RV4-C09 — Sort by Sale orders rows and toggles direction',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, AUGUST);
      await rp.clickSort('Sale');
      const dir1 = await rp.expectColumnSorted('Sale', 1);
      expect(dir1).not.toBe('none');
      await expect(rp.page).toHaveURL(/blockSort=/);
      await rp.clickSort('Sale');
      const dir2 = await rp.expectColumnSorted('Sale', 1);
      expect(dir2).not.toBe(dir1);
    },
  );

  test(
    'RV4-C10 — chart legend lists Gross / Net / Total Tip and the tooltip shows all three per date',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      // The legend is display-only (clicking an item does not hide its series — checked 2026-10-20),
      // so this asserts what it renders rather than toggling.
      await rp.openWithData(SLUG, AUGUST);
      await expect(rp.chartLegendItems).toHaveText(['Gross Income', 'Net Income', 'Total Tip']);
      await expect(rp.chart.locator('.recharts-bar')).toHaveCount(3);
      const tip = await rp.chartTooltipAt(0.5);
      expect(tip.split('\n')[0]).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
      for (const series of ['Gross Income', 'Net Income', 'Total Tip']) {
        expect(tip).toMatch(new RegExp(`${series} : [-−]?\\$[\\d,]+\\.\\d{2}`));
      }
    },
  );

  test(
    'RV4-C11 — a one-year daily range loads without hanging',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportsV4Page: rp }) => {
      const started = Date.now();
      await rp.openWithData(SLUG, { after: '2025-10-01', before: '2026-09-30' });
      expect(Date.now() - started).toBeLessThan(Timeouts.LONG * 2);
      expect(await rp.countValue()).toBeGreaterThan(0);
    },
  );
});
