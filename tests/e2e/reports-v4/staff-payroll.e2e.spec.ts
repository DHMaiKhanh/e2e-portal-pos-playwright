import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportV4Slug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RV4_CLOSED_PERIOD,
  RV4_COLUMNS,
  RV4_PAGE_SIZE,
  RV4_TEXT,
  ReportsV4Page,
  rv4Cents,
  rv4Amount,
} from '@pages/reports-v4/ReportsV4Page';

/**
 * Reports V4 › E. Staff Payroll (RV4-E01 … E10)
 *
 * Reconciliation runs on a closed period ({@link RV4_CLOSED_PERIOD}) so the
 * figures do not move while the test runs.
 */
const SLUG = ReportV4Slug.STAFF_PAYROLL;

async function openClosedPeriod(rp: ReportsV4Page): Promise<void> {
  await rp.openWithData(SLUG);
  await rp.pickPayrollPeriod(RV4_CLOSED_PERIOD);
  await rp.waitForData();
}

/** Name of the first staff with orders in the current table. */
async function firstWorkingName(rp: ReportsV4Page): Promise<string> {
  const names = await rp.columnTexts(0);
  const orders = (await rp.columnTexts(1)).map(rv4Amount);
  const i = orders.findIndex((o) => o > 0);
  if (i < 0) throw new Error('No staff with orders in this period');
  return names[i];
}

