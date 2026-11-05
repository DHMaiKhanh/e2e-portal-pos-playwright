import { test, expect } from '@fixtures/index';
import * as fs from 'fs';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';

// Read-only: which POS device / app version created the tip orders (entity history device_id →
// device record), plus the network of the Devices admin page to learn its endpoint.
const OUT =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4812';
const H = { 'x-merch-id': '20258', Accept: 'application/ld+json' };
const ORDERS: Record<string, string> = {};

test('order device / app version (read-only)', async ({ page }) => {
  test.setTimeout(240_000);
  expect(env.STORE_ID).toBe('20258');
  await blockMutations(page, (u) => /volt-pos\./.test(u.host));
  const devCalls: { url: string; body: string }[] = [];
  page.on('response', async (r) => {
    if (/volt-pos\./.test(r.url()) && /device/i.test(r.url())) {
      devCalls.push({ url: r.url(), body: (await r.text().catch(() => '')).slice(0, 6000) });
    }
  });
  await page.goto(`/pos/nail/admin/devices?tab=devices`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const orders = JSON.parse(fs.readFileSync(`${OUT}/orders.json`, 'utf8')) as {
    id: string;
    orderCode: string;
  }[];
  for (const code of [
    'OD261103-30940768',
    'OD261026-31627060',
    'OD261020-58439330',
    'OD261017-73455149',
    'OD261015-00000555',
    'OD261021-39139388',
    'OD261019-00000620',
  ]) {
    const o = orders.find((x) => x.orderCode === code);
    if (o) ORDERS[code] = o.id;
  }
  const result: Record<string, unknown> = {};
  for (const [code, id] of Object.entries(ORDERS)) {
    const r = await page.request.get(
      `${dataApiUrl}/entity_histories?root_entity_type=order&root_entity_id=${id}&order[changedAt]=desc&page=1`,
      { headers: H, failOnStatusCode: false },
    );
    const text = await r.text();
    const devices = [...new Set([...text.matchAll(/"device_id":"([^"]+)"/g)].map((m) => m[1]))];
    const versions = [
      ...new Set(
        [...text.matchAll(/"(app_?[Vv]ersion|version|appVersion|build)":"?([^",}]+)/g)].map(
          (m) => `${m[1]}=${m[2]}`,
        ),
      ),
    ];
    const authors = [
      ...new Set([...text.matchAll(/"author":\{[^}]*"name":"([^"]*)"[^}]*\}/g)].map((m) => m[1])),
    ];
    const devInfo: Record<string, unknown> = {};
    for (const d of devices) {
      for (const p of [`/devices/${d}`, `/devices?id=${d}`]) {
        const dr = await page.request.get(`${dataApiUrl}${p}`, {
          headers: H,
          failOnStatusCode: false,
        });
        devInfo[p] = { status: dr.status(), body: (await dr.text()).slice(0, 2500) };
        if (dr.ok()) break;
      }
    }
    result[code] = { id, status: r.status(), devices, versions, authors, devInfo };
  }
  fs.writeFileSync(`${OUT}/order-devices.json`, JSON.stringify({ result, devCalls }, null, 1));
});
