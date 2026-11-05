import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { PREFIX } from './_shared';
import { deleteCategory, deleteService, leftovers } from './_data';

/** Safety net: soft-delete every active/inactive "E2E VP4556" service + category on #20258. */
test('VP-4556 cleanup — remove E2E VP4556 leftovers', async ({ page, productsPage }) => {
  expect(env.STORE_ID).toBe('20258');
  await productsPage.goto();
  const before = await leftovers(page);
  console.log(`BEFORE categories=${before.categories.length} services=${before.services.length}`);
  for (const s of before.services) {
    expect(s.name.startsWith(PREFIX)).toBeTruthy();
    const r = await deleteService(page, s.id);
    console.log(`  service ${s.name} → ${r.status}`);
  }
  for (const c of before.categories) {
    expect(c.name.startsWith(PREFIX)).toBeTruthy();
    const r = await deleteCategory(page, c.id);
    console.log(`  category ${c.name} → ${r.status}`);
  }
  const after = await leftovers(page);
  console.log(`AFTER categories=${after.categories.length} services=${after.services.length}`);
  expect(after.categories.length + after.services.length).toBe(0);
});
