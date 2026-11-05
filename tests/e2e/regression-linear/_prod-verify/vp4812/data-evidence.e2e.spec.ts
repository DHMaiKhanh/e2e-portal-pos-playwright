import { test, expect } from '@fixtures/index';
import type { Locator, Page } from '@playwright/test';
import * as fs from 'fs';
import { env } from '@configs/env/loadEnv';
import { blockMutations } from '@helpers/writeGuard';

/**
 * VP-4812 PROD — read-only evidence on store #20258: tip orders on several days, their order detail
 * and the customer's Points history row, annotated with the points expected with / without tip.
 * Every non-GET request to the POS API is aborted.
 */
const SCRATCH =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp4812';
const SHOTS = `${SCRATCH}/shots`;

interface Row {
  day: string;
  code: string;
  rid: string;
  cust: string;
  tip: number;
  pay: string;
  withTip: number;
  noTip: number;
  logged: string;
  cid: string;
}

const CASES: { code: string; tag: string }[] = [
  { code: 'OD261103-30940768', tag: 'D1_2026-11-03_after_release' },
  { code: 'OD261026-31627060', tag: 'D2_2026-10-26_pre_release' },
  { code: 'OD261021-39139388', tag: 'D3_2026-10-21_pre_release' },
  { code: 'OD261019-00000620', tag: 'D4_2026-10-19_pre_release' },
  { code: 'OD261017-73455149', tag: 'D5_2026-10-16_pre_release' },
];

test.use({ viewport: { width: 1920, height: 1080 } });

