import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RPT_COLUMNS,
  RPT_COUNT,
  RPT_CURRENCY,
  RPT_PAGE_SIZE,
  RPT_RANGE_PRESETS,
  ReportPagesPage,
  rptAmount,
  rptBlockSort,
  rptDateLabel,
  rptIsoDay,
  rptRangeLabel,
  rptStripLabel,
} from '@pages/reports/ReportPagesPage';

/**
 * Reports › Staff Income (TC-RPT-049 … 060). docs/test-cases/reports.md
 */
const SLUG = ReportPageSlug.STAFF_INCOME;
const BLOCK = 'income-staff';

async function openWithRows(rp: ReportPagesPage, query?: Record<string, string>): Promise<void> {
  await rp.openWithData(SLUG, query);
  expect((await rp.dataRows().count()) === 0, 'No staff income on this store for the range').toBeFalsy();
}

/** Type into the search box and wait for `search=` + a footer refresh. */
async function search(rp: ReportPagesPage, term: string): Promise<void> {
  const before = await rp.footerText();
  await rp.staffSearch.fill(term);
  if (term) await expect(rp.page).toHaveURL(/[?&]search=/, { timeout: Timeouts.MEDIUM });
  else await expect(rp.page).not.toHaveURL(/[?&]search=/, { timeout: Timeouts.MEDIUM });
  await rp.waitForFooterChange(before).catch(() => {}); // same count is legitimate
  await rp.waitForData();
}

/** Summary strip value (2026-10-20 labels: Staff, Orders, Subtotal, Supply Fee, Tip, Income). */
const summary = (rp: ReportPagesPage, label: string): Promise<string> => rp.stripValue(label);

