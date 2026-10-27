import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { reportV4Url } from '@constants/urls';
import { env } from '@configs/env/loadEnv';
import { ReportV4Api, usd } from '@pages/reports-v4/ReportV4Api';
import { rv4Amount } from '@pages/reports-v4/ReportsV4Page';

/**
 * Reports V4 › data verification (Linear VP-4857: VP-4862, 4864, 4865, 4866, 4867) on store #14.
 * docs/test-cases/report-v4-master.md §C.
 *
 * Reconciled through the same block API the pages use (read-only, cents, all pages walked):
 *   Order Details (income-daily-sale)  ↔ Daily Summary (income-daily-kpi)
 *   Sale Income by Hour (income-sale-by-hour) ↔ Daily Summary
 *   Staff Income tiles (income-staff-summary-panel) ↔ Daily Summary
 * Bug dates come from the Linear issues; the extra dates widen the net for similar mismatches.
 * Each check is a soft assertion, so one run lists every mismatch of the day.
 */
const issue = (id: string) => ({
  type: 'issue',
  description: `https://linear.app/fastboy/issue/${id}`,
});
const STORE = '14';

const BUG_DATES = [
  '2026-04-27',
  '2026-05-12',
  '2026-05-14',
  '2026-06-17',
  '2026-07-08',
  '2026-08-10',
  '2026-08-11',
  '2026-09-21',
  '2026-10-01',
  '2026-10-02',
  '2026-10-14',
  '2026-10-15',
  '2026-10-19',
];
const EXTRA_DATES = [
  '2026-04-15',
  '2026-06-01',
  '2026-07-15',
  '2026-08-18',
  '2026-09-10',
  '2026-10-07',
];

test.describe('Reports V4 › data verification (store #14, API)', () => {
  for (const day of [...BUG_DATES, ...EXTRA_DATES]) {
    test(
      `VP-4862/4864/4865/4866/4867 — ${day}: Order Details, hourly chart and Staff Income reconcile with Daily Summary`,
      {
        tag: [Tag.REGRESSION, Tag.API],
        annotation: ['VP-4862', 'VP-4864', 'VP-4865', 'VP-4866', 'VP-4867'].map(issue),
      },
      async ({ page }) => {
        const api = new ReportV4Api(page);
        await api.ready(STORE);
        const kpi = await api.summary('income-daily-kpi', STORE, day);
        const orders = await api.rowsAll('income-daily-sale', STORE, day);
        const hourly = await api.rowsAll('income-sale-by-hour', STORE, day);
        const staff = await api.summary('income-staff-summary-panel', STORE, day);
        const n = (k: string) => Number(kpi[k] ?? 0);

        // VP-4862 — "N orders" of Order Details = Total Orders
        expect
          .soft(
            orders,
            `[VP-4862] ${day} Order Details rows vs Total Orders ${n('numberOfOrders')}`,
          )
          .toHaveLength(n('numberOfOrders'));
        // VP-4864 — Σ Order Details = Sale Income / Total Payment
        const sale = ReportV4Api.sum(orders, 'netSaleAmount');
        const total = ReportV4Api.sum(orders, 'netTotal');
        expect
          .soft(usd(sale), `[VP-4864] ${day} Σ Sale/Refund vs Sale Income`)
          .toBe(usd(n('dailySaleSale')));
        expect
          .soft(usd(total), `[VP-4864] ${day} Σ Total vs Total Payment`)
          .toBe(usd(n('dailySaleTotalPayment')));
        // VP-4866 — Σ Tip = Total Tip
        expect
          .soft(usd(ReportV4Api.sum(orders, 'netTipAmount')), `[VP-4866] ${day} Σ Tip vs Total Tip`)
          .toBe(usd(n('dailySaleTip')));
        // VP-4865 — Σ hourly chart = Sale Income
        expect
          .soft(
            usd(ReportV4Api.sum(hourly, 'netSaleAmount')),
            `[VP-4865] ${day} Σ Sale Income by Hour vs Sale Income`,
          )
          .toBe(usd(n('dailySaleSale')));
        // VP-4867 — Staff Income Tip = Daily Sale Total Tip
        expect
          .soft(
            usd(Number(staff.tip ?? 0)),
            `[VP-4867] ${day} Staff Income Tip vs Daily Sale Total Tip`,
          )
          .toBe(usd(n('dailySaleTip')));
        // (A Staff Income total far below zero — e.g. −$96k on 2026-05-12 — was traced to test data:
        // staff "Erin" has a $100,000 Clean Up Fee; v1 shows the same. Not asserted here.)
      },
    );
  }

  test(
    'VP-4862 — UI: "N orders" of Order Details equals the Total Orders tile (store #14, 2026-05-12)',
    { tag: [Tag.REGRESSION, Tag.UI], annotation: issue('VP-4862') },
    async ({ reportsV4Page: rp, page }) => {
      await page.goto(
        `${reportV4Url('daily-sale-report', `/pos/${env.POS_SEGMENT}/${STORE}`)}?after=2026-05-12&before=2026-05-12`,
      );
      await rp.waitForReady();
      await rp.waitForData();
      expect(await rp.countValue(), 'Order Details count').toBe(
        rv4Amount(await rp.statValue('Total Orders')),
      );
    },
  );
});
