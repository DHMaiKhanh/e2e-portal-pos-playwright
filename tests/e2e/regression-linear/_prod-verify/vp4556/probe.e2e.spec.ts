import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { Urls } from '@constants/urls';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import { shot } from './_shared';

/** VP-4556 PROD probe — READ-ONLY (every non-GET from the page is aborted; API calls are GET/OPTIONS only). */
test.describe('VP-4556 PROD probe (read-only)', () => {
  test.beforeEach(() => {
    expect(env.STORE_ID, 'must target the internal test store').toBe('20258');
  });

  test('category/service statuses on #20258', async ({ page, productsPage }) => {
    await blockMutations(page);
    await productsPage.goto();
    const headers = { 'x-merch-id': env.STORE_ID, Accept: 'application/ld+json' };
    for (const q of ['', 'status[]=active', 'status[]=inactive', 'status[]=deleted']) {
      const res = await page.request.get(
        `${dataApiUrl}/categories?page=1&type[]=service&type[]=product${q ? `&${q}` : ''}`,
        { headers, failOnStatusCode: false },
      );
      const b = (await res.json().catch(() => ({}))) as {
        member?: { name: string; status: string; id: string; updatedAt: string }[];
        totalItems?: number;
      };
      console.log(`CATEGORIES [${q || 'none'}] ${res.status()} total=${b.totalItems}`);
      for (const c of b.member ?? [])
        console.log(`   ${c.status} | ${c.name} | ${c.id} | ${c.updatedAt}`);
    }
    for (const q of ['', 'status[]=active', 'status[]=inactive', 'status[]=deleted']) {
      const res = await page.request.get(`${dataApiUrl}/services?page=1${q ? `&${q}` : ''}`, {
        headers,
        failOnStatusCode: false,
      });
      const b = (await res.json().catch(() => ({}))) as {
        member?: { name: string; status: string }[];
        totalItems?: number;
      };
      console.log(
        `SERVICES [${q || 'none'}] ${res.status()} total=${b.totalItems} statuses=${[...new Set((b.member ?? []).map((s) => s.status))]}`,
      );
      if (q === 'status[]=deleted')
        for (const s of (b.member ?? []).slice(0, 10)) console.log('   del', s.name);
    }
    // Allowed methods (OPTIONS is non-mutating).
    const anyCat = await page.request.get(
      `${dataApiUrl}/categories?page=1&status[]=active&type[]=service`,
      { headers },
    );
    const cid = ((await anyCat.json()) as { member: { id: string }[] }).member[0]?.id;
    const opt = await page.request.fetch(`${dataApiUrl}/categories/${cid}`, {
      method: 'OPTIONS',
      headers: { ...headers, Origin: env.BASE_URL, 'Access-Control-Request-Method': 'DELETE' },
      failOnStatusCode: false,
    });
    console.log('OPTIONS', opt.status(), JSON.stringify(opt.headers()));
    // sync tasks of this merchant (are categories/services synced to GCI from #20258?)
    for (const t of ['sync_category', 'sync_service', 'sys_notify_cdc_failure']) {
      const res = await page.request.get(
        `${dataApiUrl}/background_tasks?page=1&order[createdAt]=desc&type[]=${t}`,
        { headers, failOnStatusCode: false },
      );
      const b = (await res.json().catch(() => ({}))) as {
        member?: {
          merchant: { id: number; businessName: string };
          status: string;
          createdAt: string;
          data: unknown;
        }[];
        totalItems?: number;
      };
      console.log(`BG ${t} ${res.status()} total=${b.totalItems}`);
      for (const x of (b.member ?? []).slice(0, 8))
        console.log(
          `   ${x.createdAt} | ${x.status} | #${x.merchant?.id} ${x.merchant?.businessName} | ${JSON.stringify(x.data).slice(0, 300)}`,
        );
    }
  });

  test('monitor — apply Type + Status filters via UI', async ({ page }) => {
    test.setTimeout(180_000);
    await blockMutations(page);
    const reqs: string[] = [];
    page.on('request', (r) => {
      if (/\/background_tasks\?/.test(r.url())) reqs.push(decodeURIComponent(r.url()));
    });
    await page.goto(`${Urls.MONITOR}?tab=background-task`, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await expect(panel.locator('tbody tr').first()).toBeVisible({ timeout: 30_000 });
    // Type chip
    await panel.getByRole('button', { name: 'Type', exact: true }).click();
    await page.waitForTimeout(1000);
    const pop = page.locator('[role="dialog"]:visible').last();
    console.log('TYPE POPOVER text', (await pop.innerText()).replace(/\s+/g, ' ').slice(0, 1500));
    console.log('TYPE POPOVER html', await pop.evaluate((e) => e.outerHTML.slice(0, 2500)));
    await shot(page, 'probe_type_popover');
    await page.keyboard.press('Escape');
    await panel.getByRole('button', { name: 'Filter by status' }).click();
    await page.waitForTimeout(1000);
    const pop2 = page.locator('[role="dialog"]:visible').last();
    console.log('STATUS POPOVER text', (await pop2.innerText()).replace(/\s+/g, ' ').slice(0, 800));
    console.log('STATUS POPOVER html', await pop2.evaluate((e) => e.outerHTML.slice(0, 2000)));
    await page.keyboard.press('Escape');
    await panel.getByRole('button', { name: 'Filter by merchant' }).click();
    await page.waitForTimeout(1000);
    const pop3 = page.locator('[role="dialog"]:visible').last();
    console.log('MERCHANT POPOVER html', await pop3.evaluate((e) => e.outerHTML.slice(0, 2000)));
    await page.keyboard.press('Escape');
    console.log('REQS\n' + reqs.join('\n'));
  });
});
