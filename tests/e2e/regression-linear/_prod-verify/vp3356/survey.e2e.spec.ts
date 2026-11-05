import { test, expect } from '@fixtures/index';
import * as fs from 'fs';
import * as path from 'path';
import type { Request } from '@playwright/test';
import { Urls, reportV4Url } from '@constants/urls';
import { blockMutations } from '@helpers/writeGuard';

/**
 * PROD read-only data survey for VP-3356 / VP-3891 (ad-hoc).
 * Pulls the frozen Staff Payroll rows of every closed period (GET only) and the
 * Reports V4 Staff Income / Staff Payroll block calls, so zero-income staff can be
 * located across many periods before the UI checks.
 */
const OUT =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp3356/data';

const allowed = (u: URL): boolean =>
  /\/v4\/report_queries\/[^/]+\/run$/.test(u.pathname) || /refresh_token/.test(u.pathname);

const pick = (h: Record<string, string>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (/^(authorization|x-merch-id|accept|content-type)$/i.test(k)) out[k] = v;
  }
  return out;
};

test('survey closed periods + reports v4 calls', async ({ page, payrollPage }) => {
  test.setTimeout(600_000);
  const blocked = await blockMutations(page, (u) => !allowed(u));

  // 1) Capture the frozen-rows request the UI makes for a closed period.
  await page.goto(`${Urls.PAYROLL}?tab=staff-payroll`, { waitUntil: 'domcontentloaded' });
  await payrollPage.waitForStaffPayrollRows();
  const periodsRes = await page.request.get(
    'https://volt-pos.v2.fastboypay.com/payroll_periods?status=locked&order[lockedAt]=desc&page=1',
    {
      headers: { 'x-merch-id': process.env.STORE_ID ?? '' },
      failOnStatusCode: false,
    },
  );
  console.log('periods via page.request', periodsRes.status());

  await payrollPage.payPeriodCombobox.click();
  const frozenReq = page.waitForRequest(
    (r) => new URL(r.url()).pathname === '/staff_payrolls' && r.method() === 'GET',
  );
  await page.getByRole('option', { name: /^Oct 16, 2026 - Oct 31, 2026$/ }).click();
  const req: Request = await frozenReq;
  const headers = pick(await req.allHeaders());
  const sample = await (await req.response())!.json();
  console.log('FROZEN URL', req.url());
  console.log('HEADERS', Object.keys(headers));
  fs.writeFileSync(
    path.join(OUT, 'frozen-sample.json'),
    JSON.stringify({ url: req.url(), sample }, null, 2),
  );

  // 2) All locked periods, all pages (GET only).
  const periods = (await periodsRes.json()) as {
    member: { id: string; startDate: string; endDate: string }[];
  };
  const frozen: Record<string, unknown[]> = {};
  for (const p of periods.member) {
    const rows: unknown[] = [];
    for (let n = 1; n < 50; n++) {
      const u = new URL(req.url());
      u.searchParams.set('page', String(n));
      u.searchParams.set('periodId', p.id);
      const res = await page.request.get(u.toString(), { headers, failOnStatusCode: false });
      expect(res.status(), u.toString()).toBe(200);
      const body = (await res.json()) as { member: unknown[]; totalItems: number };
      rows.push(...body.member);
      if (body.member.length === 0 || rows.length >= body.totalItems) break;
    }
    frozen[`${p.startDate}_${p.endDate}_${p.id}`] = rows;
    console.log(p.startDate, p.endDate, rows.length);
  }
  fs.writeFileSync(path.join(OUT, 'frozen-all.json'), JSON.stringify(frozen));

  // 3) Reports V4 Staff Income + Staff Payroll: record the block calls.
  const calls: { method: string; url: string; status: number; post?: unknown; body?: unknown }[] =
    [];
  page.on('response', async (r) => {
    const u = new URL(r.url());
    if (!/report_blocks|report_queries/.test(u.pathname)) return;
    let body: unknown;
    let post: unknown;
    try {
      body = await r.json();
    } catch {
      /* ignore */
    }
    try {
      post = r.request().postDataJSON();
    } catch {
      /* ignore */
    }
    calls.push({ method: r.request().method(), url: r.url(), status: r.status(), post, body });
  });
  await page.goto(
    `${reportV4Url('staff-income')}?after=2026-11-01&before=2026-11-03&include_no_income=true`,
  );
  await page.waitForLoadState('load').catch(() => undefined);
  await page.waitForTimeout(3000);
  await page.goto(`${reportV4Url('staff-payroll')}`);
  await page.waitForLoadState('load').catch(() => undefined);
  await page.waitForTimeout(3000);
  fs.writeFileSync(path.join(OUT, 'rv4-calls.json'), JSON.stringify(calls, null, 2));
  for (const c of calls) console.log(c.method, c.status, c.url.slice(0, 220));
  console.log('BLOCKED', blocked);
});
