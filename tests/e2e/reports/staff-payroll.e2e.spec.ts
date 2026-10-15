import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RPT_COLUMNS,
  RPT_PAGE_SIZE,
  RPT_PAYROLL_BREAKDOWN_ROWS,
  RPT_TEXT,
  ReportPagesPage,
  rptAmount,
  rptBlockSort,
} from '@pages/reports/ReportPagesPage';

/**
 * Reports › Staff Payroll (TC-RPT-061 … 071). docs/test-cases/reports.md
 */
const SLUG = ReportPageSlug.STAFF_PAYROLL;
const BLOCK = 'payroll-live-by-staff';
const PERIOD_RANGE = /^[A-Z][a-z]{2} \d{1,2}, \d{4} - [A-Z][a-z]{2} \d{1,2}, \d{4}$/;

/** `Oct 8, 2026 - Oct 13, 2026` → start Date (UTC). */
const periodStart = (label: string): number => Date.parse(`${label.split(' - ')[0]} UTC`);

async function periodOptions(rp: ReportPagesPage): Promise<string[]> {
  await rp.payrollPeriodCombobox.click();
  const options = rp.page.getByRole('option');
  await expect(options.first()).toBeVisible();
  return (await options.allInnerTexts()).map((t) => t.split('\n')[0].trim());
}

/** Click the first row with orders > 0 (falls back to the first row) and return its name. */
async function openBreakdown(rp: ReportPagesPage): Promise<string> {
  await rp.clickSort('Orders'); // desc → busiest staff first
  await expect
    .poll(async () => {
      const v = (await rp.columnTexts(1)).map(rptAmount);
      return v.length > 0 && v.every((x, i) => i === 0 || v[i - 1] >= x);
    })
    .toBe(true);
  const name = (await rp.columnTexts(0))[0];
  await rp.dataRows().first().click();
  await expect(rp.page.getByText(`Thank you, ${name}!`)).toBeVisible({ timeout: Timeouts.LONG });
  // The per-day table and the money rows arrive after the header.
  await expect
    .poll(async () => /\nPay 2\n[\s\S]*?-?\$[\d,]+\.\d{2}/.test(await rp.rightPanelText()), {
      timeout: Timeouts.LONG,
    })
    .toBe(true);
  return name;
}

