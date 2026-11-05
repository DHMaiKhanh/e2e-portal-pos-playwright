import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { Urls } from '@constants/urls';

/** READ-ONLY: Change Logs (entity history) — do our E2E VP4556 service/category rows show sync-channel changes? */
test('change logs for E2E VP4556 entities (read-only)', async ({ page }) => {
  expect(env.STORE_ID).toBe('20258');
  test.setTimeout(180_000);
  await blockMutations(page);
  const apis: string[] = [];
  page.on('response', async (r) => {
    const u = decodeURIComponent(r.url());
    if (
      /volt-pos\./.test(u) &&
      r.request().method() === 'GET' &&
      /histor|change/i.test(new URL(r.url()).pathname)
    ) {
      apis.push(u);
      const j = await r.json().catch(() => null);
      if (j?.member) {
        console.log('API', u, 'total', j.totalItems, 'n', j.member.length);
        console.log('  ITEM0', JSON.stringify(j.member[0]).slice(0, 1200));
      }
    }
  });
  await page.goto(Urls.CHANGE_LOGS, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  console.log('APIS', apis.join('\n'));
});
