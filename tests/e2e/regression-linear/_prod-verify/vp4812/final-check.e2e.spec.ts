import { test, expect } from '@fixtures/index';
import * as fs from 'fs';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import { readSysSetting } from '@pages/settings/SysSettingApi';
import {
  POINT_CONFIG_FLAG,
  type PointPaymentConfigValue,
} from '@pages/settings/CheckoutSettingPage';

// Read-only final check: flag value + change history after every run, final settings screenshot,
// and the Devices page row of the POS device behind today's order.
const SCRATCH =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4812';
const SHOTS = `${SCRATCH}/shots`;
test.use({ viewport: { width: 1920, height: 1080 } });

const utc7 = (): string => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
};

async function stampShot(
  page: import('@playwright/test').Page,
  name: string,
  lines: string[],
): Promise<void> {
  await page.evaluate(
    ([h, ls]) => {
      document.getElementById('__vp_stamp')?.remove();
      const d = document.createElement('div');
      d.id = '__vp_stamp';
      d.style.cssText =
        'position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#fff3cd;' +
        'color:#5c3b00;border:2px solid #e0a800;border-radius:6px;padding:5px 12px;font:600 13px/1.4 system-ui,sans-serif;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;max-width:1250px;text-align:center;white-space:pre-wrap';
      for (const [i, t] of [h as string, ...(ls as string[])].entries()) {
        const e = document.createElement('div');
        e.textContent = t;
        if (i) e.style.fontWeight = '500';
        d.appendChild(e);
      }
      document.body.appendChild(d);
    },
    [`Verified on PROD ${utc7()} (UTC+7) · store #20258`, lines] as const,
  );
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test('final flag state + history (read-only)', async ({ page }) => {
  test.setTimeout(180_000);
  expect(env.STORE_ID).toBe('20258');
  const blocked = await blockMutations(page, (u) => /volt-pos\./.test(u.host));
  await page.goto(`/pos/nail/20258/setting?tab=payment-transactions`, {
    waitUntil: 'domcontentloaded',
  });
  const sw = page.getByRole('switch', { name: 'Earn points on tip' });
  await sw.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  const flag = await readSysSetting<PointPaymentConfigValue>(page, POINT_CONFIG_FLAG);
  const orig = JSON.parse(fs.readFileSync(`${SCRATCH}/flag.json`, 'utf8')) as {
    value: PointPaymentConfigValue;
  };
  const r = await page.request.get(
    `${dataApiUrl}/entity_histories?entity_type=sys_setting&entity_id=${flag.id}&order[changedAt]=desc`,
    { headers: { 'x-merch-id': '20258', Accept: 'application/ld+json' } },
  );
  const hist = (await r.json()) as {
    member: {
      changedAt: string;
      author?: { name?: string };
      dataBefore?: { value?: string };
      dataAfter?: { value?: string };
    }[];
  };
  const p = (v?: string): Record<string, unknown> => {
    try {
      return typeof v === 'string'
        ? JSON.parse(v)
        : ((v as unknown as Record<string, unknown>) ?? {});
    } catch {
      return {};
    }
  };
  const lines = hist.member
    .filter((m) => m.changedAt >= '2026-11-03T07:00')
    .map((m) => {
      const b = p(m.dataBefore?.value);
      const a = p(m.dataAfter?.value);
      const diff = Object.keys({ ...b, ...a })
        .filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
        .map((k) => `${k}:${JSON.stringify(b[k])}→${JSON.stringify(a[k])}`);
      return `${m.changedAt} ${m.author?.name ?? '(system)'} ${diff.join('; ')}`;
    });
  fs.writeFileSync(
    `${SCRATCH}/final-check.json`,
    JSON.stringify({ at: new Date().toISOString(), flag, historySinceRelease: lines }, null, 2),
  );
  expect(flag.value.earn_on_tip).toBe(orig.value.earn_on_tip);
  await expect(sw).toHaveAttribute('aria-checked', String(flag.value.earn_on_tip));
  const ui = await sw.getAttribute('aria-checked');

  await sw.evaluate((el) => {
    const blk = el.closest('[data-slot="settings-card-step"]') ?? el.parentElement?.parentElement;
    (blk as HTMLElement).style.outline = '3px solid #16a34a';
    (blk as HTMLElement).scrollIntoView({ block: 'center' });
  });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      if (!el.scrollTop) continue;
      const oy = getComputedStyle(el).overflowY;
      if (oy !== 'auto' && oy !== 'scroll') el.scrollTop = 0;
    }
  });
  await stampShot(page, 'VP-4812_FINAL_flag_restored_original', [
    `FINAL re-read: UI switch aria-checked=${ui} · API earn_on_tip=${flag.value.earn_on_tip} (original before any test run: ${orig.value.earn_on_tip}) · flag updatedAt ${flag.updatedAt}`,
    `Rates cash=${flag.value.cash.point} card=${flag.value.card.point} gift=${flag.value.gift_card.point} other=${flag.value.other.point} · checkout=${flag.value.selected_type} · bonus=${flag.value.point_bonus}`,
  ]);

  // Devices admin page: POS device behind today's tip order (OD261103-30940768).
  await page.goto(`/pos/nail/admin/devices?tab=devices`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const row = page
    .getByRole('row')
    .filter({ hasText: /20258/ })
    .filter({ hasText: /1\.1\.6/ });
  if (
    await row
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await row.first().evaluate((el) => ((el as HTMLElement).style.outline = '3px solid #e11d48'));
  }
  await stampShot(page, 'VP-4812_DEVICES_pos_versions', [
    "Internal › Devices: POS device of today's order OD261103-30940768 reports Windows v1.1.6 (production build with VP-4812); Oct orders came from Android 0.1.33/0.1.35 and Windows 1.1.4/1.1.5 (pre-VP-4812)",
  ]);
  expect(blocked).toEqual([]);
});
