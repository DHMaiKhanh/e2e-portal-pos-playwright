import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { CustomersPage } from '@pages/customers/CustomersPage';
import { dataApiUrl, type CustomerGroup } from '@pages/customers/CustomerGroupsPage';

/**
 * READ-ONLY probe of PROD store data before the VP-4566 verification.
 * No writes: only GETs + opening the Group filter.
 */
test('probe — prod customer group data (read-only)', async ({ page }) => {
  expect(env.STORE_ID, 'must target the internal test store').toBe('20258');
  const headers = { 'x-merch-id': env.STORE_ID, Accept: 'application/ld+json' };

  const lists: { url: string; count: number; total: unknown; statuses: string[] }[] = [];
  page.on('response', async (r) => {
    const u = new URL(r.url());
    if (
      u.host.startsWith('volt-pos.') &&
      u.pathname === '/customer_groups' &&
      r.request().method() === 'GET'
    ) {
      const b = (await r.json().catch(() => null)) as {
        member?: CustomerGroup[];
        totalItems?: number;
      } | null;
      lists.push({
        url: u.pathname + u.search,
        count: b?.member?.length ?? -1,
        total: b?.totalItems,
        statuses: [...new Set((b?.member ?? []).map((g) => g.status))],
      });
    }
  });

  const customers = new CustomersPage(page);
  await customers.goto();

  async function all(status: string): Promise<CustomerGroup[]> {
    const out: CustomerGroup[] = [];
    for (let p = 1; p <= 20; p++) {
      const qs = new URLSearchParams({
        page: String(p),
        'status[]': status,
        'order[createdAt]': 'desc',
      });
      const res = await page.request.get(`${dataApiUrl}/customer_groups?${qs}`, { headers });
      expect(res.ok(), `GET ${status} p${p} → ${res.status()}`).toBeTruthy();
      const b = (await res.json()) as { member: CustomerGroup[]; totalItems?: number };
      out.push(...b.member);
      if (b.member.length < 30) break;
    }
    return out;
  }

  const active = await all('active');
  const deleted = await all('deleted');
  console.log(`API host: ${dataApiUrl}`);
  console.log(`ACTIVE groups: ${active.length}`);
  for (const g of active)
    console.log(`  A | ${JSON.stringify(g.name)} | ${g.createdAt} | members=${g.totalMember}`);
  console.log(`DELETED groups: ${deleted.length}`);
  console.log(
    `  deleted non-E2E: ${
      deleted
        .filter((g) => !/vp4566/i.test(g.name))
        .map((g) => g.name)
        .join(', ') || '(none)'
    }`,
  );
  console.log(
    `E2E VP4566 active leftovers: ${active.filter((g) => /vp4566/i.test(g.name)).length}`,
  );

  await customers.openGroupFilter();
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  const options = await page.getByRole('option').allInnerTexts();
  console.log(`FILTER options rendered: ${options.length}`);
  console.log(JSON.stringify(options));
  console.log('GROUP LIST REQUESTS:');
  for (const l of lists)
    console.log(`  ${l.url} → ${l.count} (total=${l.total}) statuses=${l.statuses}`);
  const html = await page
    .locator('[role="listbox"], [cmdk-list], [data-slot*="command"]')
    .first()
    .evaluate((e) => e.outerHTML.slice(0, 1500))
    .catch(() => 'n/a');
  console.log('LISTBOX HTML:', html);
});
