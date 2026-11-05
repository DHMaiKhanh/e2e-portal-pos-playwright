import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import type { Page, Response } from '@playwright/test';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import type { PayrollPage } from '@pages/payroll/PayrollPage';

/**
 * VP-3356 / VP-3891 — POS hid Staff Payroll rows with orders but $0 total income; the Portal's
 * Staff Payroll is the reference the POS must match. These cases pin that reference down.
 * Test cases: docs/test-cases/staff-payroll-zero-income.md
 *
 * Read-only. Rows come from `POST /v4/report_queries/staff-by-staff/run` (all staff at once,
 * amounts in cents) and are paged client-side, 30 per page, in response order.
 */

interface PayrollRow {
  staffName: string;
  numberOfOrders: number;
  subtotal: number;
  supplyFee: number;
  tip: number;
  totalIncome: number;
}

interface RunResult {
  params: Record<string, string>;
  rows: PayrollRow[];
  totalRows: number;
}

const PAGE_SIZE = 30;
const RUN_PATH = /\/v4\/report_queries\/staff-by-staff\/run$/;

/** Cents → the Portal's money text: `$1,172.99`, negatives with U+2212: `−$22.88`. */
const money = (cents: number): string =>
  `${cents < 0 ? '−' : ''}$${(Math.abs(cents) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const isRun = (r: Response): boolean =>
  RUN_PATH.test(new URL(r.url()).pathname) && r.request().method() === 'POST';

async function readRun(res: Response): Promise<RunResult> {
  const body = (await res.json()) as { rows: PayrollRow[]; total_rows: number };
  const params = (res.request().postDataJSON() as { params: Record<string, string> }).params;
  return { params, rows: body.rows, totalRows: body.total_rows };
}

/** Opens Staff Payroll at `pageNo` (optionally for a period) and returns the report it ran. */
async function openStaffPayroll(
  page: Page,
  payroll: PayrollPage,
  pageNo = 1,
  periodId?: string | null,
): Promise<RunResult> {
  const qs = new URLSearchParams({ tab: 'staff-payroll', page: String(pageNo) });
  if (periodId) qs.set('periodId', periodId);
  const run = page.waitForResponse((r) => isRun(r) && r.ok(), { timeout: Timeouts.NAVIGATION });
  await page.goto(`${Urls.PAYROLL}?${qs}`, { waitUntil: 'domcontentloaded' });
  const result = await readRun(await run);
  await payroll.waitForStaffPayrollRows();
  return result;
}

/** Visible table rows as [name, orders, subtotal, supply fee, tip, total income]. */
async function tableRows(payroll: PayrollPage): Promise<string[][]> {
  return (await payroll.staffPayrollTable.rows.allInnerTexts()).map((row) =>
    row.split('\t').map((cell) => cell.trim().split('\n').pop()!.trim()),
  );
}

const expectedCells = (r: PayrollRow): string[] => [
  r.staffName,
  String(r.numberOfOrders),
  money(r.subtotal),
  money(r.supplyFee),
  money(r.tip),
  money(r.totalIncome),
];

const zeroIncomeWithOrders = (rows: PayrollRow[]): number =>
  rows.findIndex((r) => r.numberOfOrders > 0 && r.totalIncome === 0);

test.describe('VP-3356 / VP-3891 — Staff Payroll hiện staff Total Income $0', () => {
  test(
    'TC-VP3356-01 — kỳ Unclosed truy vấn kèm include_no_income',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ page, payrollPage }) => {
      const run = await openStaffPayroll(page, payrollPage);
      await expect(payrollPage.payPeriodCombobox).toContainText('Current Period (Unclosed)');
      expect(run.params.include_no_income).toBe('true');
      expect(run.params.after).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(run.params.before).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    },
  );

  test(
    'TC-VP3356-02 — bảng liệt kê đủ mọi staff của báo cáo',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, payrollPage }) => {
      const run = await openStaffPayroll(page, payrollPage);
      expect(run.rows).toHaveLength(run.totalRows);
      await expect(payrollPage.paginationSummary).toHaveText(
        new RegExp(`of ${run.totalRows.toLocaleString('en-US')}$`),
      );
    },
  );

  test(
    'TC-VP3356-03 — số liệu từng dòng trang 1 khớp báo cáo',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, payrollPage }) => {
      const run = await openStaffPayroll(page, payrollPage);
      const expected = run.rows.slice(0, PAGE_SIZE).map(expectedCells);
      await expect.poll(async () => tableRows(payrollPage)).toEqual(expected);
    },
  );

  test(
    'TC-VP3356-04 — staff có Orders > 0 nhưng Total income $0 vẫn hiện $0.00',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.CRITICAL] },
    async ({ page, payrollPage }) => {
      const run = await openStaffPayroll(page, payrollPage);
      const index = zeroIncomeWithOrders(run.rows);
      test.skip(index < 0, 'kỳ hiện tại không có staff Orders > 0 và Total income $0');
      const staff = run.rows[index];

      await openStaffPayroll(page, payrollPage, Math.floor(index / PAGE_SIZE) + 1);
      const shown = (await tableRows(payrollPage)).find((cells) => cells[0] === staff.staffName);
      expect(shown, `dòng của ${staff.staffName}`).toEqual(expectedCells(staff));
      expect(shown![5]).toBe('$0.00');
    },
  );

  test(
    'TC-VP3356-05 — mở chi tiết staff income $0 không lỗi',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, payrollPage }) => {
      const run = await openStaffPayroll(page, payrollPage);
      const index = zeroIncomeWithOrders(run.rows);
      test.skip(index < 0, 'kỳ hiện tại không có staff Orders > 0 và Total income $0');
      const staff = run.rows[index];

      await openStaffPayroll(page, payrollPage, Math.floor(index / PAGE_SIZE) + 1);
      await payrollPage.staffPayrollTable.rows
        .filter({ has: page.getByText(staff.staffName, { exact: true }) })
        .first()
        .click();

      const panel = page.locator('[role="tabpanel"][data-state="active"]');
      await expect(panel.getByText(`Thank you, ${staff.staffName}!`)).toBeVisible({
        timeout: Timeouts.MEDIUM,
      });
      await expect(panel).toContainText(/Total income\s*\$0\.00\s*\(Staff Commission/);
      await expect(page.getByText(/couldn't load/i)).toHaveCount(0);
    },
  );

  test(
    'TC-VP3356-06 — kỳ đã đóng cũng liệt kê đủ staff, kể cả income $0',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, payrollPage }) => {
      await openStaffPayroll(page, payrollPage);
      await payrollPage.payPeriodCombobox.click();
      const closed = page.getByRole('option').filter({ hasNotText: 'Current Period' }).first();
      test.skip((await closed.count()) === 0, 'store chưa có kỳ payroll nào đã đóng');

      // A closed period reads the frozen rows instead of running the report, paged by the server.
      const frozen = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === '/staff_payrolls' &&
          r.request().method() === 'GET' &&
          r.ok(),
        { timeout: Timeouts.NAVIGATION },
      );
      await closed.click();
      const body = (await (await frozen).json()) as {
        totalItems: number;
        member: (Omit<PayrollRow, 'staffName' | 'supplyFee'> & { staff: { nickname: string } })[];
      };
      await payrollPage.waitForStaffPayrollRows();

      await expect(payrollPage.paginationSummary).toHaveText(
        new RegExp(`of ${body.totalItems.toLocaleString('en-US')}$`),
      );
      // Same columns minus Supply fee, whose frozen field differs from the live report's.
      const pick = (c: string[]): string[] => [c[0], c[1], c[2], c[4], c[5]];
      const expected = body.member.map((r) => [
        r.staff.nickname,
        String(r.numberOfOrders),
        money(r.subtotal),
        money(r.tip),
        money(r.totalIncome),
      ]);
      await expect.poll(async () => (await tableRows(payrollPage)).map(pick)).toEqual(expected);

      const zeroRows = body.member.filter((r) => r.numberOfOrders > 0 && r.totalIncome === 0);
      for (const r of zeroRows) {
        expect(
          expected.map((c) => c[0]),
          `${r.staff.nickname} (income $0) có trong bảng`,
        ).toContain(r.staff.nickname);
      }
    },
  );
});
