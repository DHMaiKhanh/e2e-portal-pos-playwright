import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { shot, stamp } from './_shared';

/** READ-ONLY: does Add service → Category picker offer soft-deleted categories? (nothing submitted; writes blocked) */
test('add-service picker lists deleted categories? (read-only)', async ({ page, productsPage }) => {
  expect(env.STORE_ID).toBe('20258');
  const blocked = await blockMutations(page);
  const reqs: string[] = [];
  page.on('response', async (r) => {
    const u = new URL(r.url());
    if (
      u.host.startsWith('volt-pos.') &&
      u.pathname === '/categories' &&
      r.request().method() === 'GET'
    ) {
      const j = await r.json().catch(() => null);
      reqs.push(
        `${decodeURIComponent(u.search)} → ${(j?.member ?? []).map((c: { name: string; status: string }) => `${c.name}[${c.status}]`).join(', ')}`,
      );
    }
  });
  await productsPage.goto();
  await productsPage.openAddService();
  const trigger = productsPage.serviceDialog.locator('#category');
  await expect(trigger).not.toContainText(/loading/i, { timeout: 15_000 });
  await trigger.click();
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.waitForTimeout(800);
  const opts = await page.getByRole('option').allInnerTexts();
  console.log('PICKER OPTIONS', opts.join(' | '));
  console.log('CATEGORY REQUESTS\n' + reqs.join('\n'));
  await stamp(page);
  await page.evaluate(
    (lines) => {
      const el = document.createElement('div');
      el.setAttribute(
        'style',
        'position:fixed;right:16px;bottom:16px;z-index:2147483646;max-width:900px;background:rgba(15,23,42,.94);color:#e2e8f0;font:12px/1.45 Consolas,monospace;padding:10px 14px;border-radius:8px;white-space:pre-wrap;pointer-events:none',
      );
      el.textContent = lines.join('\n');
      document.body.appendChild(el);
    },
    [
      'Side finding · Add service → Category picker (API GET /categories, không lọc status):',
      ...reqs.map((r) => r.slice(0, 400)),
    ],
  );
  await shot(page, 'VP-4556_SIDE_add_service_picker_lists_deleted_categories');
  await page.keyboard.press('Escape');
  console.log('BLOCKED', blocked);
});
