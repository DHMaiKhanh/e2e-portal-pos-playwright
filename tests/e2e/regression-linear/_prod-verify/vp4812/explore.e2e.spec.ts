import { test, expect } from '@fixtures/index';
import * as fs from 'fs';
import { blockMutations } from '@helpers/writeGuard';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { POINT_CONFIG_FLAG } from '@pages/settings/CheckoutSettingPage';
import { env } from '@configs/env/loadEnv';

// Read-only exploration of prod store #20258 (every non-GET request is aborted).
const OUT =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4812';

test('explore prod data (read-only)', async ({ page }) => {
  test.setTimeout(180_000);
  expect(env.STORE_ID).toBe('20258');
  const blocked = await blockMutations(page);
  const log: { url: string; status: number; body?: string }[] = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (!/volt-pos\./.test(u)) return;
    let body = '';
    try {
      body = (await r.text()).slice(0, 4000);
    } catch {
      /* */
    }
    log.push({ url: u, status: r.status(), body });
  });
  await page.goto(`/pos/nail/20258/setting?tab=payment-transactions`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('radiogroup', { name: 'Checkout type' }).waitFor({ timeout: 30_000 });
  const flag = await readSysSetting(page, POINT_CONFIG_FLAG);
  fs.writeFileSync(`${OUT}/flag.json`, JSON.stringify(flag, null, 2));

  await page.goto(`/pos/nail/20258/orders`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.goto(`/pos/nail/20258/customers`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  fs.writeFileSync(`${OUT}/netlog.json`, JSON.stringify(log, null, 2));
  fs.writeFileSync(`${OUT}/blocked.json`, JSON.stringify(blocked, null, 2));
});
