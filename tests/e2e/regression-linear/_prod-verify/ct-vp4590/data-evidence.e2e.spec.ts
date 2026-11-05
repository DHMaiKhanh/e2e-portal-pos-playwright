import * as fs from 'fs';
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { OUT_DIR, readOnlyGuard, shot, type J } from './_shared';

/**
 * VP-4590 PROD #20258 — READ-ONLY evidence across many days: order detail + customer Points
 * history row ("Complete Checkin <id>") + Orders history, annotated with the checkout type / Point
 * Config in force at checkout time (flag entity history) and the POS device + app version that
 * created the order (order entity history device_id → /devices/{id}). Every non-GET is aborted.
 */
const CASES: { code: string; tag: string }[] = [
  { code: 'OD261013-00000542', tag: 'D01_2026-10-13' },
  { code: 'OD261014-11680144', tag: 'D02_2026-10-14' },
  { code: 'OD261015-00000555', tag: 'D03_2026-10-15' },
  { code: 'OD261016-66393551', tag: 'D04_2026-10-16' },
  { code: 'OD261019-00000620', tag: 'D05_2026-10-19' },
  { code: 'OD261021-10655267', tag: 'D06_2026-10-21' },
  { code: 'OD261022-06398701', tag: 'D07_2026-10-22' },
  { code: 'OD261026-75754838', tag: 'D08_2026-10-26' },
  { code: 'OD261103-30855257', tag: 'D09_2026-11-03' },
  { code: 'OD261103-30940768', tag: 'D10_2026-11-03' },
];

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const local = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));

async function outline(loc: Locator): Promise<void> {
  await loc.evaluate((el) => {
    (el as HTMLElement).style.outline = '3px solid #e11d48';
    (el as HTMLElement).style.outlineOffset = '2px';
  });
}

async function findRow(page: Page, re: RegExp): Promise<Locator | null> {
  const panel = page.locator('[role="tabpanel"][data-state="active"]');
  await panel.locator('tbody tr').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  for (let i = 0; i < 12; i++) {
    const row = panel.locator('tbody tr').filter({ hasText: re }).first();
    if (
      await row.waitFor({ timeout: 6_000 }).then(
        () => true,
        () => false,
      )
    )
      return row;
    const next = panel
      .locator('button[aria-label*="next" i], button:has(svg.lucide-chevron-right)')
      .last();
    if (!(await next.isEnabled().catch(() => false))) return null;
    await next.click();
    await page.waitForTimeout(1200);
  }
  return null;
}

test.use({ viewport: { width: 1920, height: 1080 } });