test.describe('Reports › Staff Payroll', () => {
  test(
    'TC-RPT-061 — defaults to the current unclosed period with live figures',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      await expect(rp.payrollPeriodCombobox).toContainText(RPT_TEXT.CURRENT_PERIOD);
      await expect(page.getByText('By Staff (live)', { exact: true })).toBeVisible();
      await expect(rp.payrollPeriodHeading).toHaveText(/^\([A-Z][a-z]{2} \d{1,2}, \d{4} - [A-Z][a-z]{2} \d{1,2}, \d{4}\)$/);
      await expect(page.getByText(RPT_TEXT.ESTIMATED)).toBeVisible();
      expect((await rp.headerLabels()).map((h) => h.toLowerCase())).toEqual(
        RPT_COLUMNS.staffPayroll.map((h) => h.toLowerCase()),
      );
    },
  );

  test(
    'TC-RPT-062 — the period list is newest first, current period on top, ranges well formed',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const labels = await periodOptions(rp);
      await expect(page.getByRole('option').first()).toContainText(RPT_TEXT.CURRENT_PERIOD);
      expect(labels.length).toBeGreaterThan(1);
      for (const l of labels) expect(l).toMatch(PERIOD_RANGE);
      const starts = labels.map(periodStart);
      starts.forEach((s, i) => i > 0 && expect(s, labels[i]).toBeLessThan(starts[i - 1]));
      await page.keyboard.press('Escape');
    },
  );

  test(
    'TC-RPT-063 — choosing a closed period switches period_id and drops the live markers',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const currentId = rp.param('period_id');
      const labels = await periodOptions(rp);
      await page.getByRole('option').nth(1).click();
      await expect.poll(() => rp.param('period_id')).not.toBe(currentId);
      await expect(rp.payrollPeriodCombobox).toHaveText(labels[1]);
      await expect(rp.payrollPeriodHeading).toHaveText(`(${labels[1]})`);
      await expect(page.getByText('By Staff', { exact: true })).toBeVisible({ timeout: Timeouts.LONG });
      await expect(page.getByText(RPT_TEXT.ESTIMATED)).toBeHidden();
    },
  );

  test(
    'TC-RPT-064 — an unknown period_id falls back to the current period',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      const bogus = '00000000-0000-0000-0000-000000000000';
      await rp.openWithData(SLUG, { period_id: bogus });
      await expect.poll(() => rp.param('period_id'), { timeout: Timeouts.LONG }).not.toBe(bogus);
      await expect(rp.payrollPeriodCombobox).toContainText(RPT_TEXT.CURRENT_PERIOD);
    },
  );

  test(
    'TC-RPT-065 — search narrows to matching staff; a miss shows the empty state',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const name = (await rp.columnTexts(0))[0];
      let before = await rp.footerText();
      await rp.staffSearch.fill(name);
      await expect(page).toHaveURL(/[?&]search=/);
      await rp.waitForFooterChange(before);
      await rp.waitForData();
      for (const n of await rp.columnTexts(0)) expect(n.toLowerCase()).toContain(name.toLowerCase());
      before = await rp.footerText();
      await rp.staffSearch.fill('zzzz-no-such-staff-xyz');
      await expect(rp.emptyRow).toBeVisible({ timeout: Timeouts.MEDIUM });
      await expect(rp.resultsFooter).toHaveText('Showing 0 to 0 of 0 results');
    },
  );

  test(
    'TC-RPT-066 — Name sorts ascending by default then descending; Orders sorts descending numerically',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      expect(await rp.sortState('Name')).toBe('ascending');
      await rp.clickSort('Name');
      expect(await rp.sortState('Name')).toBe('descending');
      expect(rptBlockSort(page.url())[BLOCK]).toBe('staffName:desc');
      await rp.clickSort('Orders');
      expect(rptBlockSort(page.url())[BLOCK]).toBe('numberOfOrders:desc');
      await expect
        .poll(async () => {
          const v = (await rp.columnTexts(1)).map(rptAmount);
          return v.length > 0 && v.every((x, i) => i === 0 || v[i - 1] >= x);
        })
        .toBe(true);
    },
  );

  test(
    'TC-RPT-067 — the staff list pages 30 rows at a time',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const { total } = await rp.footerCounts();
      test.skip(total <= RPT_PAGE_SIZE, 'Single page of staff');
      expect(await rp.dataRows().count()).toBe(RPT_PAGE_SIZE);
      await rp.nextButton.click();
      await expect(page).toHaveURL(/[?&]page=2\b/);
      await expect(rp.resultsFooter).toHaveText(`Showing 31 to ${Math.min(60, total)} of ${total} results`, {
        timeout: Timeouts.MEDIUM,
      });
    },
  );

  test(
    'TC-RPT-068 — clicking a staff row opens the per-staff payroll breakdown',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const name = await openBreakdown(rp);
      const text = await rp.rightPanelText();
      expect(text).toContain(name);
      // Commission staff (busiest first after the Orders sort) get the per-day table.
      for (const h of ['DATE', 'SALE', 'REFUND', 'SUPPLY FEE', 'TIP']) expect(text.toUpperCase()).toContain(h);
      for (const label of RPT_PAYROLL_BREAKDOWN_ROWS) expect(text, label).toContain(label);
      await expect(page.getByRole('button', { name: 'Print', exact: true })).toBeVisible();
    },
  );

  test(
    'TC-RPT-069 — breakdown arithmetic: Subtotal = Sale − Refund, Pay 1 + Pay 2 = Total Income',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(SLUG);
      await openBreakdown(rp);
      const text = await rp.rightPanelText();
      const val = (label: string): number => {
        const m = new RegExp(`\\n${label.replace(/[()]/g, '\\$&')}\\n(?:\\([^\\n]*\\)\\n)?(-?\\$[\\d,]+\\.\\d{2})`).exec(text);
        return m ? rptAmount(m[1]) : Number.NaN;
      };
      expect(val('Sale') - val('Refund')).toBeCloseTo(val('Subtotal'), 1);
      expect(val('Pay 1') + val('Pay 2')).toBeCloseTo(val('Total Income'), 1);
    },
  );

  test(
    'TC-RPT-070 — the breakdown never shows raw template placeholders',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      // Seen on DEV earlier on 2026-10-13 ("({row.rowPay1Base} x {row.rowPay1Rate})"),
      // fixed by a later deploy the same day — kept as a regression guard.
      await rp.openWithData(SLUG);
      await openBreakdown(rp);
      expect(await rp.rightPanelText()).not.toMatch(/\{row\.[^}]+\}/);
    },
  );

  test(
    'TC-RPT-071 — the row Total Income equals the breakdown Total Income',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(SLUG);
      await openBreakdown(rp);
      const rowTotal = rptAmount((await rp.columnTexts(5))[0]);
      const m = /\nTotal Income\n(?:\([^\n]*\)\n)?(-?\$[\d,]+\.\d{2})/.exec(await rp.rightPanelText());
      expect(m, 'Total Income in breakdown').not.toBeNull();
      expect(rptAmount(m![1])).toBeCloseTo(rowTotal, 2);
    },
  );

  test(
    'TC-RPT-107 — a staff with no figures shows the "No data" breakdown without Print',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      const zeroIdx = await rp.dataRows().evaluateAll((rows) =>
        rows.findIndex((r) =>
          [...r.querySelectorAll('td')].slice(1).every((td) => /^(?:0|\$0\.00)$/.test((td.textContent ?? '').trim())),
        ),
      );
      test.skip(zeroIdx < 0, 'No all-zero staff row on the first page');
      const name = (await rp.columnTexts(0))[zeroIdx];
      await rp.dataRows().nth(zeroIdx).click();
      await expect(page.getByText(`Thank you, ${name}!`)).toBeVisible({ timeout: Timeouts.LONG });
      await expect(page.getByText('This staff has no figures for the selected period yet.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Print', exact: true })).toHaveCount(0);
    },
  );
});
