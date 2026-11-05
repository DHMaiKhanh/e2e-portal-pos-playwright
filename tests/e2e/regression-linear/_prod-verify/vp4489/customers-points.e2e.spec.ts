import * as fs from 'fs';
import type { Page } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import { PROD_STORE, SHOTS_DIR, shot } from './_shared';

/**
 * VP-4489 — PROD #20258, READ-ONLY: customers who visited on several different days, their points
 * in the Customers list / detail (Profile · Points history · Orders history) vs the API ledger, and
 * points of check-ins made under the store's current rule vs that rule.
 * Every non-GET to the POS API is aborted (except token refresh) so nothing can be written.
 */
type J = Record<string, any>;

/** Store rule in force since 2026-10-14T03:11:32Z (flag updatedAt before this run). */
const RULE_SINCE = '2026-10-14T03:11:32Z';
const RULE = { cash: 50, card: 1, other: 100, gift_card: 200 } as Record<string, number>;
const EARN_ON_TIP = true;

const CUSTOMERS = [
  { id: '019dcddf-9c3e-7194-8396-517f1d57c11d', slug: 'Ducky' },
  { id: '01a06c4a-3d3f-73df-8ccb-b3019d01ea4b', slug: 'checkin_8800' },
  { id: '01a0692d-44e9-75f9-a9b4-b7f84f0ed60e', slug: 'test_5013' },
  { id: '019fcc7a-f8d7-7ca2-8f14-ca65bff2bf6f', slug: 'Baytam' },
  { id: '01a15d41-747b-7b34-95ce-9b65840da68b', slug: 'E2E-User-5920978' },
  { id: '01a1a08a-f9b3-7247-a441-33c630837775', slug: 'New_Lam' },
  { id: '01a1a08c-7fe9-7f42-8d60-feda4c522d09', slug: 'Henta' },
];

const fmtPts = (n: number): string =>
  n > 0 ? `+${n.toLocaleString('en-US')}` : n < 0 ? `-${Math.abs(n).toLocaleString('en-US')}` : '—';

async function guard(page: Page): Promise<void> {
  await page.route(/volt-pos\./, async (route) => {
    const m = route.request().method().toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(m) || /refresh_token/.test(route.request().url()))
      return route.fallback();
    console.log('BLOCKED write', m, route.request().url());
    return route.abort();
  });
}

async function api(page: Page, path: string): Promise<J> {
  const r = await page.request.get(`${dataApiUrl}${path}`, {
    headers: { 'x-merch-id': PROD_STORE, Accept: 'application/ld+json' },
    failOnStatusCode: false,
  });
  expect(r.ok(), `GET ${path}`).toBeTruthy();
  return (await r.json()) as J;
}

/** Points the store rule gives an order (floor per tender method, tip counted when earn_on_tip). */
function expectedByRule(order: J): { pts: number; detail: string } {
  const per: Record<string, number> = {};
  for (const t of (order.orderTransactions ?? []) as J[]) {
    if (t.transactionType !== 'sale' || t.isCancelled) continue;
    per[t.paymentType] =
      (per[t.paymentType] ?? 0) + Number(t.amount) + (EARN_ON_TIP ? Number(t.tip ?? 0) : 0);
  }
  let pts = 0;
  const parts: string[] = [];
  for (const [m, c] of Object.entries(per)) {
    const rate = RULE[m];
    const p = rate ? Math.floor(c / rate) : 0;
    pts += p;
    parts.push(
      `${m} $${(c / 100).toFixed(2)}/${rate ? `$${(rate / 100).toFixed(2)}` : 'n/a'}=${p}`,
    );
  }
  return { pts, detail: parts.join(' + ') };
}

const panel = (page: Page) => page.locator('[role="tabpanel"][data-state="active"]');

