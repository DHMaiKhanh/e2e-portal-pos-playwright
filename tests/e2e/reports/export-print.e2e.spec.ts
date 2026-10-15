import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RPT_CSV_HEADERS,
  RPT_DATA_PAGES,
  RPT_EXPORT_ITEMS,
  RPT_PAGE_SIZE,
  rptIsoDay,
} from '@pages/reports/ReportPagesPage';

/**
 * Reports — Export & Print (TC-RPT-076 … 086). Export/Print chỉ đọc; không có
 * thao tác ghi dữ liệu nào.
 */

/** CSV data lines (header excluded). */
const dataLines = (csv: string): string[] => csv.trim().split(/\r?\n/).slice(1).filter(Boolean);

test.describe('Reports — Export & Print', () => {
  test(
    'TC-RPT-076 — every data report offers Download CSV and Download Excel',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      test.setTimeout(180_000);
      for (const spec of RPT_DATA_PAGES) {
        // Export is disabled while a block has no rows — use a day with orders.
        if (spec.slug === ReportPageSlug.DAILY_SALE) {
          test.skip((await rp.openDailyWithRows()) === null, 'No Daily Sale orders today or yesterday');
        } else {
          await rp.openWithData(spec.slug);
        }
        await expect(rp.exportButton).toHaveAttribute('aria-haspopup', 'menu');
        await rp.exportButton.click();
        await expect(page.getByRole('menuitem')).toHaveText([...RPT_EXPORT_ITEMS]);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('menuitem')).toHaveCount(0);
      }
    },
  );

  test(
    'TC-RPT-077 — Daily Sale CSV is named after the day and carries the table header',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp }) => {
      const day = rptIsoDay(-1);
      await rp.openWithData(ReportPageSlug.DAILY_SALE, { after: day, before: day });
      const { name, text } = await rp.downloadText('CSV');
      expect(name).toBe(`income-daily-sale-${day}-${day}.csv`);
      expect(text.split(/\r?\n/)[0]).toBe(RPT_CSV_HEADERS.dailySale);
      for (const line of dataLines(text)) expect(line).toMatch(/^#OD\d{6}-\d{8}/);
    },
  );

  test(
    'TC-RPT-078 — Daily Sale Excel downloads a real .xlsx (zip) file',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      const day = await rp.openDailyWithRows();
      test.skip(day === null, 'No Daily Sale orders today or yesterday');
      const { name, bytes } = await rp.downloadText('Excel');
      expect(name).toBe(`income-daily-sale-${day}-${day}.xlsx`);
      expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
      expect(bytes.length).toBeGreaterThan(1000);
    },
  );

  test(
    'TC-RPT-079 — Income Summary CSV is named after the range and has one line per day',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      const after = rptIsoDay(-7);
      const before = rptIsoDay(-1);
      await rp.openWithData(ReportPageSlug.INCOME_SUMMARY, { after, before });
      const { name, text } = await rp.downloadText('CSV');
      expect(name).toBe(`income-summary-${after}-${before}.csv`);
      expect(text.split(/\r?\n/)[0]).toBe(RPT_CSV_HEADERS.incomeSummary);
      expect(dataLines(text)).toHaveLength(7);
    },
  );

  test(
    'TC-RPT-080 — Staff Income CSV is named after the range and matches the row count',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(ReportPageSlug.STAFF_INCOME);
      const { total } = await rp.footerCounts();
      const { name, text } = await rp.downloadText('CSV');
      const today = rptIsoDay(0);
      expect(name).toBe(`income-staff-${today}-${today}.csv`);
      expect(text.split(/\r?\n/)[0]).toBe(RPT_CSV_HEADERS.staffIncome);
      expect(dataLines(text)).toHaveLength(Math.min(total, RPT_PAGE_SIZE));
    },
  );

  test(
    'TC-RPT-081 — Staff Payroll CSV (current period) is a live-by-staff export with the table header',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(ReportPageSlug.STAFF_PAYROLL);
      const { name, text } = await rp.downloadText('CSV');
      expect(name).toMatch(/^payroll-live-by-staff-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(text.split(/\r?\n/)[0]).toBe(RPT_CSV_HEADERS.staffPayroll);
    },
  );

  test(
    'TC-RPT-082 — the Staff Payroll file name reflects the selected payroll period',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      test.fail(true, 'Product bug: payroll export is named for month-start..today, not the selected period');
      await rp.openWithData(ReportPageSlug.STAFF_PAYROLL);
      const label = (await rp.payrollPeriodCombobox.innerText()).split('\n')[0].replace(/\s*·.*$/, '').trim();
      const [from, to] = label.split(' - ').map((d) => new Date(`${d} UTC`).toISOString().slice(0, 10));
      const { name } = await rp.downloadText('CSV');
      expect(name).toBe(`payroll-live-by-staff-${from}-${to}.csv`);
    },
  );

  test(
    'TC-RPT-083 — CSV export contains every result, not only the visible page',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(ReportPageSlug.STAFF_PAYROLL);
      const { total } = await rp.footerCounts();
      test.skip(total <= RPT_PAGE_SIZE, 'Single page — cannot tell page vs full export apart');
      test.fail(true, 'Product bug: Export writes only the 30 rows of the current page');
      const { text } = await rp.downloadText('CSV');
      expect(dataLines(text)).toHaveLength(total);
    },
  );

  test(
    'TC-RPT-084 — Print on a Staff Payroll breakdown prints that staff payslip through a print frame',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      // Daily Sale had a page-level Print at the first scan; a config change on
      // DEV the same day removed it, so the payslip Print is the stable target.
      await rp.installPrintSpy();
      await rp.openWithData(ReportPageSlug.STAFF_PAYROLL);
      // A staff with no figures gets "No data" and no Print — take the busiest one.
      await rp.clickSort('Orders');
      await expect
        .poll(async () => {
          const v = (await rp.columnTexts(1)).map((t) => Number(t.replace(/,/g, '')));
          return v.length > 0 && v[0] > 0 && v.every((x, i) => i === 0 || v[i - 1] >= x);
        })
        .toBe(true);
      const name = (await rp.columnTexts(0))[0];
      await rp.dataRows().first().click();
      await expect(page.getByText(`Thank you, ${name}!`)).toBeVisible({ timeout: Timeouts.LONG });
      await page.getByRole('button', { name: 'Print', exact: true }).last().click();
      await expect.poll(async () => (await rp.printCalls()).length, { timeout: Timeouts.MEDIUM }).toBe(1);
      const printed = (await rp.printCalls())[0];
      expect(printed).toContain(name);
      expect(printed).toContain('Total Income');
    },
  );

  test(
    'TC-RPT-085 — Print on Staff Income prints the staff table',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.installPrintSpy();
      await rp.openWithData(ReportPageSlug.STAFF_INCOME);
      await rp.printButton.click();
      await expect.poll(async () => (await rp.printCalls()).length, { timeout: Timeouts.MEDIUM }).toBe(1);
      const printed = (await rp.printCalls())[0];
      expect(printed).toContain('By Staff');
      expect(printed.toUpperCase()).toContain('TOTAL INCOME');
    },
  );

  test(
    'TC-RPT-086 — Export and Print send no write request (POST/PUT/PATCH/DELETE)',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.installPrintSpy();
      await rp.openWithData(ReportPageSlug.STAFF_INCOME);
      const writes: string[] = [];
      page.on('request', (r) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method()) && /volt-pos\.|\/api\//.test(r.url())) {
          writes.push(`${r.method()} ${r.url()}`);
        }
      });
      await rp.downloadText('CSV');
      await rp.downloadText('Excel');
      await rp.printButton.click();
      await expect.poll(async () => (await rp.printCalls()).length).toBe(1);
      expect(writes).toEqual([]);
    },
  );
});
