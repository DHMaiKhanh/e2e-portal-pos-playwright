import { test } from '@fixtures/index';
import * as fs from 'fs';
import { Urls } from '@constants/urls';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import { saveSession } from '../_shared';

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 1600, height: 1200 } });

test.afterEach(({ context }) => saveSession(context));

test('probe', async ({ page }) => {
  const out: Record<string, unknown> = {};
  await page.goto(`${Urls.SETTINGS}?tab=configuration`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Passcode Setting').first().waitFor({ timeout: 40_000 });
  await page.waitForTimeout(3000);
  out.url = page.url();
  const card = page
    .locator('[data-slot="settings-card"]')
    .filter({ hasText: 'Passcode Setting' })
    .first();
  out.cardText = await card.innerText();
  out.cardHtml = (await card.innerHTML()).slice(0, 30000);
  out.setting = await readSysSetting(page, 'merchant_passcode_settings').catch((e) => String(e));
  await page.screenshot({
    path: 'D:/Temp/claude/49e633a47976bc80/71e674d7-f89a-4b84-9d79-ad9944d93091/scratchpad/probe-passcode.png',
    fullPage: true,
  });
  await page.goto(Urls.ROLES, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  out.rolesUrl = page.url();
  out.rolesText = (await page.locator('body').innerText()).slice(0, 4000);
  fs.writeFileSync(
    'D:/Temp/claude/49e633a47976bc80/71e674d7-f89a-4b84-9d79-ad9944d93091/scratchpad/probe.json',
    JSON.stringify(out, null, 2),
  );
});