test.describe('Reports V4 › Staff Payroll', () => {
  test(
    'RV4-E01 — the period picker lists the current (unclosed) period first, selected',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG);
      await rp.payrollPeriodChip.click();
      const first = rp.popover.getByRole('option').first();
      await expect(first).toContainText(RV4_TEXT.CURRENT_PERIOD);
      await expect(first).toHaveAttribute('aria-selected', 'true');
      expect(await rp.popover.getByRole('option').count()).toBeGreaterThan(1);
      await rp.page.keyboard.press('Escape');
    },
  );

  test(
    'RV4-E02 — a closed period changes period_id and drops the Live/Estimated note',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(SLUG);
      const current = rp.param('period_id');
      await rp.pickPayrollPeriod(RV4_CLOSED_PERIOD);
      await expect.poll(() => rp.param('period_id')).not.toBe(current);
      await expect(page.getByText(RV4_TEXT.ESTIMATED)).toBeHidden();
    },
  );

  test(
    'RV4-E03 — an invalid period_id does not crash the page',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.open(SLUG, { period_id: 'abc' });
      await expect(page.getByText(RV4_TEXT.MERCHANT_LOAD_FAILURE)).toBeHidden();
      await expect(rp.heading).toContainText('Staff Payroll');
    },
  );

  test(
    'RV4-E04 — search filters the staff list and writes ?search=',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      await openClosedPeriod(rp);
      expect(await rp.headerLabels()).toEqual(
        expect.arrayContaining([...RV4_COLUMNS.staffPayroll]),
      );
      const name = await firstWorkingName(rp);
      await rp.staffSearch.fill(name);
      await expect(page).toHaveURL(/[?&]search=/);
      await expect
        .poll(
          async () =>
            (await rp.columnTexts(0)).every((n) => n.toLowerCase().includes(name.toLowerCase())),
          {
            timeout: Timeouts.LONG,
          },
        )
        .toBe(true);
    },
  );

  test(
    'RV4-E05 — pagination moves by 30 rows; search resets to page 1',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG);
      const first = await rp.paginationCounts();
      expect(first.total <= RV4_PAGE_SIZE, 'Needs more than one page of staff').toBeFalsy();
      await expect(rp.previousPageButton).toBeDisabled();
      await rp.nextPageButton.click();
      await expect(rp.paginationRange).toHaveText(new RegExp(`^${RV4_PAGE_SIZE + 1}–`));
      await expect(rp.paginationPage).toHaveText(/^2 \/ \d+$/);
      await rp.staffSearch.fill('a');
      await expect(rp.paginationPage).toHaveText(/^1 \/ \d+$/, { timeout: Timeouts.LONG });
    },
  );

  test(
    'RV4-E06 — clicking a staff opens the By Staff · Breakdown sheet',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await openClosedPeriod(rp);
      const name = await firstWorkingName(rp);
      await rp.bodyRows.filter({ hasText: name }).first().click();
      await expect(rp.sheet).toContainText('By Staff · Breakdown');
      await expect(rp.sheet).toContainText(name);
      await expect(rp.sheet.getByRole('button', { name: 'Print' })).toBeVisible();
      await rp.page.keyboard.press('Escape');
      await expect(rp.sheet).toBeHidden();
    },
  );

  test(
    'RV4-E07 — breakdown reconciles (commission and salary staff): totals, tip by method, Pay 1 + Pay 2',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await openClosedPeriod(rp);
      const rows: string[][] = [];
      for (const r of await rp.bodyRows.all()) {
        const cells = (await r.locator('td').allInnerTexts()).map((t) =>
          t.trim().split('\n').pop()!.trim(),
        );
        if (rv4Amount(cells[1]) > 0) rows.push(cells);
      }
      const seen = new Set<string>();
      for (const row of rows.slice(0, 6)) {
        await rp.bodyRows.filter({ hasText: row[0] }).first().click();
        await expect(rp.sheet).toContainText('Total Income');
        // NB: closed-period sheets carry a "Recalculate payroll" button (a write) — never click it.
        const a = ReportsV4Page.amounts(await rp.sheet.innerText());
        const g = (k: string) => a.get(k) ?? 0;
        const kind = a.has('Staff Commission')
          ? 'commission'
          : a.has('Salary Amount')
            ? 'salary'
            : 'other';

        expect(rv4Cents(g('Total Income')), `${row[0]} total`).toBe(rv4Cents(rv4Amount(row[5])));
        expect(rv4Cents(g('Tip')), `${row[0]} tip`).toBe(
          rv4Cents(g('Card') + g('Cash') + g('Gift Card') + g('Other')),
        );
        if (a.has('Pay 1') && a.has('Pay 2')) {
          expect(rv4Cents(g('Pay 1') + g('Pay 2')), `${row[0]} split`).toBe(
            rv4Cents(g('Total Income')),
          );
        }
        if (kind === 'commission') {
          const dailySale = (
            await rp.sheet.locator('tbody tr td:nth-child(2)').allInnerTexts()
          ).reduce((s, t) => s + rv4Amount(t), 0);
          expect(rv4Cents(dailySale), `${row[0]} daily sale`).toBe(rv4Cents(g('Sale')));
          expect(rv4Cents(g('Subtotal')), `${row[0]} subtotal`).toBe(rv4Cents(rv4Amount(row[2])));
        }
        // Salary-staff Total Income formula is covered (and currently disputed) in RV4-E11.
        seen.add(kind);
        await rp.page.keyboard.press('Escape');
        await expect(rp.sheet).toBeHidden();
      }
      expect(seen.size).toBeGreaterThan(0);
    },
  );

  test(
    'RV4-E11 — salary staff: Total Income = Salary − Clean Up + Tip − Card Charge Tip for everyone',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      // BUG — stays red until fixed: Suspected bug (2026-10-20, period Aug 7–20): Andy's total includes tips, Evon's ($616 = $700 − $84) omits $220.64 tips
      await openClosedPeriod(rp);
      const names: string[] = [];
      for (const r of await rp.bodyRows.all()) {
        const cells = (await r.locator('td').allInnerTexts()).map((t) =>
          t.trim().split('\n').pop()!.trim(),
        );
        if (rv4Amount(cells[1]) > 0) names.push(cells[0]);
      }
      const mismatches: string[] = [];
      for (const name of names.slice(0, 10)) {
        await rp.bodyRows.filter({ hasText: name }).first().click();
        await expect(rp.sheet).toContainText('Total Income');
        const a = ReportsV4Page.amounts(await rp.sheet.innerText());
        const g = (k: string) => a.get(k) ?? 0;
        if (a.has('Salary Amount')) {
          const expected =
            g('Salary Amount') - g('Clean Up Fee/Deduction') + g('Tip') - g('Card Charge Tip');
          if (rv4Cents(expected) !== rv4Cents(g('Total Income'))) {
            mismatches.push(
              `${name}: expected ${expected.toFixed(2)}, shown ${g('Total Income').toFixed(2)}`,
            );
          }
        }
        await rp.page.keyboard.press('Escape');
        await expect(rp.sheet).toBeHidden();
      }
      expect(mismatches).toEqual([]);
    },
  );

  test(
    'RV4-E08 — staff with the same display name can be told apart',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      // BUG — stays red until fixed: Product gap: two "Beo" rows render identically (initials + name only, no staff code)
      await rp.openWithData(SLUG);
      const all: string[] = [];
      for (let p = 0; p < 6; p++) {
        all.push(...(await rp.bodyRows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()));
        if (await rp.nextPageButton.isDisabled()) break;
        const before = await rp.paginationRange.innerText();
        await rp.nextPageButton.click();
        await expect(rp.paginationRange).not.toHaveText(before);
      }
      const names = all.map((r) => r.split(' ').slice(1, 2).join(' '));
      const dupName = names.find((n, i) => names.indexOf(n) !== i);
      expect(!dupName, 'No duplicate display names in this period').toBeFalsy();
      const rows = all.filter((r) => r.split(' ')[1] === dupName);
      // Each same-named row must carry something distinguishing (code, phone…), not just figures.
      const identities = rows.map((r) => r.replace(/[-−]?\$[\d,]+\.\d{2}|\b\d+\b/g, '').trim());
      expect(new Set(identities).size, `rows named "${dupName}": ${rows.join(' || ')}`).toBe(
        rows.length,
      );
    },
  );

  test(
    'RV4-E09 — Staff Payroll lists every staff (no "hide zero" switch), zero rows included',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      // Current design (2026-10-20): unlike Staff Income, payroll has no "Show staff with no income"
      // switch and always lists all staff of the period.
      await rp.openWithData(SLUG);
      await expect(page.getByText(RV4_TEXT.NO_INCOME_SWITCH)).toHaveCount(0);
      await expect(rp.noIncomeSwitch).toHaveCount(0);
      const { total } = await rp.paginationCounts();
      expect(await rp.countValue()).toBe(total);
      await rp.openWithData(ReportV4Slug.STAFF_INCOME, { include_no_income: 'true' });
      expect(total, 'payroll lists as many staff as Staff Income with no-income staff shown').toBe(
        await rp.countValue(),
      );
    },
  );

  test(
    'RV4-E10 — Print inside the breakdown sheet triggers print',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.installPrintSpy();
      await openClosedPeriod(rp);
      const name = await firstWorkingName(rp);
      await rp.bodyRows.filter({ hasText: name }).first().click();
      await rp.sheet.getByRole('button', { name: 'Print' }).click();
      await expect.poll(() => rp.printCount(), { timeout: Timeouts.MEDIUM }).toBeGreaterThan(0);
    },
  );

  test(
    'VP-4852 — every staff breakdown shows "Working Days" (as the legacy payroll does)',
    {
      tag: [Tag.REGRESSION],
      annotation: { type: 'issue', description: 'https://linear.app/fastboy/issue/VP-4852' },
    },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(SLUG);
      const names: string[] = [];
      for (const r of await rp.bodyRows.all()) {
        const cells = (await r.locator('td').allInnerTexts()).map((t) =>
          t.trim().split('\n').pop()!.trim(),
        );
        if (rv4Amount(cells[1]) > 0) names.push(cells[0]);
      }
      expect(names.length, 'staff with orders in the current period').toBeGreaterThan(0);
      const missing: string[] = [];
      for (const name of names.slice(0, 8)) {
        await rp.bodyRows.filter({ hasText: name }).first().click();
        await expect(rp.sheet).toContainText('Total Income');
        if (!/Working Days/.test(await rp.sheet.innerText())) missing.push(name);
        await rp.page.keyboard.press('Escape');
        await expect(rp.sheet).toBeHidden();
      }
      expect(missing, 'staff whose breakdown lacks Working Days').toEqual([]);
    },
  );
});
