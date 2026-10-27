import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportV4Slug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RV4_COLUMNS,
  RV4_CURRENCY,
  RV4_DATA_DAY,
  RV4_TEXT,
  type ReportsV4Page,
  rv4Cents,
  rv4UrlPattern,
  rv4Amount,
} from '@pages/reports-v4/ReportsV4Page';

/**
 * Reports V4 › D. Staff Income & Staff Income Detail (RV4-D01 … D15)
 */
const SLUG = ReportV4Slug.STAFF_INCOME;
const DAY = { after: RV4_DATA_DAY, before: RV4_DATA_DAY };

/** First staff row with at least one order: `{ name, orders, cells }`. */
async function firstWorkingStaff(
  rp: ReportsV4Page,
): Promise<{ name: string; orders: number; cells: string[] }> {
  const n = await rp.bodyRows.count();
  for (let i = 0; i < n; i++) {
    const cells = (await rp.bodyRows.nth(i).locator('td').allInnerTexts()).map((t) => t.trim());
    if (rv4Amount(cells[1]) > 0) return { name: cells[0], orders: rv4Amount(cells[1]), cells };
  }
  throw new Error('No staff with orders on the pinned day');
}

/** Click a staff row and wait until Staff Income Detail has rendered its own table. */
async function openDetail(rp: ReportsV4Page, name: string): Promise<void> {
  await rp.bodyRows.filter({ hasText: name }).first().click();
  await expect(rp.page).toHaveURL(rv4UrlPattern(ReportV4Slug.STAFF_INCOME_DETAIL));
  await rp.waitForHeading('Staff Income Detail');
  await expect(rp.columnHeaders.first()).toHaveText('Order #');
}

