import { test, expect } from '@fixtures/index';
import * as fs from 'fs';
import { env } from '@configs/env/loadEnv';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';

// Read-only (GET): change history of the merchant_point_payment_config flag of #20258.
const OUT =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4812';

test('flag history (read-only)', async ({ page }) => {
  expect(env.STORE_ID).toBe('20258');
  await page.goto(`/pos/nail/20258/overview`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const H = { 'x-merch-id': '20258', Accept: 'application/ld+json' };
  const id = '01a0bf25-9ac6-732b-8504-a1d0eedc8356';
  const out: Record<string, unknown> = {};
  for (const p of [
    `/entity_histories?entity_type=sys_setting&entity_id=${id}&order[changedAt]=desc`,
    `/entity_histories?root_entity_type=sys_setting&root_entity_id=${id}&order[changedAt]=desc`,
    `/entity_histories?entity_type=sys_setting&order[changedAt]=desc`,
    `/sys_settings?key=merchant_point_payment_config`,
  ]) {
    const r = await page.request.get(`${dataApiUrl}${p}`, { headers: H, failOnStatusCode: false });
    out[p] = { status: r.status(), body: await r.text() };
  }
  fs.writeFileSync(`${OUT}/flag-history.json`, JSON.stringify(out, null, 1));
});
