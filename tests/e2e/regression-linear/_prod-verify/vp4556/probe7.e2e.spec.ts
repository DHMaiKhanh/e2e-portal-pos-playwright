import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import * as fs from 'fs';
import { STATE_FILE } from './_shared';

/** READ-ONLY: entity history of our E2E VP4556 category + services (who changed them: Portal vs sync/CDC). */
test('entity histories of E2E VP4556 entities (read-only)', async ({ page, productsPage }) => {
  expect(env.STORE_ID).toBe('20258');
  test.setTimeout(180_000);
  await blockMutations(page);
  await productsPage.goto();
  const st = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as { catId: string; svcIds: string[] };
  const ids = [st.catId, ...st.svcIds];
  const h = { Accept: 'application/ld+json' };
  // Which filter form works?
  for (const q of [`entityId=${st.catId}`, `entityId[]=${st.catId}`, `rootEntityId=${st.catId}`]) {
    const r = await page.request.get(`${dataApiUrl}/entity_histories?page=1&order[id]=desc&${q}`, {
      headers: h,
      failOnStatusCode: false,
    });
    const b = (await r.json().catch(() => ({}))) as { totalItems?: number; member?: unknown[] };
    console.log(`Q ${q} → ${r.status()} total=${b.totalItems}`);
  }
  for (const id of ids) {
    const r = await page.request.get(
      `${dataApiUrl}/entity_histories?page=1&order[id]=desc&entityId=${id}`,
      { headers: h, failOnStatusCode: false },
    );
    const b = (await r.json().catch(() => ({}))) as {
      totalItems?: number;
      member?: {
        entityType: string;
        entityId: string;
        operation: string;
        changedAt: string;
        author?: { name?: string; type?: string } | null;
        channel?: string;
        dataBefore?: Record<string, unknown>;
        dataAfter?: Record<string, unknown>;
      }[];
    };
    console.log(`ENTITY ${id} → ${r.status()} total=${b.totalItems}`);
    for (const x of (b.member ?? []).filter((m) => m.entityId === id)) {
      const changed = Object.keys(x.dataAfter ?? {}).filter(
        (k) => JSON.stringify((x.dataBefore ?? {})[k]) !== JSON.stringify((x.dataAfter ?? {})[k]),
      );
      console.log(
        `   ${x.changedAt} ${x.entityType} ${x.operation} by=${x.author?.name}/${x.author?.type} channel=${x.channel ?? ''} changed=${changed
          .map(
            (k) =>
              `${k}:${JSON.stringify((x.dataBefore ?? {})[k])}→${JSON.stringify((x.dataAfter ?? {})[k])}`,
          )
          .join('; ')
          .slice(0, 500)}`,
      );
    }
  }
});
