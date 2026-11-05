import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { CustomersPage } from '@pages/customers/CustomersPage';
import {
  CustomerGroupApi,
  CustomerGroupsPage,
  dataApiUrl,
  type CustomerGroup,
} from '@pages/customers/CustomerGroupsPage';
import { assertProdTestStore, shot } from './evidence';

/** Final cleanup check on PROD #20258: deletes any ACTIVE group named `E2E VP4566…` (case-insensitive) and screenshots the result. */
test('cleanup — no E2E VP4566 group left active on #20258', async ({ page }) => {
  assertProdTestStore();
  const groupsPage = new CustomerGroupsPage(page);
  await groupsPage.goto();
  const api = new CustomerGroupApi(page);

  async function allActive(): Promise<CustomerGroup[]> {
    const out: CustomerGroup[] = [];
    for (let p = 1; p <= 20; p++) {
      const qs = new URLSearchParams({
        page: String(p),
        'status[]': 'active',
        'order[createdAt]': 'desc',
      });
      const res = await page.request.get(`${dataApiUrl}/customer_groups?${qs}`, {
        headers: { 'x-merch-id': env.STORE_ID, Accept: 'application/ld+json' },
      });
      expect(res.ok()).toBeTruthy();
      const b = (await res.json()) as { member: CustomerGroup[] };
      out.push(...b.member);
      if (b.member.length < 30) break;
    }
    return out;
  }

  const leftovers = (await allActive()).filter((g) => /^e2e vp4566/i.test(g.name));
  console.log(
    `leftovers found: ${leftovers.length} ${JSON.stringify(leftovers.map((g) => g.name))}`,
  );
  for (const g of leftovers) await api.remove(g.id);

  const active = await allActive();
  console.log(
    `ACTIVE after cleanup (${active.length}): ${JSON.stringify(active.map((g) => g.name))}`,
  );
  expect(active.filter((g) => /vp4566/i.test(g.name))).toEqual([]);

  await groupsPage.goto();
  await shot(
    page,
    'CLEANUP_a_customer_groups_after.png',
    [
      `CLEANUP: còn ${active.length} group active (${active.map((g) => g.name).join(', ')}) — 0 group "E2E VP4566"`,
      `Leftovers xóa thêm ở bước này: ${leftovers.length}`,
    ],
    { fullPage: true },
  );

  const customers = new CustomersPage(page);
  await customers.goto();
  await customers.openGroupFilter();
  await expect(page.getByRole('option').first()).toBeVisible();
  const opts = (await page.getByRole('option').allInnerTexts()).map((t) => t.trim());
  await shot(page, 'CLEANUP_b_group_filter_after.png', [
    `CLEANUP: + Group còn ${opts.length} option: ${opts.join(', ')}`,
  ]);
});
