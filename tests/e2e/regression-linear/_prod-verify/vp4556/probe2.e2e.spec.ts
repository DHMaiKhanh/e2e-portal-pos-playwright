import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { Urls } from '@constants/urls';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import { shot } from './_shared';

/** VP-4556 PROD probe 2 — READ-ONLY: Report tasks tab filters, CDC failure task data, Syncing tab. */
test.describe('VP-4556 PROD probe2 (read-only)', () => {
  test.beforeEach(() => {
    expect(env.STORE_ID, 'must target the internal test store').toBe('20258');
  });

  test('report tasks — Type Sys Notify Cdc Failure + Status Failed', async ({ page }) => {
    test.setTimeout(180_000);
    await blockMutations(page);
    const reqs: { url: string; headers: Record<string, string> }[] = [];
    page.on('request', (r) => {
      if (/\/background_tasks\?/.test(r.url()))
        reqs.push({ url: decodeURIComponent(r.url()), headers: r.headers() });
    });
    page.on('response', async (r) => {
      if (/\/background_tasks\?/.test(r.url())) {
        const j = await r.json().catch(() => null);
        if (j)
          console.log(
            'RESP total',
            j.totalItems,
            'n',
            j.member?.length,
            decodeURIComponent(r.url()).slice(-160),
          );
      }
    });
    await page.goto(`${Urls.MONITOR}?tab=report-task`, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await expect(panel.locator('tbody tr').first()).toBeVisible({ timeout: 30_000 });
    console.log(
      'PANEL buttons',
      (await panel.getByRole('button').allInnerTexts())
        .map((t) => t.replace(/\s+/g, ' '))
        .join(' | '),
    );
    await panel.getByRole('button', { name: 'Type', exact: true }).click();
    const pop = page.locator('[role="dialog"]:visible').last();
    await expect(pop.getByRole('option').first()).toBeVisible();
    console.log('TYPE options', (await pop.getByRole('option').allInnerTexts()).join(' | '));
    await pop.getByRole('option', { name: 'Sys Notify Cdc Failure' }).click();
    await page.waitForTimeout(500);
    console.log(
      'TYPE checked',
      await pop
        .getByRole('option', { name: 'Sys Notify Cdc Failure' })
        .getAttribute('aria-checked'),
    );
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2500);
    console.log('URL after type', page.url());
    const rowsAll = await panel.locator('tbody tr').allInnerTexts();
    console.log(
      'ROWS (type only)\n' +
        rowsAll
          .slice(0, 12)
          .map((r) => r.replace(/\s+/g, ' '))
          .join('\n'),
    );
    await shot(page, 'probe2_report_type_only');
    await panel.getByRole('button', { name: 'Filter by status' }).click();
    const pop2 = page.locator('[role="dialog"]:visible').last();
    await pop2.getByRole('option', { name: 'Failed' }).click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2500);
    console.log('URL after status', page.url());
    const rows = await panel.locator('tbody tr').allInnerTexts();
    console.log(
      'ROWS (type+failed)\n' +
        rows
          .slice(0, 12)
          .map((r) => r.replace(/\s+/g, ' '))
          .join('\n'),
    );
    console.log('PAGER', await panel.locator('[data-slot="pos-pagination-range"]').allInnerTexts());
    await shot(page, 'probe2_report_type_failed');
    for (const r of reqs)
      console.log('REQ', r.url.slice(r.url.indexOf('?')), 'x-merch-id=', r.headers['x-merch-id']);
  });

  test('cdc failure task data + syncing tab', async ({ page }) => {
    test.setTimeout(180_000);
    await blockMutations(page);
    await page.goto(`${Urls.MONITOR}?tab=sync-data`, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await page.waitForTimeout(6000);
    console.log(
      'SYNC buttons',
      (await panel.getByRole('button').allInnerTexts())
        .map((t) => t.replace(/\s+/g, ' '))
        .join(' | '),
    );
    console.log(
      'SYNC headers',
      (await panel.getByRole('columnheader').allInnerTexts()).join(' | '),
    );
    console.log(
      'SYNC rows\n' +
        (await panel.locator('tbody tr').allInnerTexts())
          .slice(0, 10)
          .map((r) => r.replace(/\s+/g, ' '))
          .join('\n'),
    );
    await shot(page, 'probe2_syncing_tab');
    // Global vs merchant-scoped queries for the CDC failure type.
    for (const h of [{}, { 'x-merch-id': env.STORE_ID }] as Record<string, string>[]) {
      for (const st of ['', '&status[]=failed']) {
        const res = await page.request.get(
          `${dataApiUrl}/background_tasks?page=1&order[createdAt]=desc&type[]=sys_notify_cdc_failure${st}`,
          {
            headers: { Accept: 'application/ld+json', ...h },
            failOnStatusCode: false,
          },
        );
        const b = (await res.json().catch(() => ({}))) as {
          member?: {
            id: string;
            merchant: { id: number; businessName: string };
            status: string;
            createdAt: string;
            data: Record<string, unknown>;
          }[];
          totalItems?: number;
        };
        console.log(
          `CDC hdr=${JSON.stringify(h)} st=${st || 'any'} → ${res.status()} total=${b.totalItems}`,
        );
        for (const x of (b.member ?? []).slice(0, 6)) {
          const d = x.data ?? {};
          console.log(
            `   ${x.createdAt} | ${x.status} | #${x.merchant?.id} ${x.merchant?.businessName} | op=${d.op} tag=${d.tag} label=${d.label} table=${d.table} | keys=${Object.keys(d).join(',')} | err=${String(d.error ?? d.message ?? d.err ?? '').slice(0, 200)}`,
          );
        }
      }
    }
  });
});
