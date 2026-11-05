import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { OUT_DIR, apiGet, readOnlyGuard, type J } from './_shared';

/**
 * VP-4590 PROD #20258 — READ-ONLY (GET only; every other method to the POS API is aborted):
 * flag change timeline, orders since 2026-10-10, their check-in point logs, and the POS device /
 * app version that created a sample of them (entity history device_id → /devices/{id}).
 */
const FLAG_ID = '01a0bf25-9ac6-732b-8504-a1d0eedc8356';

test('VP-4590 data dump (read-only)', async ({ page, customersPage }) => {
  test.setTimeout(900_000);
  expect(env.STORE_ID).toBe('20258');
  await readOnlyGuard(page);
  await customersPage.goto();

  // 1. Flag timeline -------------------------------------------------------------------------
  const hist: J[] = [];
  for (let p = 1; p < 10; p++) {
    const j = await apiGet(
      page,
      `/entity_histories?entity_type=sys_setting&entity_id=${FLAG_ID}&order[changedAt]=desc&page=${p}`,
    );
    const m = (j.member ?? []) as J[];
    hist.push(...m);
    if (!m.length || !j.view?.next) break;
  }
  const timeline = hist
    .map((h) => {
      const parse = (s: unknown) => {
        try {
          return typeof s === 'string' ? JSON.parse(s) : s;
        } catch {
          return s;
        }
      };
      return {
        at: h.changedAt,
        op: h.operation,
        by: h.author?.name ?? h.author?.email ?? null,
        uri: h.author?.uri ?? null,
        before: parse(h.dataBefore?.value),
        after: parse(h.dataAfter?.value),
      };
    })
    .reverse();
  fs.writeFileSync(`${OUT_DIR}/flag-timeline.json`, JSON.stringify(timeline, null, 1));

  // 2. Orders since 2026-10-10 ----------------------------------------------------------------
  const orders: J[] = [];
  for (let p = 1; p < 30; p++) {
    const j = await apiGet(
      page,
      `/orders?page=${p}&itemsPerPage=100&status[]=successful&status[]=refunded&status[]=partial_refunded&date_range[completedAt][after]=2026-10-10T00:00:00.000Z&date_range[completedAt][before]=2026-11-04T00:00:00.000Z&order[completedAt]=desc`,
    );
    const m = (j.member ?? []) as J[];
    for (const o of m) delete o.merchant;
    orders.push(...m);
    if (!m.length || !j.view?.next) break;
  }
  fs.writeFileSync(`${OUT_DIR}/orders.json`, JSON.stringify(orders, null, 1));
  console.log('orders', orders.length);

  // 3. Customers + point logs of customers who appear on those orders --------------------------
  const customers: J[] = [];
  for (let p = 1; p < 40; p++) {
    const j = await apiGet(page, `/customers?page=${p}&itemsPerPage=100&order[createdAt]=desc`);
    const m = (j.member ?? []) as J[];
    customers.push(...m);
    if (!m.length || !j.view?.next) break;
  }
  const names = new Set(orders.map((o) => o.customerName).filter(Boolean));
  const logs: Record<string, J> = {};
  for (const c of customers.filter((x) => names.has(x.name))) {
    const all: J[] = [];
    for (let p = 1; p < 10; p++) {
      const j = await apiGet(
        page,
        `/customers/point_logs?page=${p}&customerId=${c.id}&order[updatedAt]=desc`,
      );
      const m = (j.member ?? []) as J[];
      all.push(...m);
      if (!m.length || !j.view?.next) break;
    }
    logs[c.id] = {
      name: c.name,
      phone4: String(c.phone ?? '').slice(-4),
      pointBalance: c.pointBalance,
      visitCount: c.visitCount,
      logs: all,
    };
  }
  fs.writeFileSync(`${OUT_DIR}/point-logs.json`, JSON.stringify(logs, null, 1));
  console.log('customers', customers.length, 'with orders', Object.keys(logs).length);

  // 4. Order details for orders with a customer (transactions → expected points) ---------------
  const details: J[] = [];
  for (const o of orders.filter((x) => x.customerName)) {
    const d = await apiGet(page, `/orders/${o.id}`);
    details.push({
      id: o.id,
      orderCode: d.orderCode,
      status: d.status,
      completedAt: d.completedAt,
      remoteOrderId: o.remoteOrderId ?? d.remoteOrderId,
      customerName: o.customerName,
      customerId: d.customer?.id ?? d.customerId ?? null,
      total: d.total,
      tipAmount: d.tipAmount,
      tx: ((d.orderTransactions ?? []) as J[]).map((t) => ({
        type: t.transactionType,
        pay: t.paymentType,
        amount: t.amount,
        tip: t.tip,
        cancelled: t.isCancelled,
      })),
    });
  }
  fs.writeFileSync(`${OUT_DIR}/order-details.json`, JSON.stringify(details, null, 1));
  console.log('details', details.length);

  // 5. Device / app version behind every customer order ------------------------------------------
  const devCache: Record<string, J> = {};
  const orderDevices: Record<string, J> = {};
  for (const d of details) {
    const r = await page.request.get(
      `https://volt-pos.v2.fastboypay.com/entity_histories?root_entity_type=order&root_entity_id=${d.id}&order[changedAt]=asc&page=1`,
      {
        headers: { 'x-merch-id': '20258', Accept: 'application/ld+json' },
        failOnStatusCode: false,
      },
    );
    const text = await r.text();
    const devices = [...new Set([...text.matchAll(/"device_id":"([^"]+)"/g)].map((m) => m[1]))];
    for (const id of devices) {
      if (devCache[id]) continue;
      const dv = await apiGet(page, `/devices/${id}`);
      devCache[id] = {
        id,
        os: dv.os,
        version: dv.version,
        osVersion: dv.osVersion,
        label: dv.label,
        lastSeenAt: dv.lastSeenAt,
        status: dv.status,
        __status: dv.__status,
      };
    }
    orderDevices[d.orderCode] = { devices, http: r.status() };
  }
  fs.writeFileSync(
    `${OUT_DIR}/order-devices.json`,
    JSON.stringify({ orderDevices, devCache }, null, 1),
  );
  console.log('devices', Object.keys(devCache).length);
});