test.describe('VP-4489 PROD #20258 — customer points display (read-only)', () => {
  test.beforeEach(async ({ page }) => {
    await guard(page);
  });

  test('TC06 — Customers list: Points / Total visits = ledger (overview)', async ({
    page,
    customersPage,
  }) => {
    await customersPage.goto();
    const list = await api(page, '/customers?page=1&order[createdAt]=desc');
    const rows = await customersPage.table.rows.allInnerTexts();
    const mism: string[] = [];
    for (const c of (list.member as J[]).slice(0, 15)) {
      const row = rows.find(
        (r) => r.includes(String(c.phone).slice(-4)) && r.includes(c.name ?? '—'),
      );
      if (!row) continue;
      const cells = row
        .split(/\t|\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const okPts = cells.includes(Number(c.pointBalance ?? 0).toLocaleString('en-US'));
      if (!okPts) mism.push(`${c.name}: api ${c.pointBalance} row "${row.replace(/\s+/g, ' ')}"`);
    }
    await shot(
      page,
      'VP-4489_TC06_customers_list_points_overview',
      'Customers list · Points / Total visits / Last visit',
    );
    console.log('LIST MISMATCHES', JSON.stringify(mism));
    expect(mism).toEqual([]);
  });

  for (const c of CUSTOMERS) {
    test(`TC07-09 — ${c.slug}: list + Profile + Points history + Orders history`, async ({
      page,
      customersPage,
    }) => {
      test.setTimeout(150_000);
      await customersPage.goto();
      const cust = await api(page, `/customers/${c.id}`);
      const logs = await api(
        page,
        `/customers/point_logs?page=1&customerId=${c.id}&order[updatedAt]=desc`,
      );
      const hist = await api(
        page,
        `/customers/${c.id}/order_histories?page=1&order[checkoutAt]=desc`,
      );
      const report: J = {
        slug: c.slug,
        name: cust.name,
        phone4: String(cust.phone).slice(-4),
        visits: cust.visitCount,
        points: cust.pointBalance,
        lastVisited: cust.lastVisited,
        issues: [] as string[],
        rule: [] as J[],
      };

      // ---- list row -----------------------------------------------------------------------
      await customersPage.search(String(cust.phone));
      const row = customersPage.table.rows
        .filter({ hasText: String(cust.phone).slice(-4) })
        .filter({ hasText: cust.name ?? '' })
        .first();
      await expect(row).toBeVisible();
      const rowText = (await row.innerText()).replace(/\s+/g, ' ');
      report.listRow = rowText;
      if (!rowText.includes(` ${Number(cust.pointBalance).toLocaleString('en-US')} `))
        report.issues.push(`list Points ≠ ${cust.pointBalance}: ${rowText}`);
      await shot(
        page,
        `VP-4489_TC07_${c.slug}_list_row`,
        `${cust.name} · list: visits ${cust.visitCount} · points ${cust.pointBalance}`,
      );

      // ---- profile -------------------------------------------------------------------------
      await page.goto(`/pos/nail/${PROD_STORE}/customers/${c.id}?tab=profile`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.getByRole('tab', { name: /profile/i })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Current points').first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(800);
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      const cur = /Current points (-?[\d,]+)/.exec(body)?.[1];
      const vis = /Total visits (\d+|—)/.exec(body)?.[1];
      report.profile = { currentPoints: cur, totalVisits: vis };
      if (cur?.replace(/,/g, '') !== String(cust.pointBalance))
        report.issues.push(`Profile Current points ${cur} ≠ ${cust.pointBalance}`);
      if (vis !== String(cust.visitCount))
        report.issues.push(`Profile Total visits ${vis} ≠ ${cust.visitCount}`);
      await shot(
        page,
        `VP-4489_TC07_${c.slug}_profile`,
        `${cust.name} · Current points ${cur} · Total visits ${vis}`,
      );

      // ---- points history --------------------------------------------------------------------
      await page.getByRole('tab', { name: /points history/i }).click();
      const logRows = panel(page).locator('tbody tr');
      if ((logs.totalItems ?? 0) > 0)
        await expect(logRows.first()).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(800);
      const shownLogs = (await logRows.allInnerTexts())
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      report.pointsHistory = shownLogs;
      const apiLogs = (logs.member ?? []) as J[];
      apiLogs.forEach((l, i) => {
        const r = shownLogs[i] ?? '';
        // A redeem is stored as a positive `change` and shown as a deduction ("Redeem -10").
        const shownChange =
          l.type === 'redeem'
            ? -Math.abs(Number(l.change))
            : Number(l.newPoint) - Number(l.oldPoint) || Number(l.change);
        if (!r.includes(l.description) || !r.includes(fmtPts(shownChange)))
          report.issues.push(
            `PointsHistory row ${i}: api "${l.description} ${fmtPts(shownChange)}" vs "${r}"`,
          );
      });
      // Logs written in the same second may come back in either order: the balance must equal the
      // newPoint of one of the latest-timestamp logs.
      const latestAt = apiLogs[0]?.updatedAt;
      if (
        apiLogs.length &&
        !apiLogs
          .filter((l) => l.updatedAt === latestAt)
          .some((l) => l.newPoint === cust.pointBalance)
      )
        report.issues.push(
          `latest log newPoint ${apiLogs[0].newPoint} ≠ balance ${cust.pointBalance}`,
        );
      const days = new Set(apiLogs.map((l) => String(l.updatedAt).slice(0, 10)));
      report.logDays = [...days];
      await shot(
        page,
        `VP-4489_TC08_${c.slug}_points_history`,
        `${cust.name} · Points history · ${days.size} day(s)`,
      );

      // ---- orders history --------------------------------------------------------------------
      await page.getByRole('tab', { name: /orders history/i }).click();
      const ordRows = panel(page).locator('tbody tr');
      if ((hist.totalItems ?? 0) > 0)
        await expect(ordRows.first()).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(800);
      const shownOrd = (await ordRows.allInnerTexts())
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      report.ordersHistory = shownOrd;
      const apiHist = (hist.member ?? []) as J[];
      apiHist.forEach((h, i) => {
        const r = shownOrd[i] ?? '';
        const want = fmtPts(Number(h.pointBonus ?? 0));
        if (!r.includes(` ${want} `) && !r.includes(`${want} $`))
          report.issues.push(
            `OrdersHistory row ${i}: api pointBonus ${h.pointBonus} (${want}) vs "${r}"`,
          );
      });
      const ordDays = new Set(apiHist.map((h) => String(h.checkinAt).slice(0, 10)));
      report.orderDays = [...ordDays];
      await shot(
        page,
        `VP-4489_TC09_${c.slug}_orders_history`,
        `${cust.name} · Orders history (check-ins) · ${ordDays.size} day(s)`,
      );

      // ---- rule check for check-ins checked out under the current rule ------------------------
      for (const h of apiHist) {
        if (!h.orderId || !h.checkoutAt || h.checkoutAt < RULE_SINCE) continue;
        const o = await api(page, `/orders/${h.orderId}`);
        if (!['successful', 'canceled', 'refunded', 'partial_refunded'].includes(o.status))
          continue;
        const exp = expectedByRule(o);
        report.rule.push({
          checkoutAt: h.checkoutAt,
          order: o.orderCode,
          status: o.status,
          total: o.total,
          tip: o.tipAmount,
          shown: h.pointBonus ?? 0,
          expected: exp.pts,
          calc: exp.detail,
          match: (h.pointBonus ?? 0) === exp.pts,
        });
      }

      fs.writeFileSync(`${SHOTS_DIR}/../cust-${c.slug}.json`, JSON.stringify(report, null, 2));
      console.log(
        `REPORT ${c.slug}`,
        JSON.stringify({
          issues: report.issues,
          rule: report.rule,
          logDays: report.logDays,
          orderDays: report.orderDays,
        }),
      );
      expect.soft(report.issues, 'Portal display = ledger').toEqual([]);
    });
  }
});
