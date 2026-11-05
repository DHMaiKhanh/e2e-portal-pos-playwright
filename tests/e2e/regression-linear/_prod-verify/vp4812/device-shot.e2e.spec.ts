import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';

// Read-only: Devices page row of the exact POS devices behind the analysed tip orders.
const SHOTS =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4812/shots';
test.use({ viewport: { width: 1920, height: 1080 } });

const DEVICES: [string, string, string][] = [
  [
    '01a1a07a-4350-74a0-97a5-a9b07a598c8d',
    'D1',
    'OD261103-30940768 (Nov 3, tip COUNTED, setting ON)',
  ],
  ['01a12f64-dc5c-7db0-8bb9-247750049fcb', 'D2', 'OD261026-31627060 (Oct 26, tip NOT counted)'],
  ['01a13bcf-2ae6-74f0-b7ee-5b27023e0925', 'D5', 'OD261017-73455149 (Oct 16, tip NOT counted)'],
];

test('devices behind tip orders (read-only)', async ({ page }) => {
  test.setTimeout(180_000);
  expect(env.STORE_ID).toBe('20258');
  const blocked = await blockMutations(page, (u) => /volt-pos\./.test(u.host));
  for (const [id, tag, label] of DEVICES) {
    await page.goto(`/pos/nail/admin/devices?tab=devices`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Devices', level: 1 }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    // Clear the default "Status Active" / "Connection Online" chips so offline devices are listed.
    for (let i = 0; i < 3; i++) {
      const clear = page
        .locator('button[aria-label*="clear" i], button[aria-label*="remove" i]')
        .first();
      if (!(await clear.isVisible().catch(() => false))) break;
      await clear.click();
      await page.waitForTimeout(800);
    }
    await page
      .locator('input[placeholder="Search merchant or device ID"]:visible')
      .first()
      .fill(id);
    await page.waitForTimeout(3500);
    const rows = page.getByRole('row');
    const n = await rows.count();
    const ver = n > 1 ? (await rows.nth(1).innerText()).replace(/\s+/g, ' ') : '(no row)';
    if (n > 1)
      await rows.nth(1).evaluate((el) => ((el as HTMLElement).style.outline = '3px solid #e11d48'));
    await page.evaluate(
      ([h, l]) => {
        document.getElementById('__vp_stamp')?.remove();
        const d = document.createElement('div');
        d.id = '__vp_stamp';
        d.style.cssText =
          'position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#fff3cd;color:#5c3b00;' +
          'border:2px solid #e0a800;border-radius:6px;padding:5px 12px;font:600 13px/1.4 system-ui,sans-serif;max-width:1250px;' +
          'text-align:center;white-space:pre-wrap;pointer-events:none';
        d.textContent = `${h}\n${l}`;
        document.body.appendChild(d);
      },
      [
        `Verified on PROD ${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date())} (UTC+7) · store #20258`,
        `POS device ${id} — created ${label} · device's current app version shown in "App / OS"`,
      ] as const,
    );
    await page.screenshot({ path: `${SHOTS}/VP-4812_DEVICES_${tag}_${id.slice(-4)}.png` });
    console.log(tag, id, '→', ver.slice(0, 220));
  }
  expect(blocked).toEqual([]);
});
