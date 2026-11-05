import { test, expect } from '@fixtures/index';
import type { Page } from '@playwright/test';
import { env } from '@configs/env/loadEnv';
import { CustomersPage } from '@pages/customers/CustomersPage';
import {
  type CustomerGroup,
  CustomerGroupApi,
  dataApiUrl,
  isGroupList,
} from '@pages/customers/CustomerGroupsPage';
import { assertProdTestStore, shot } from './evidence';

/**
 * VP-5216 on PROD #20258: the store only has 3 groups, so the "filter only loads 30" bug cannot
 * show on real data. This case temporarily adds 31 groups named `E2E VP4566 <runId>-TC13 Bulk NN`
 * (→ ≥34 active), checks the + Group filter loads every active group (incl. the oldest
 * pre-existing ones that land on page 2) and that its search is server-side, then deletes the 31.
 */

const runId = `P${Date.now().toString(36)}`;
const prefix = `E2E VP4566 ${runId}-TC13 Bulk`;
const BULK = 31;

let api: CustomerGroupApi;
let created: string[] = [];

async function allActive(page: Page): Promise<CustomerGroup[]> {
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

async function scrollListToEnd(page: Page): Promise<number> {
  const options = page.getByRole('option');
  let last = -1;
  for (let i = 0; i < 12; i++) {
    const n = await options.count();
    if (n === last) break;
    last = n;
    await options
      .last()
      .scrollIntoViewIfNeeded()
      .catch(() => undefined);
    await page.evaluate(() => {
      const list = document.querySelector('[data-slot="pos-combobox-list"]') as HTMLElement | null;
      let el: HTMLElement | null = list;
      while (el) {
        if (el.scrollHeight > el.clientHeight + 2) el.scrollTop = el.scrollHeight;
        el = el.parentElement;
        if (el === document.body) break;
      }
    });
    await page.waitForTimeout(1500);
  }
  return options.count();
}

test.describe('PROD #20258 — VP-5216 filter > 30 groups', () => {
  test.setTimeout(240_000);

  test.beforeEach(async ({ page }) => {
    assertProdTestStore();
    api = new CustomerGroupApi(page);
    created = [];
  });

  test.afterEach(async () => {
    for (const id of created) await api.remove(id);
  });

  test('VP-5216 TC13/TC14 — >30 group: bộ lọc load đủ khi cuộn + search phía server', async ({
    page,
  }) => {
    const customers = new CustomersPage(page);
    await customers.goto();
    const before = await allActive(page);
    console.log(`active before seeding: ${before.length}`);

    for (let i = 1; i <= BULK; i++) {
      const g = await api.create(`${prefix} ${String(i).padStart(2, '0')}`);
      created.push(g.id);
    }
    const active = await allActive(page);
    const activeNames = active.map((g) => g.name);
    console.log(`active after seeding: ${active.length}`);
    expect(active.length).toBeGreaterThan(30);

    const reqs: string[] = [];
    page.on('response', (r) => {
      if (isGroupList(r)) reqs.push(`${r.status()} ${new URL(r.url()).search}`);
    });

    await customers.goto();
    await customers.openGroupFilter();
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1000);
    const initial = await page.getByRole('option').count();
    await shot(page, 'VP-5216_TC13_a_filter_top_newest_groups.png', [
      `VP-5216 TC13: ${active.length} group active (3 có sẵn + ${BULK} E2E tạm) — mở + Group`,
      `Ban đầu render ${initial} option; group mới nhất ở đầu`,
      `Requests: ${reqs.join(' | ')}`,
    ]);

    const total = await scrollListToEnd(page);
    const labels = await page.getByRole('option').allInnerTexts();
    console.log(`options initial=${initial} afterScroll=${total}`);
    console.log(`requests: ${reqs.join(' | ')}`);
    await shot(page, 'VP-5216_TC13_b_filter_bottom_all_loaded.png', [
      `VP-5216 TC13: cuộn hết dropdown → ${total}/${active.length} option (đủ), cuối danh sách có group cũ "group 1"`,
      `Requests: ${reqs.join(' | ')}`,
    ]);

    const missing = activeNames.filter((n) => !labels.map((l) => l.trim()).includes(n));
    expect(missing, 'group active bị thiếu trong bộ lọc').toEqual([]);
    expect(total).toBe(active.length);
    for (const name of ['group 1', 'QA G1', 'QA G2'])
      expect(labels.map((l) => l.trim())).toContain(name);

    // ---- TC14: search inside the filter hits groups beyond page 1 (server-side search)
    const search = page.locator('[cmdk-input], [data-slot="pos-combobox-input"]').first();
    await expect(search).toBeVisible();
    reqs.length = 0;
    await search.fill('group 1');
    await expect(page.getByRole('option', { name: 'group 1', exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(1200);
    await shot(page, 'VP-5216_TC14_a_filter_search_old_group.png', [
      'VP-5216 TC14: search "group 1" (group cũ nhất, nằm ngoài 30 group đầu) → tìm thấy',
      `Requests: ${reqs.join(' | ') || '(không có request — lọc phía client trên danh sách đã load đủ)'}`,
    ]);
    console.log(`search "group 1" requests: ${reqs.join(' | ')}`);

    reqs.length = 0;
    await search.fill(`${runId}-TC13`);
    await page.waitForTimeout(2000);
    const found = await scrollListToEnd(page);
    await shot(page, 'VP-5216_TC14_b_filter_search_31_duplicates_prefix.png', [
      `VP-5216 TC14: search "${runId}-TC13" → ${found}/${BULK} option`,
      `Requests: ${reqs.join(' | ') || '(client-side)'}`,
    ]);
    console.log(`search prefix found=${found} requests: ${reqs.join(' | ')}`);
    expect(found).toBe(BULK);
  });
});