const fmtUtc7 = (): string => {
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

const usd = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

async function shot(page: Page, name: string, extra: string[]): Promise<void> {
  const head = `Verified on PROD ${fmtUtc7()} (UTC+7) · store #20258`;
  await page.evaluate(
    ([h, lines]) => {
      document.getElementById('__vp_stamp')?.remove();
      const d = document.createElement('div');
      d.id = '__vp_stamp';
      d.style.cssText =
        'position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
        'background:#fff3cd;color:#5c3b00;border:2px solid #e0a800;border-radius:6px;padding:5px 12px;' +
        'font:600 13px/1.4 system-ui,Segoe UI,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25);' +
        'pointer-events:none;max-width:1250px;text-align:center;white-space:pre-wrap';
      const b = document.createElement('div');
      b.textContent = h as string;
      b.style.fontSize = '14px';
      d.appendChild(b);
      for (const l of lines as string[]) {
        const e = document.createElement('div');
        e.textContent = l;
        e.style.fontWeight = '500';
        d.appendChild(e);
      }
      document.body.appendChild(d);
      window.scrollTo(0, 0);
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
        if (el.scrollTop === 0 && el.scrollLeft === 0) continue;
        const oy = getComputedStyle(el).overflowY;
        if (oy !== 'auto' && oy !== 'scroll') {
          el.scrollTop = 0;
          el.scrollLeft = 0;
        }
      }
    },
    [head, extra] as const,
  );
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function outline(loc: Locator, color = '#e11d48'): Promise<void> {
  await loc.evaluate((el, c) => {
    (el as HTMLElement).style.outline = `3px solid ${c}`;
    (el as HTMLElement).style.outlineOffset = '2px';
  }, color);
}

test('VP-4812 PROD data — tip orders on several days vs points earned (read-only)', async ({
  page,
}) => {
  test.setTimeout(300_000);
  expect(env.STORE_ID).toBe('20258');
  fs.mkdirSync(SHOTS, { recursive: true });
  const blocked = await blockMutations(page, (u) => /volt-pos\./.test(u.host));

  const rows = JSON.parse(fs.readFileSync(`${SCRATCH}/analysis.json`, 'utf8')) as Row[];
  const orders = JSON.parse(fs.readFileSync(`${SCRATCH}/orders.json`, 'utf8')) as {
    id: string;
    orderCode: string;
    completedAt: string;
  }[];
  const devs = JSON.parse(fs.readFileSync(`${SCRATCH}/order-devices.json`, 'utf8'))
    .result as Record<string, { devInfo: Record<string, { status: number; body: string }> }>;
  const summary: string[] = [];

  for (const { code, tag } of CASES) {
    const r = rows.find((x) => x.code === code);
    const o = orders.find((x) => x.orderCode === code);
    expect(r && o, code).toBeTruthy();
    if (!r || !o) continue;
    const devBody = Object.values(devs[code]?.devInfo ?? {})[0]?.body ?? '';
    const os = /"os":"([^"]+)"/.exec(devBody)?.[1] ?? '?';
    const ver = /"version":"([^"]+)"/.exec(devBody)?.[1] ?? '?';
    const pay = JSON.parse(r.pay) as Record<string, { a: number; t: number }>;
    const payText = Object.entries(pay)
      .map(([k, v]) => `${k} ${usd(v.a)}${v.t ? ` + tip ${usd(v.t)}` : ''}`)
      .join(', ');
    const local = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(o.completedAt));
    const verdict =
      r.logged === String(r.withTip)
        ? 'tip COUNTED'
        : r.logged === String(r.noTip)
          ? 'tip NOT counted'
          : 'unclear';
    const line1 = `${code} · ${local} (US/Central) · POS device ${os} v${ver} · ${r.day >= '2026-11-03' ? 'AFTER' : 'BEFORE'} VP-4812 prod release (2026-11-03 ~07:57 UTC)`;
    const line2 = `Paid: ${payText} · rates cash $0.50 / card $0.01 / gift $2.00 / other $1.00 per pt · expected WITH tip=${r.withTip} / WITHOUT tip=${r.noTip} · logged +${r.logged} → ${verdict}`;
    summary.push(`${tag} | ${line1} | ${line2}`);

    // Order detail (summary card with Tip + payment details).
    await page.goto(`/pos/nail/20258/orders/${o.id}`, { waitUntil: 'domcontentloaded' });
    const summaryCard = page.getByText('Order summary', { exact: true });
    await summaryCard.waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    const card = summaryCard.locator('xpath=ancestor::*[.//text()[normalize-space()="Total"]][1]');
    if (await card.count()) await outline(card.first());
    await shot(page, `VP-4812_DATA_${tag}_${code}_order`, [line1, line2]);

    // Customer › Points history row "Complete Checkin <rid>".
    await page.goto(`/pos/nail/20258/customers/${r.cid}`, { waitUntil: 'domcontentloaded' });
    const tab = page.getByRole('tab', { name: /points history/i });
    await tab.waitFor({ timeout: 30_000 });
    await tab.click();
    const panel = page.getByRole('tabpanel');
    await panel.getByRole('row').nth(1).waitFor({ timeout: 30_000 });
    // Cell texts are concatenated ("…669Check out"), so no \b after the id.
    const logRow = panel
      .getByRole('row')
      .filter({ hasText: new RegExp(`Complete Checkin ${r.rid}(?!\\d)`) });
    for (
      let i = 0;
      i < 15 &&
      !(await logRow
        .first()
        .isVisible()
        .catch(() => false));
      i++
    ) {
      const next = panel
        .locator('button[aria-label*="next" i], button:has(svg.lucide-chevron-right)')
        .last();
      if (!(await next.isEnabled().catch(() => false))) break;
      await next.click();
      await page.waitForTimeout(1500);
    }
    await expect(logRow.first()).toBeVisible({ timeout: 10_000 });
    await outline(logRow.first());
    await shot(page, `VP-4812_DATA_${tag}_${code}_points_history`, [
      `Customer "${r.cust}" › Points history · row "Complete Checkin ${r.rid}" = +${r.logged}`,
      line2,
    ]);
  }
  fs.writeFileSync(`${SCRATCH}/data-evidence-summary.txt`, summary.join('\n'));
  expect(blocked, 'no write requests were sent').toEqual([]);
});
