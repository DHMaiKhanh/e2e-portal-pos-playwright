import { test, expect } from '@fixtures/index';
import * as fs from 'fs';
import { env } from '@configs/env/loadEnv';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';

// Read-only (GET only): dump store #20258 orders of the last ~40 days + detail of orders with a tip
// + point logs of their customers, for offline analysis of "points vs tip".
const OUT =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4812';
const H = { 'x-merch-id': '20258', Accept: 'application/ld+json' };

test('dump orders/points (read-only GET)', async ({ page }) => {
  test.setTimeout(600_000);
  expect(env.STORE_ID).toBe('20258');
  await page.goto(`/pos/nail/20258/orders`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const get = async (path: string): Promise<any> => {
    const r = await page.request.get(`${dataApiUrl}${path}`, {
      headers: H,
      failOnStatusCode: false,
    });
    if (!r.ok()) return { __status: r.status(), __path: path };
    return r.json();
  };
  const orders: any[] = [];
  const after = '2026-04-01T00:00:00.000Z';
  const before = '2026-11-04T06:00:00.000Z';
  for (let p = 1; p < 200; p++) {
    const j = await get(
      `/orders?page=${p}&itemsPerPage=100&status[]=successful&status[]=refunded&status[]=partial_refunded&date_range[completedAt][after]=${after}&date_range[completedAt][before]=${before}&order[completedAt]=desc`,
    );
    const m = j.member ?? [];
    for (const o of m) {
      delete o.merchant;
      orders.push(o);
    }
    if (m.length === 0 || (j.view && !j.view.next)) break;
  }
  fs.writeFileSync(`${OUT}/orders.json`, JSON.stringify(orders, null, 1));
  const details: any[] = [];
  for (const o of orders) {
    const d = await get(`/orders/${o.id}`);
    if (d && d.tipAmount > 0) {
      for (const it of d.orderItems ?? []) {
        delete it.staff;
        delete it.service;
      }
      details.push(d);
    }
    if (details.length >= 400) break;
  }
  fs.writeFileSync(`${OUT}/order-details-tip.json`, JSON.stringify(details, null, 1));
});

test('dump customers + point logs of tip orders (read-only GET)', async ({ page }) => {
  test.setTimeout(600_000);
  expect(env.STORE_ID).toBe('20258');
  await page.goto(`/pos/nail/20258/customers`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const get = async (path: string): Promise<any> => {
    const r = await page.request.get(`${dataApiUrl}${path}`, {
      headers: H,
      failOnStatusCode: false,
    });
    if (!r.ok()) return { __status: r.status(), __path: path };
    return r.json();
  };
  const customers: any[] = [];
  for (let p = 1; p < 60; p++) {
    const j = await get(`/customers?page=${p}&itemsPerPage=100&order[createdAt]=desc`);
    const m = j.member ?? [];
    customers.push(...m);
    if (m.length === 0 || (j.view && !j.view.next)) break;
  }
  fs.writeFileSync(`${OUT}/customers.json`, JSON.stringify(customers, null, 1));
  const orders = JSON.parse(fs.readFileSync(`${OUT}/orders.json`, 'utf8')) as any[];
  const names = new Set(orders.filter((o) => o.customerName).map((o) => o.customerName));
  const logs: Record<string, any> = {};
  for (const c of customers.filter((c) => names.has(c.name))) {
    const all: any[] = [];
    for (let p = 1; p < 10; p++) {
      const j = await get(
        `/customers/point_logs?page=${p}&customerId=${c.id}&order[updatedAt]=desc`,
      );
      const m = j.member ?? [];
      all.push(...m);
      if (m.length === 0 || (j.view && !j.view.next)) break;
    }
    logs[c.id] = { name: c.name, phone: c.phone, pointBalance: c.pointBalance, logs: all };
  }
  fs.writeFileSync(`${OUT}/point-logs.json`, JSON.stringify(logs, null, 1));
});
