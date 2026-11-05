import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { shot } from './_shared';
import {
  auditLogsSince,
  cdcTasks,
  describeLog,
  describeTask,
  openCdcReportTasks,
} from './_monitor';

/** VP-4556 PROD probe 4 — READ-ONLY dry run of the monitoring helpers. */
test('monitor helpers dry run (read-only)', async ({ page }) => {
  expect(env.STORE_ID).toBe('20258');
  test.setTimeout(240_000);
  await blockMutations(page);
  const a = await openCdcReportTasks(page, { failed: true });
  console.log('FAILED', JSON.stringify(a), page.url());
  await shot(page, 'probe4_failed');
  const b = await openCdcReportTasks(page);
  console.log('ALL', a.pager, JSON.stringify(b.rows.slice(0, 3)), page.url());
  await shot(page, 'probe4_all');
  const c = await openCdcReportTasks(page, { merchant: '20258' });
  console.log('MERCHANT', JSON.stringify(c), page.url());
  await shot(page, 'probe4_merchant');
  const all = await cdcTasks(page);
  console.log('API all total', all.total, 'newest', describeTask(all.items[0]));
  const failed = await cdcTasks(page, { status: 'failed' });
  console.log('API failed total', failed.total);
  const logs = await auditLogsSince(page, new Date(Date.now() - 10 * 60_000).toISOString());
  console.log('AUDIT last 10 min', logs.length);
  const by: Record<string, number> = {};
  for (const l of logs) {
    const k = `#${l.merchant?.id} ${l.requestBody?.tag} ${l.requestBody?.table}`;
    by[k] = (by[k] ?? 0) + 1;
  }
  console.log(JSON.stringify(by));
  if (logs[0]) console.log(describeLog(logs[0]));
});
