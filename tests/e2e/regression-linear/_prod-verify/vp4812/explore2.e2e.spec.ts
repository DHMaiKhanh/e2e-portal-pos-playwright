import { test, expect } from '@fixtures/index';
import * as fs from 'fs';
import { blockMutations } from '@helpers/writeGuard';
import { env } from '@configs/env/loadEnv';

// Read-only: capture the network of an order detail page and a customer's Points History tab.
const OUT =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4812';

test('explore order detail + points history (read-only)', async ({ page }) => {
  test.setTimeout(180_000);
  expect(env.STORE_ID).toBe('20258');
  await blockMutations(page);
  const log: { url: string; status: number; body?: string }[] = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (!/volt-pos\./.test(u)) return;
    if (/\/me|menu|permissions|merchant_settings\/20258$/.test(u)) return;
    let body = '';
    try {
      body = (await r.text()).slice(0, 12000);
    } catch {
      /* */
    }
    log.push({ url: u, status: r.status(), body });
  });
  await page.goto(`/pos/nail/20258/orders/01a1a091-f2b2-779e-aef1-513ff9633475`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: `${OUT}/explore_order.png`, fullPage: true });
  await page.goto(
    `/pos/nail/20258/customers/01a1a08c-7fe9-7f42-8d60-feda4c522d09?tab=points-history`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForTimeout(5000);
  const tab = page.getByRole('tab', { name: /points history/i });
  if (await tab.isVisible()) await tab.click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/explore_points.png`, fullPage: true });
  fs.writeFileSync(`${OUT}/netlog2.json`, JSON.stringify(log, null, 2));
});
