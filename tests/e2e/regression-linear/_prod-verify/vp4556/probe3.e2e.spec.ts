import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { Urls } from '@constants/urls';
import { shot } from './_shared';

/** VP-4556 PROD probe 3 — READ-ONLY: what are the ongoing #20258 DTS sync errors? */
test('syncing tab — #20258 DTS error detail (read-only)', async ({ page }) => {
  expect(env.STORE_ID).toBe('20258');
  test.setTimeout(180_000);
  await blockMutations(page);
  const seen: string[] = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (/volt-pos\./.test(u) && r.request().method() === 'GET' && !/\/me\b/.test(u)) {
      seen.push(`${r.status()} ${decodeURIComponent(u)}`);
      if (/sync|log/i.test(new URL(u).pathname)) {
        const j = await r.json().catch(() => null);
        const m = j?.member ?? [];
        console.log('SYNC API', decodeURIComponent(u), 'total', j?.totalItems);
        for (const x of m.slice(0, 5)) console.log('  ITEM', JSON.stringify(x).slice(0, 1500));
      }
    }
  });
  await page.goto(`${Urls.MONITOR}?tab=sync-data`, { waitUntil: 'domcontentloaded' });
  const panel = page.locator('[role="tabpanel"]:visible').first();
  await expect(panel.locator('tbody tr').first()).toBeVisible({ timeout: 30_000 });
  await panel.locator('tbody tr').first().click();
  await page.waitForTimeout(2000);
  const sheet = page.getByRole('dialog');
  console.log(
    'SHEET',
    (await sheet.innerText().catch(() => 'n/a')).replace(/\s+/g, ' ').slice(0, 3000),
  );
  await shot(page, 'probe3_sync_detail');
  console.log('NET\n' + seen.join('\n'));
});