test.describe('Reports V4 › Staff Income', () => {
  test(
    'RV4-D01 — by default only staff with figures are listed',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      expect(await rp.headerLabels()).toEqual(expect.arrayContaining([...RV4_COLUMNS.staffIncome]));
      await expect(rp.noIncomeSwitch).toHaveAttribute('aria-checked', 'false');
      expect(await rp.countValue()).toBe(await rp.bodyRows.count());
    },
  );

  test(
    'RV4-D02 — "Show staff with no income" adds staff but keeps the totals',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG, DAY);
      // With every staff listed the table paginates and the Total row is not on page 1,
      // so the KPI strip is compared instead.
      const kpis = async () => {
        const a = await rp.mainAmounts();
        return ['Subtotal', 'Supply Fee', 'Tip', 'Income'].map((k) => a.get(k));
      };
      const before = { count: await rp.countValue(), kpis: await kpis() };
      await rp.noIncomeSwitch.click();
      await expect(page).toHaveURL(/include_no_income=true/);
      await expect(rp.noIncomeSwitch).toHaveAttribute('aria-checked', 'true');
      await expect
        .poll(() => rp.countValue(), { timeout: Timeouts.LONG })
        .toBeGreaterThan(before.count);
      expect(await kpis()).toEqual(before.kpis);
    },
  );

  test(
    'RV4-D03 — search narrows the table and recomputes the totals',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG, DAY);
      const staff = await firstWorkingStaff(rp);
      await rp.staffSearch.fill(staff.name);
      await expect(page).toHaveURL(/[?&]search=/);
      const needle = staff.name.toLowerCase();
      await expect
        .poll(
          async () => (await rp.columnTexts(0)).every((n) => n.toLowerCase().includes(needle)),
          {
            timeout: Timeouts.LONG,
          },
        )
        .toBe(true);
      expect(await rp.countValue()).toBeGreaterThanOrEqual(1);
      if ((await rp.bodyRows.count()) === 1) {
        // a column with "No total" (block config, VP-4881) leaves its Total cell blank
        const foot = await rp.footTexts();
        const cols = foot.map((_, i) => i).filter((i) => i > 0 && foot[i] !== '');
        expect(cols.map((i) => foot[i])).toEqual(cols.map((i) => staff.cells[i]));
      }
    },
  );

  test(
    'RV4-D04 — a search with no match shows an empty table',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      await rp.staffSearch.fill('zzz-no-such-staff');
      await expect.poll(() => rp.countValue(), { timeout: Timeouts.LONG }).toBe(0);
    },
  );

  test(
    'RV4-D05 — the Total row is the sum of every column',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      const foot = await rp.footTexts();
      expect(foot[0]).toBe('Total');
      for (let col = 1; col <= 5; col++) {
        // Since VP-4881 the Totals row follows the block config: a column with "No total" is blank.
        if (foot[col] === '') continue;
        expect(rv4Cents(rv4Amount(foot[col])), `column ${col}`).toBe(
          rv4Cents(await rp.columnSum(col)),
        );
      }
    },
  );

  test(
    'RV4-D06 — Subtotal and Tip totals match the Income Summary breakdown for the same day',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      const foot = (await rp.footTexts()).map(rv4Amount);
      await rp.openWithData(ReportV4Slug.INCOME_SUMMARY, DAY);
      const tip = rv4Amount((await rp.bodyRows.first().locator('td').nth(2).innerText()).trim());
      await rp.bodyRows.first().click();
      await expect(rp.sheet).toContainText('Sale details');
      // Staff Subtotal = net service sale (sales − refunds) = breakdown "Subtotal".
      const subtotal = /\nSubtotal\n([-−]?\$[\d,]+\.\d{2})/.exec(await rp.sheet.innerText());
      expect(subtotal).not.toBeNull();
      expect(rv4Cents(foot[2])).toBe(rv4Cents(rv4Amount(subtotal![1])));
      expect(rv4Cents(foot[4])).toBe(rv4Cents(tip));
    },
  );

  test(
    'RV4-D07 — money cells (incl. negative income) are formatted $#,##0.00 / -$',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      for (const col of [2, 3, 4, 5]) {
        for (const t of await rp.columnTexts(col)) expect(t).toMatch(RV4_CURRENCY);
      }
    },
  );

  test(
    'RV4-D08 — clicking a staff opens Staff Income Detail with staff_id and the range',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG, DAY);
      const staff = await firstWorkingStaff(rp);
      await rp.bodyRows.filter({ hasText: staff.name }).first().click();
      await expect(page).toHaveURL(rv4UrlPattern(ReportV4Slug.STAFF_INCOME_DETAIL));
      expect(rp.param('staff_id')).toBeTruthy();
      expect(rp.param('after')).toBe(RV4_DATA_DAY);
      expect(rp.param('before')).toBe(RV4_DATA_DAY);
      await expect(rp.heading).toContainText('Staff Income Detail');
      await expect(rp.heading).toContainText(staff.name);
    },
  );

  test(
    'RV4-D09 — detail orders reconcile with the staff row (orders, sale, supply, tip)',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      const staff = await firstWorkingStaff(rp);
      await openDetail(rp, staff.name);
      expect(await rp.headerLabels()).toEqual([...RV4_COLUMNS.staffIncomeDetail]);
      // Refund lines are listed as extra rows under the same order code (no "(Refund)" tag here,
      // unlike Daily Sale); Orders counts distinct order codes.
      const codes = await rp.columnTexts(0);
      expect(new Set(codes).size).toBe(staff.orders);
      expect(rv4Cents(await rp.columnSum(4))).toBe(rv4Cents(rv4Amount(staff.cells[2])));
      expect(rv4Cents(await rp.columnSum(5))).toBe(rv4Cents(rv4Amount(staff.cells[3])));
      expect(rv4Cents(await rp.columnSum(6))).toBe(rv4Cents(rv4Amount(staff.cells[4])));
    },
  );

  test(
    'RV4-D10 — detail panel: Total = Commission − charges + Tip, and Pay 1 + Pay 2 = Total',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      const rows = await rp.bodyRows.count();
      const staffRows: string[][] = [];
      for (let i = 0; i < rows; i++) {
        const cells = (await rp.bodyRows.nth(i).locator('td').allInnerTexts()).map((t) => t.trim());
        if (rv4Amount(cells[1]) > 0) staffRows.push(cells);
      }
      // Salary-type staff ("Wage per Day") follow a different formula — use a commission staff.
      let a: Map<string, number> | undefined;
      let row: string[] | undefined;
      for (const cells of staffRows.slice(0, 6)) {
        await rp.openWithData(SLUG, DAY);
        await openDetail(rp, cells[0]);
        const amounts = await rp.mainAmounts();
        if (amounts.has('Staff Commission')) {
          a = amounts;
          row = cells;
          break;
        }
      }
      expect(!a, 'No commission-paid staff on the pinned day').toBeFalsy();
      const total = a!.get('Staff Income Detail')!;
      expect(rv4Cents(total)).toBe(rv4Cents(rv4Amount(row![5])));
      const g = (k: string) => a!.get(k) ?? 0;
      expect(rv4Cents(total)).toBe(
        rv4Cents(
          g('Staff Commission') -
            g('Card Charge Commission') -
            g('Clean Up Fee') -
            g('Discount Charge') +
            g('Tip') -
            g('Card Charge Tip'),
        ),
      );
      if (a!.has('Pay 1') && a!.has('Pay 2'))
        expect(rv4Cents(g('Pay 1') + g('Pay 2'))).toBe(rv4Cents(total));
    },
  );

  test(
    'RV4-D11 — Working Days is at least 1 for a staff with orders that day',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      // BUG — stays red until fixed: Suspected bug: Working Days shows 0 for a staff with orders (2026-10-20 scan)
      await rp.openWithData(SLUG, DAY);
      const staff = await firstWorkingStaff(rp);
      await openDetail(rp, staff.name);
      const m = /Working Days\n(\d+)/.exec(await rp.page.locator('#pos-main').innerText());
      expect(Number(m?.[1] ?? 0)).toBeGreaterThanOrEqual(1);
    },
  );

  test(
    'RV4-D12 — changing the date on the detail page keeps staff_id',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG, DAY);
      const staff = await firstWorkingStaff(rp);
      await openDetail(rp, staff.name);
      const staffId = rp.param('staff_id');
      await rp.pickRangePreset('Yesterday');
      await expect
        .poll(() => rp.param('after'), { timeout: Timeouts.MEDIUM })
        .not.toBe(RV4_DATA_DAY);
      expect(rp.param('staff_id')).toBe(staffId);
    },
  );

  test(
    'RV4-D13 — an unknown staff_id does not crash the detail page',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.open(ReportV4Slug.STAFF_INCOME_DETAIL, { ...DAY, staff_id: 'abc' });
      await expect(page.getByText(RV4_TEXT.MERCHANT_LOAD_FAILURE)).toBeHidden();
      await expect(rp.heading).toContainText('Staff Income Detail');
    },
  );

  test(
    'RV4-D14 — long service names are truncated inside the cell without widening the page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp, page }) => {
      // Find the longest Services cell among the staff of the pinned day.
      await rp.openWithData(SLUG, DAY);
      const names = (await rp.columnTexts(0)).slice(0, 6);
      let longest = 0;
      for (const name of names) {
        await rp.openWithData(SLUG, DAY);
        await rp.bodyRows.filter({ hasText: name }).first().click();
        await rp.waitForHeading('Staff Income Detail');
        const cells = rp.bodyRows.locator('td:nth-child(4)');
        const lens = (await cells.allInnerTexts()).map((t) => t.length);
        longest = Math.max(longest, ...lens, 0);
        // every services cell stays within its column (no overflow past the cell box)
        const overflow = await cells.evaluateAll((tds) =>
          tds.some(
            (td) =>
              td.getBoundingClientRect().right >
              (td.closest('table')?.getBoundingClientRect().right ?? 1e9) + 1,
          ),
        );
        expect(overflow, `${name} services overflow`).toBe(false);
        const pageOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(pageOverflow, `${name} page horizontal overflow`).toBeLessThanOrEqual(1);
      }
      expect(longest, 'at least one services cell checked').toBeGreaterThan(0);
    },
  );

  test(
    'RV4-D15 — Back from the detail page restores search and the no-income switch',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG, DAY);
      const staff = await firstWorkingStaff(rp);
      await rp.noIncomeSwitch.click();
      await rp.staffSearch.fill(staff.name);
      await expect(page).toHaveURL(/search=/);
      await openDetail(rp, staff.name);
      await page.goBack();
      await expect(page).toHaveURL(/include_no_income=true/);
      await expect(page).toHaveURL(/search=/);
      await expect(rp.staffSearch).toHaveValue(staff.name);
    },
  );
});