test.describe('Reports › Staff Income', () => {
  test(
    'TC-RPT-049 — defaults: Today, switch off, empty search, six columns and the summary strip',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      await expect(rp.dateRangeButton).toHaveText('Today');
      await expect(rp.noIncomeSwitch).toHaveAttribute('aria-checked', 'false');
      await expect(rp.staffSearch).toHaveValue('');
      await expect(page.getByText('By Staff', { exact: true })).toBeVisible();
      expect((await rp.headerLabels()).map((h) => h.toLowerCase())).toEqual(
        RPT_COLUMNS.staffIncome.map((h) => h.toLowerCase()),
      );
      await expect(rp.staffSummary).toBeVisible();
      for (const label of ['Staff', 'Orders', 'Subtotal', 'Supply Fee', 'Tip', 'Income']) {
        await expect(rp.staffSummary.getByText(rptStripLabel(label))).toBeVisible();
      }
    },
  );

  test(
    'TC-RPT-050 — searching an existing staff filters rows, writes search= and scopes the summary strip',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp }) => {
      await openWithRows(rp);
      const name = (await rp.columnTexts(0))[0];
      await search(rp, name);
      expect(rp.param('search')).toBe(name);
      const names = await rp.columnTexts(0);
      expect(names.length).toBeGreaterThan(0);
      for (const n of names) expect(n.toLowerCase()).toContain(name.toLowerCase());
      const { total } = await rp.footerCounts();
      await expect.poll(async () => rptAmount(await summary(rp, 'Staff'))).toBe(total);
    },
  );

  test(
    'TC-RPT-051 — search is case-insensitive and matches a partial name',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await openWithRows(rp);
      const name = (await rp.columnTexts(0)).find((n) => /[a-z]{3}/i.test(n));
      expect(!name, 'No alphabetic staff name to slice').toBeFalsy();
      const partial = name!.replace(/[^a-z]/gi, '').slice(0, 3);
      await search(rp, partial.toUpperCase());
      const names = await rp.columnTexts(0);
      expect(names.length).toBeGreaterThan(0);
      expect(names.map((n) => n.toLowerCase())).toContain(name!.toLowerCase());
    },
  );

  test(
    'TC-RPT-052 — a search with no match shows the empty state and a zeroed summary',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(SLUG);
      await search(rp, 'zzzz-no-such-staff-xyz');
      await expect(rp.emptyRow).toBeVisible();
      await rp.expectTotal(0);
      await expect.poll(async () => summary(rp, 'Staff')).toBe('0');
      expect(await summary(rp, 'Income')).toBe('$0.00');
    },
  );

  test(
    'TC-RPT-053 — clearing the search restores the full list',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await openWithRows(rp);
      const original = await rp.footerText();
      await search(rp, 'zzzz-no-such-staff-xyz');
      await search(rp, '');
      await expect(rp.resultsFooter).toHaveText(original, { timeout: Timeouts.MEDIUM });
    },
  );

  test(
    'TC-RPT-054 — "Show staff with no income" adds zero-income staff and toggles include_no_income',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const off = await rp.footerCounts();
      await rp.noIncomeSwitch.click();
      await expect(rp.noIncomeSwitch).toHaveAttribute('aria-checked', 'true');
      await expect(page).toHaveURL(/[?&]include_no_income=true/);
      await expect.poll(async () => (await rp.footerCounts()).total, { timeout: Timeouts.MEDIUM }).toBeGreaterThanOrEqual(off.total);
      await rp.noIncomeSwitch.click();
      await expect(page).not.toHaveURL(/include_no_income/);
      await expect.poll(async () => (await rp.footerCounts()).total, { timeout: Timeouts.MEDIUM }).toBe(off.total);
    },
  );

  test(
    'TC-RPT-055 — a search + include_no_income deep link restores the input and the switch',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(SLUG, { search: 'a', include_no_income: 'true' });
      await expect(rp.staffSearch).toHaveValue('a');
      await expect(rp.noIncomeSwitch).toHaveAttribute('aria-checked', 'true');
    },
  );

  test(
    'TC-RPT-056 — Staff is sorted ascending by default; one click sorts descending',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await openWithRows(rp);
      expect(await rp.sortState('Staff')).toBe('ascending');
      await rp.clickSort('Staff');
      expect(await rp.sortState('Staff')).toBe('descending');
      expect(rptBlockSort(page.url())[BLOCK]).toBe('staffName:desc');
    },
  );

  test(
    'TC-RPT-057 — sorting by Total Income orders the rows from high to low',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await openWithRows(rp);
      await rp.clickSort('Total Income');
      expect(await rp.sortState('Total Income')).toBe('descending');
      expect(rptBlockSort(page.url())[BLOCK]).toBe('totalIncome:desc');
      await expect
        .poll(async () => {
          const v = (await rp.columnTexts(5)).map(rptAmount);
          return v.every((x, i) => i === 0 || v[i - 1] >= x);
        })
        .toBe(true);
    },
  );

  test(
    'TC-RPT-058 — summary strip totals equal the column sums of a single-page table',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await openWithRows(rp);
      const { total } = await rp.footerCounts();
      expect(total > RPT_PAGE_SIZE, 'More than one page — column sums would be partial').toBeFalsy();
      const sum = async (c: number) => (await rp.columnTexts(c)).map(rptAmount).reduce((a, b) => a + b, 0);
      expect(rptAmount(await summary(rp, 'Staff'))).toBe(total);
      expect(rptAmount(await summary(rp, 'Orders'))).toBe(await sum(1));
      expect(rptAmount(await summary(rp, 'Subtotal'))).toBeCloseTo(await sum(2), 1);
      expect(rptAmount(await summary(rp, 'Supply Fee'))).toBeCloseTo(await sum(3), 1);
      expect(rptAmount(await summary(rp, 'Tip'))).toBeCloseTo(await sum(4), 1);
      expect(rptAmount(await summary(rp, 'Income'))).toBeCloseTo(await sum(5), 1);
    },
  );

  test(
    'TC-RPT-059 — an after/before deep link labels the trigger with the range',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      const after = rptIsoDay(-7);
      const before = rptIsoDay(-1);
      await rp.openWithData(SLUG, { after, before });
      await expect(rp.dateRangeButton).toHaveText(rptRangeLabel(after, before));
    },
  );

  test(
    'TC-RPT-060 — Orders cells are integer counts and money cells are currency',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await openWithRows(rp);
      for (const v of await rp.columnTexts(1)) expect(v).toMatch(RPT_COUNT);
      for (let c = 2; c <= 5; c++) for (const v of await rp.columnTexts(c)) expect(v).toMatch(RPT_CURRENCY);
    },
  );

  test(
    'TC-RPT-106 — the range popover lists its presets; Yesterday rewrites after/before and the label',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      await expect(rp.dateRangeButton).toHaveText('Today');
      await rp.dateRangeButton.click();
      await expect(rp.rangePresets.getByRole('option')).toHaveText([...RPT_RANGE_PRESETS]);
      await rp.rangePresets.getByRole('option', { name: 'Yesterday', exact: true }).click();
      const day = rptIsoDay(-1);
      await expect(page).toHaveURL(new RegExp(`after=${day}&before=${day}`));
      await expect(rp.dateRangeButton).toHaveText('Yesterday');
      await expect(rp.calendar).toBeHidden();
      await rp.waitForData();
    },
  );
});