test('VP-4590 PROD data — points per checkout type across days (read-only)', async ({ page }) => {
  test.setTimeout(900_000);
  expect(env.STORE_ID).toBe('20258');
  await readOnlyGuard(page);
  const rows = JSON.parse(fs.readFileSync(`${OUT_DIR}/analysis2.json`, 'utf8')) as J[];
  const orders = JSON.parse(fs.readFileSync(`${OUT_DIR}/orders.json`, 'utf8')) as J[];
  const summary: string[] = [];
  const seenCust = new Set<string>();

  for (const { code, tag } of CASES) {
    const r = rows.find((x) => x.code === code);
    const o = orders.find((x) => x.orderCode === code);
    expect(r && o, code).toBeTruthy();
    if (!r || !o) continue;
    const pay = Object.entries(r.pay as Record<string, [number, number]>)
      .map(([k, [a, t]]) => `${k} ${usd(a)}${t ? ` + tip ${usd(t)}` : ''}`)
      .join(', ');
    const rate = r.rate as Record<string, number>;
    const rateTxt = `cash ${usd(rate.cash)} / card ${usd(rate.card)} / gift ${usd(rate.gift_card)} / other ${usd(rate.other)} per pt`;
    const type =
      r.type === 'payment_method'
        ? 'Manual (payment_method)'
        : 'Manual (legacy — no selected_type yet)';
    const line1 = `${code} · ${local(r.at)} US/Central · POS ${r.devices.join(' + ')} · checkout type in force: ${type}`;
    const line2 = `Paid ${pay} · Point Config ${rateTxt} · expected ${r.withTip === r.noTip ? r.withTip : `${r.noTip}–${r.withTip} (tip excl./incl.)`} · logged +${r.logged[0]} → ${r.verdict}`;
    summary.push(`${tag} | ${line1} | ${line2}`);

    // Order detail
    await page.goto(`/pos/nail/20258/orders/${o.id}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Order summary', { exact: true }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    await shot(page, `VP-4590_DATA_${tag}_${code}_order`, `${line1} — ${line2}`);

    // Customer › Points history
    if (!r.cid) continue;
    await page.goto(`/pos/nail/20258/customers/${r.cid}`, { waitUntil: 'domcontentloaded' });
    const tab = page.getByRole('tab', { name: /points history/i });
    await tab.waitFor({ timeout: 30_000 });
    await tab.click();
    const logRow = await findRow(page, new RegExp(`Complete Checkin ${r.rid}(?!\\d)`));
    if (logRow) await outline(logRow);
    await shot(
      page,
      `VP-4590_DATA_${tag}_${code}_points_history`,
      `Customer "${r.cust}" › Points history · "Complete Checkin ${r.rid}" = +${r.logged[0]} (${logRow ? 'row outlined' : 'row not on screen'}) — ${line2}`,
    );

    // Customer › Orders history (once per customer)
    if (!seenCust.has(r.cid)) {
      seenCust.add(r.cid);
      await page.getByRole('tab', { name: /orders history/i }).click();
      await page.waitForTimeout(1500);
      const mine = rows.filter((x) => x.cid === r.cid);
      const days = mine.map(
        (x) =>
          `${x.day} ${x.code.slice(-8)} +${x.logged[0] ?? '—'} (${x.verdict === 'MISMATCH' ? `≠ Point Config ${x.noTip}–${x.withTip}` : 'Point Config ✓'})`,
      );
      await shot(
        page,
        `VP-4590_DATA_${tag}_${code}_orders_history`,
        `Customer "${r.cust}" › Orders history — check-ins on ${new Set(mine.map((x) => x.day)).size} day(s): ${days.join(' · ')} · checkout type in force: Manual on every date (no flat Point Bonus, no 11:59 PM auto checkout)`,
      );
    }
  }
  fs.writeFileSync(`${OUT_DIR}/data-evidence-summary.txt`, summary.join('\n'));
});

test('VP-4590 PROD — POS devices/app versions behind the orders (read-only)', async ({ page }) => {
  test.setTimeout(300_000);
  await readOnlyGuard(page);
  const dev = JSON.parse(fs.readFileSync(`${OUT_DIR}/order-devices.json`, 'utf8')) as {
    devCache: Record<string, J>;
  };
  const rows = JSON.parse(fs.readFileSync(`${OUT_DIR}/analysis2.json`, 'utf8')) as J[];
  const picks: [string, string][] = [];
  const byVer = new Map<string, string>();
  for (const r of rows.filter((x) => x.verdict !== 'NO_LOG').reverse()) {
    for (const id of r.devIds as string[]) {
      const d = dev.devCache[id];
      const k = `${d.os} ${d.version}`;
      if (!byVer.has(k)) {
        byVer.set(k, id);
        picks.push([id, `${k} — created ${r.code} (${r.day})`]);
      }
    }
  }
  const out: string[] = [];
  for (const [id, label] of picks) {
    await page.goto(`/pos/nail/admin/devices?tab=devices`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Devices', level: 1 }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    for (let i = 0; i < 3; i++) {
      const clear = page
        .locator('button[aria-label*="clear" i], button[aria-label*="remove" i]')
        .first();
      if (!(await clear.isVisible().catch(() => false))) break;
      await clear.click();
      await page.waitForTimeout(700);
    }
    await page
      .locator('input[placeholder="Search merchant or device ID"]:visible')
      .first()
      .fill(id);
    await page.waitForTimeout(3000);
    const row = page.getByRole('row').nth(1);
    const txt = (await row.innerText().catch(() => '(no row)')).replace(/\s+/g, ' ');
    if (await row.isVisible().catch(() => false)) await outline(row);
    out.push(`${id} | ${label} | ${txt.slice(0, 200)}`);
    await shot(
      page,
      `VP-4590_DEVICE_${label.split(' — ')[0].replace(/[^\w.]+/g, '_')}_${id.slice(-4)}`,
      `POS device ${id} · ${label} · "App / OS" = device's current app version`,
    );
  }
  fs.writeFileSync(`${OUT_DIR}/device-evidence.txt`, out.join('\n'));
  console.log(out.join('\n'));
});
