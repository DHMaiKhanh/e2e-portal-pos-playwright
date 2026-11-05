import * as fs from 'fs';
import { test, expect } from '@fixtures/index';
import { Urls } from '@constants/urls';
import { OUT_DIR, readOnlyGuard, shot } from './_shared';

/** VP-4590 PROD — POS version update side (read-only): App Versions list per platform. */
test.use({ viewport: { width: 1920, height: 1080 } });

test('VP-4590 PROD — App Versions Windows/Android (read-only)', async ({ page }) => {
  await readOnlyGuard(page);
  await page.goto(Urls.VERSIONS);
  await page.waitForLoadState('load');
  const out: Record<string, string> = {};
  for (const tab of ['Windows', 'Android']) {
    const t = page.getByRole('tab', { name: new RegExp(tab, 'i') });
    if (await t.count()) await t.first().click();
    await page.waitForLoadState('load');
    const first = page
      .getByRole('row')
      .filter({ hasText: /\d+\.\d+\.\d+/ })
      .first();
    await expect(first, `Danh sách version ${tab} phải có dữ liệu`).toBeVisible({
      timeout: 30_000,
    });
    out[tab] = (await first.innerText()).replace(/\s+/g, ' ').trim();
    await shot(
      page,
      `VP-4590_VER_${tab.toLowerCase()}_app_versions`,
      `App Versions (${tab}) — version mới nhất: ${out[tab].slice(0, 120)}`,
    );
  }
  fs.writeFileSync(`${OUT_DIR}/versions.json`, JSON.stringify(out, null, 2));
});
