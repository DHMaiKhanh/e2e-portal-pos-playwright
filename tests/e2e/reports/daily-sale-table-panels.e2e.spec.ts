import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  RPT_COLUMNS,
  RPT_CURRENCY,
  RPT_INCOME_DETAIL_ROWS,
  RPT_ORDER_CODE,
  RPT_PAGE_SIZE,
  RPT_PAYMENT_DETAIL_ROWS,
  ReportPagesPage,
  rptAmount,
  rptParseRows,
  type RptValueRow,
} from '@pages/reports/ReportPagesPage';

/**
 * Reports › Daily Sale Report — bảng Order Details & panel (TC-RPT-026 … 034).
 */
const SLUG = ReportPageSlug.DAILY_SALE;

async function openWithRows(rp: ReportPagesPage): Promise<void> {
  test.skip((await rp.openDailyWithRows()) === null, 'No orders today or yesterday — nothing to assert');
}

/** First value whose label starts with `label` (labels may carry a sub-caption). */
const valueOf = (rows: RptValueRow[], label: string): number =>
  rptAmount(rows.find((r) => r.label === label || r.label.startsWith(`${label} `))?.value ?? '');

async function detailSections(rp: ReportPagesPage): Promise<{ income: RptValueRow[]; payment: RptValueRow[] }> {
  // The detail panels load through their own block request — wait for both.
  await expect
    .poll(
      async () =>
        /INCOME DETAIL\s*-?\$[\s\S]*Total Payment\s*-?\$[\s\S]*PAYMENT DETAIL\s*-?\$[\s\S]*Total Payment\s*-?\$/.test(
          await rp.rightPanelText(),
        ),
      { timeout: Timeouts.LONG },
    )
    .toBe(true);
  const text = await rp.rightPanelText();
  const income = ReportPagesPage.section(text, 'INCOME DETAIL', ['PAYMENT DETAIL']);
  const payment = ReportPagesPage.section(text, 'PAYMENT DETAIL', ['INCOME DETAIL']);
  return {
    income: rptParseRows(income.replace(/^INCOME DETAIL/, 'HEADER')),
    payment: rptParseRows(payment.replace(/^PAYMENT DETAIL/, 'HEADER')),
  };
}

