import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import { PROD_STORE, SHOTS_DIR } from './_shared';

/**
 * VP-4489 PROD (read-only, GET only): for multi-visit customers, collect order histories, point
 * logs and each order's transactions so points can be checked against the store's rule.
 */
type J = Record<string, any>;

test('dump customer points data', async ({ page, customersPage }) => {
  test.setTimeout(600_000);
  await customersPage.goto();
  const h = { 'x-merch-id': PROD_STORE, Accept: 'application/ld+json' };
  const get = async (path: string): Promise<J> => {
    const r = await page.request.get(`${dataApiUrl}${path}`, {
      headers: h,
      failOnStatusCode: false,
    });
    if (!r.ok()) return { __status: r.status() };
    return (await r.json()) as J;
  };

  // Customers with >= 2 visits, newest first (3 pages = 90 customers).
  const customers: J[] = [];
  for (let p = 1; p <= 4; p++) {
    const j = await get(`/customers?page=${p}&order[createdAt]=desc`);
    customers.push(...((j.member ?? []) as J[]));
  }
  const multi = customers.filter((c) => Number(c.visitCount) >= 2);
  console.log('multi-visit customers', multi.length, 'of', customers.length);

  const out: J[] = [];
  for (const c of multi.slice(0, 25)) {
    const oh = await get(`/customers/${c.id}/order_histories?page=1&order[checkoutAt]=desc`);
    const pl = await get(`/customers/point_logs?page=1&customerId=${c.id}&order[updatedAt]=desc`);
    const orders: J[] = [];
    for (const h1 of (oh.member ?? []) as J[]) {
      if (!h1.orderId) continue;
      const o = await get(`/orders/${h1.orderId}`);
      orders.push({
        orderId: h1.orderId,
        checkinAt: h1.checkinAt,
        checkoutAt: h1.checkoutAt,
        pointBonus: h1.pointBonus,
        code: o.orderCode,
        status: o.status,
        subtotal: o.subtotal,
        total: o.total,
        tip: o.tipAmount,
        reward: o.rewardRedemptionAmount,
        tx: ((o.orderTransactions ?? []) as J[]).map((t) => ({
          type: t.transactionType,
          pay: t.paymentType,
          amount: t.amount,
          tip: t.tip,
          cancelled: t.isCancelled,
        })),
      });
    }
    out.push({
      id: c.id,
      name: c.name,
      phone4: String(c.phone ?? '').slice(-4),
      visits: c.visitCount,
      points: c.pointBalance,
      lastVisited: c.lastVisited,
      orderHistTotal: oh.totalItems,
      pointLogs: ((pl.member ?? []) as J[]).map((l) => ({
        type: l.type,
        change: l.change,
        old: l.oldPoint,
        new: l.newPoint,
        desc: l.description,
        at: l.createdAt,
      })),
      orders,
    });
  }
  fs.writeFileSync(`${SHOTS_DIR}/../customers-points-dump.json`, JSON.stringify(out, null, 2));
  expect(out.length).toBeGreaterThan(0);
});