test.describe('Reports › Daily Sale — Order Details & detail panels', () => {
  test(
    'TC-RPT-026 — Order Details has the five columns in order',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      await expect(page.getByText('Order Details', { exact: true })).toBeVisible();
      expect((await rp.headerLabels()).map((h) => h.toLowerCase())).toEqual(
        RPT_COLUMNS.dailySale.map((h) => h.toLowerCase()),
      );
    },
  );

  test(
    'TC-RPT-027 — every row shows an order code button and currency amounts',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await openWithRows(rp);
      const rows = await rp.dataRows().count();
      expect(rows).toBeLessThanOrEqual(RPT_PAGE_SIZE);
      for (const code of await rp.columnTexts(0)) expect(code).toMatch(RPT_ORDER_CODE);
      for (let c = 1; c <= 4; c++) {
        for (const v of await rp.columnTexts(c)) expect(v).toMatch(RPT_CURRENCY);
      }
      await expect(rp.dataRows().first().getByRole('button', { name: /^#OD/ })).toBeVisible();
    },
  );

  test(
    'TC-RPT-028 — Total = Sale/Refund + Tax + Tip on every row',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await openWithRows(rp);
      const cols = await Promise.all([1, 2, 3, 4].map((c) => rp.columnTexts(c)));
      cols[0].forEach((_, i) => {
        const [sale, tax, tip, total] = cols.map((col) => rptAmount(col[i]));
        expect(Math.abs(sale + tax + tip - total), `row ${i + 1}`).toBeLessThan(0.011);
      });
    },
  );

  test(
    'TC-RPT-029 — Next / Previous page through orders and keep ?page= in the URL',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await openWithRows(rp);
      const { total } = await rp.footerCounts();
      test.skip(total <= RPT_PAGE_SIZE, 'Only one page of orders today');
      await expect(rp.previousButton).toBeDisabled();
      await expect(rp.pageIndicator).toHaveText(new RegExp(`^1 / ${Math.ceil(total / RPT_PAGE_SIZE)}$`));
      const firstCode = (await rp.columnTexts(0))[0];
      await rp.nextButton.click();
      await expect(page).toHaveURL(/[?&]page=2\b/);
      await expect(rp.resultsFooter).toHaveText(
        `Showing 31 to ${Math.min(60, total)} of ${total} results`,
        { timeout: Timeouts.MEDIUM },
      );
      await expect(rp.pageIndicator).toHaveText(/^2 \/ \d+$/);
      await expect.poll(async () => (await rp.columnTexts(0))[0]).not.toBe(firstCode);
      await rp.previousButton.click();
      await expect(rp.pageIndicator).toHaveText(/^1 \/ \d+$/, { timeout: Timeouts.MEDIUM });
    },
  );

  test(
    'TC-RPT-030 — clicking an order code opens its detail dialog; Escape closes it',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      await openWithRows(rp);
      const urlBefore = page.url();
      const code = (await rp.columnTexts(0))[0].replace(/ \(Refund\)$/, '');
      await rp.dataRows().first().getByRole('button', { name: /^#OD/ }).click();
      await expect(rp.orderDialog).toBeVisible({ timeout: Timeouts.LONG });
      await expect(rp.orderDialog).toContainText(code);
      for (const section of ['Order Information', 'Service Details', 'Payment Details', 'Activity Log']) {
        await expect(rp.orderDialog.getByText(section, { exact: true }).first()).toBeVisible();
      }
      expect(page.url()).toBe(urlBefore);
      await page.keyboard.press('Escape');
      await expect(rp.orderDialog).toBeHidden();
    },
  );

  test(
    'TC-RPT-031 — INCOME DETAIL lists its rows, totals to Total Payment and collapses',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await openWithRows(rp);
      const { income } = await detailSections(rp);
      for (const label of RPT_INCOME_DETAIL_ROWS) expect(Number.isNaN(valueOf(income, label)), label).toBe(false);
      const header = valueOf(income, 'HEADER');
      expect(header).toBeCloseTo(valueOf(income, 'Total Payment'), 2);
      const sum = valueOf(income, 'Sale') + valueOf(income, 'Tip') + valueOf(income, 'Tax Collected');
      expect(sum).toBeCloseTo(valueOf(income, 'Total Payment'), 1);
      await expect(rp.incomeDetailTrigger).toHaveAttribute('aria-expanded', 'true');
      await rp.incomeDetailTrigger.click();
      await expect(rp.incomeDetailTrigger).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByText('Tax Collected', { exact: true })).toBeHidden();
      await rp.incomeDetailTrigger.click();
      await expect(page.getByText('Tax Collected', { exact: true })).toBeVisible();
    },
  );

  test(
    'TC-RPT-032 — PAYMENT DETAIL: Card + Cash + Others = Amount Collected; + Gift Card = Total Payment',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await openWithRows(rp);
      const { payment } = await detailSections(rp);
      for (const label of RPT_PAYMENT_DETAIL_ROWS) expect(Number.isNaN(valueOf(payment, label)), label).toBe(false);
      const collected = valueOf(payment, 'Card') + valueOf(payment, 'Cash') + valueOf(payment, 'Others');
      expect(collected).toBeCloseTo(valueOf(payment, 'Amount Collected'), 1);
      expect(valueOf(payment, 'Amount Collected') + valueOf(payment, 'Gift Card Redemption')).toBeCloseTo(
        valueOf(payment, 'Total Payment'),
        1,
      );
    },
  );

  test(
    'TC-RPT-033 — KPI Total Payment equals both detail-panel headers',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await openWithRows(rp);
      const kpi = rptAmount(
        (await rp.kpiTile('Total Payment').innerText()).split('\n').map((l) => l.trim()).filter(Boolean)[1],
      );
      const { income, payment } = await detailSections(rp);
      expect(valueOf(income, 'HEADER')).toBeCloseTo(kpi, 2);
      expect(valueOf(payment, 'HEADER')).toBeCloseTo(kpi, 2);
    },
  );

  test(
    'TC-RPT-034 — an out-of-range ?page= clamps to a valid page',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      test.fail(true, 'Product bug: page=99 renders "99 / 1" with an empty table instead of clamping');
      await rp.open(SLUG, { page: '99' });
      await rp.waitForData();
      await expect(rp.pageIndicator).not.toHaveText(/^99 \//, { timeout: Timeouts.SHORT });
    },
  );
});
