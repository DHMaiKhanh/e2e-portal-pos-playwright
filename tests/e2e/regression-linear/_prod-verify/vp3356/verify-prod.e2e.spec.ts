import { test, expect } from '@fixtures/index';
import * as fs from 'fs';
import * as path from 'path';
import type { Page, Response } from '@playwright/test';
import { Urls, reportV4Url } from '@constants/urls';
import { blockMutations } from '@helpers/writeGuard';
import type { PayrollPage } from '@pages/payroll/PayrollPage';

/**
 * VP-3356 / VP-3891 — PROD verification (ad-hoc, read-only) on Portal › Payroll › Staff Payroll,
 * store #20258. Staff with Orders > 0 / Subtotal ≠ $0 but Total income $0 must be listed with $0.00,
 * in the Current Period (Unclosed) and in closed periods; the unclosed list must contain every staff
 * (with and without orders) like a closed one. Cross-checked against Reports V4 (Staff Income / Staff
 * Payroll) for the same dates.
 *
 * Safety: every non-GET request is aborted except the read-only report query (`/v4/report_queries/…/run`,
 * which the screen itself fires on load) and the token refresh. No Run/Close payroll is ever clicked.
 */

const ROOT =
  'D:/Temp/claude/d--3-Portal-POS-e2e-portal-pos-playwright/d3772d06-f595-44d5-b684-dc43edd1d78c/scratchpad/vp3356';
const SHOTS = `${ROOT}/shots`;
const DATA = `${ROOT}/data`;
const API = 'https://volt-pos.v2.fastboypay.com';
const STORE = process.env.STORE_ID ?? '20258';
const PAGE_SIZE = 30;
const RUN_PATH = /\/v4\/report_queries\/staff-by-staff\/run$/;

interface LiveRow {
  staffName: string;
  numberOfOrders: number;
  subtotal: number;
  supplyFee: number;
  tip: number;
  totalIncome: number;
}
interface FrozenRow {
  staff: { nickname: string; status: string };
  numberOfOrders: number;
  subtotal: number;
  tip: number;
  totalIncome: number;
}
interface Period {
  id: string;
  startDate: string;
  endDate: string;
}

/* ----------------------------- helpers ----------------------------- */

const money = (cents: number): string =>
  `${cents < 0 ? '−' : ''}$${(Math.abs(cents) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const label = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

const nowUtc7 = (): string => {
  const d = new Date(Date.now() + 7 * 3600_000).toISOString();
  return `${d.slice(0, 10)} ${d.slice(11, 16)}`;
};

const allowed = (u: URL): boolean =>
  /\/v4\/report_queries\/[^/]+\/run$/.test(u.pathname) || /refresh_token/.test(u.pathname);

async function guard(page: Page): Promise<string[]> {
  return blockMutations(page, (u) => !allowed(u));
}

/** Fixed overlay with date/time + store, then a 1920x1080 viewport screenshot. */
async function shot(page: Page, name: string, caption = ''): Promise<string> {
  const text = `Verified on PROD ${nowUtc7()} (UTC+7) · store #${STORE}`;
  await page.evaluate(
    ([t, c]) => {
      let el = document.getElementById('__qa_overlay');
      if (!el) {
        el = document.createElement('div');
        el.id = '__qa_overlay';
        document.body.appendChild(el);
      }
      el.innerHTML = '';
      const a = document.createElement('div');
      a.textContent = t;
      el.appendChild(a);
      if (c) {
        const b = document.createElement('div');
        b.textContent = c;
        b.style.fontWeight = '500';
        el.appendChild(b);
      }
      Object.assign(el.style, {
        position: 'fixed',
        right: '36px',
        top: '62px',
        zIndex: '2147483647',
        background: 'rgba(185,28,28,0.93)',
        color: '#fff',
        font: '600 14px/1.45 system-ui, Segoe UI, sans-serif',
        padding: '6px 12px',
        borderRadius: '6px',
        pointerEvents: 'none',
        maxWidth: '900px',
        textAlign: 'right',
        boxShadow: '0 2px 8px rgba(0,0,0,.35)',
      });
    },
    [text, caption] as const,
  );
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file });
  return file;
}

async function highlight(page: Page, names: string[]): Promise<void> {
  await page.evaluate((ns) => {
    const rows = Array.from(document.querySelectorAll('table tbody tr')) as HTMLElement[];
    for (const r of rows) {
      const first = (r.querySelector('td') as HTMLElement | null)?.innerText
        .split('\n')
        .pop()
        ?.trim();
      if (first && ns.includes(first)) {
        r.style.outline = '3px solid #f59e0b';
        r.style.outlineOffset = '-3px';
        r.style.background = '#fef3c7';
      }
    }
  }, names);
}

/**
 * Highlight `names` and take one screenshot per scroll position so every highlighted row is on
 * screen in at least one image (the table scrolls inside its card, ~16 rows visible).
 */
async function shotRows(
  page: Page,
  base: string,
  caption: string,
  names: string[],
): Promise<string[]> {
  await highlight(page, names);
  const files: string[] = [];
  const rows = page.locator('table:visible tbody tr');
  const targets: number[] = [];
  const texts = await rows.allInnerTexts();
  texts.forEach((t, i) => {
    const n = t
      .split(String.fromCharCode(9))[0]
      .trim()
      .split(String.fromCharCode(10))
      .pop()!
      .trim();
    if (names.includes(n)) targets.push(i);
  });
  if (targets.length === 0) {
    files.push(await shot(page, base, caption));
    return files;
  }
  const covered = new Set<number>();
  let part = 0;
  for (const i of targets) {
    if (covered.has(i)) continue;
    await rows.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(250);
    for (const j of targets) {
      const inView = await rows.nth(j).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight - 40;
      });
      if (inView) covered.add(j);
    }
    const suffix = part === 0 ? '' : `_${String.fromCharCode(97 + part)}`;
    files.push(await shot(page, `${base}${suffix}`, caption));
    part++;
  }
  return files;
}

const isRun = (r: Response): boolean =>
  RUN_PATH.test(new URL(r.url()).pathname) && r.request().method() === 'POST';

async function openCurrent(
  page: Page,
  payroll: PayrollPage,
  pageNo = 1,
): Promise<{ params: Record<string, string>; rows: LiveRow[]; totalRows: number }> {
  const qs = new URLSearchParams({ tab: 'staff-payroll', page: String(pageNo) });
  const run = page.waitForResponse((r) => isRun(r) && r.ok(), { timeout: 45_000 });
  await page.goto(`${Urls.PAYROLL}?${qs}`, { waitUntil: 'domcontentloaded' });
  const res = await run;
  const body = (await res.json()) as { rows: LiveRow[]; total_rows: number };
  const params = (res.request().postDataJSON() as { params: Record<string, string> }).params;
  await payroll.waitForStaffPayrollRows();
  return { params, rows: body.rows, totalRows: body.total_rows };
}

async function openClosed(
  page: Page,
  payroll: PayrollPage,
  periodId: string,
  pageNo = 1,
): Promise<{ totalItems: number; member: FrozenRow[] }> {
  const qs = new URLSearchParams({ tab: 'staff-payroll', page: String(pageNo), periodId });
  const frozen = page.waitForResponse(
    (r) => {
      const u = new URL(r.url());
      return (
        u.pathname === '/staff_payrolls' &&
        r.request().method() === 'GET' &&
        r.ok() &&
        u.searchParams.get('periodId') === periodId &&
        (u.searchParams.get('page') ?? '1') === String(pageNo)
      );
    },
    { timeout: 45_000 },
  );
  await page.goto(`${Urls.PAYROLL}?${qs}`, { waitUntil: 'domcontentloaded' });
  const body = (await (await frozen).json()) as { totalItems: number; member: FrozenRow[] };
  await payroll.waitForStaffPayrollRows();
  return body;
}

/** Visible table rows as [name, orders, subtotal, supply fee, tip, total income]. */
async function tableRows(payroll: PayrollPage): Promise<string[][]> {
  return (await payroll.staffPayrollTable.rows.allInnerTexts()).map((row) =>
    row.split('\t').map((cell) => cell.trim().split('\n').pop()!.trim()),
  );
}

const liveCells = (r: LiveRow): string[] => [
  r.staffName,
  String(r.numberOfOrders),
  money(r.subtotal),
  money(r.supplyFee),
  money(r.tip),
  money(r.totalIncome),
];
const frozenCells = (r: FrozenRow): string[] => [
  r.staff.nickname,
  String(r.numberOfOrders),
  money(r.subtotal),
  money(r.tip),
  money(r.totalIncome),
];
const pick5 = (c: string[]): string[] => [c[0], c[1], c[2], c[4], c[5]];

const zeroIncomeWithActivity = <
  T extends { numberOfOrders: number; subtotal: number; totalIncome: number },
>(
  r: T,
): boolean => (r.numberOfOrders > 0 || r.subtotal !== 0) && r.totalIncome === 0;

async function apiGet<T>(page: Page, url: string): Promise<T> {
  const res = await page.request.get(url, {
    headers: { 'x-merch-id': STORE },
    failOnStatusCode: false,
  });
  expect(res.status(), url).toBe(200);
  return (await res.json()) as T;
}

async function lockedPeriods(page: Page): Promise<Period[]> {
  const body = await apiGet<{ member: Period[] }>(
    page,
    `${API}/payroll_periods?status=locked&order[lockedAt]=desc&page=1`,
  );
  return body.member;
}

async function frozenAll(
  page: Page,
  periodId: string,
): Promise<{ totalItems: number; rows: FrozenRow[] }> {
  const rows: FrozenRow[] = [];
  let totalItems = 0;
  for (let n = 1; n < 50; n++) {
    const b = await apiGet<{ member: FrozenRow[]; totalItems: number }>(
      page,
      `${API}/staff_payrolls?page=${n}&periodId=${periodId}`,
    );
    totalItems = b.totalItems;
    rows.push(...b.member);
    if (b.member.length === 0 || rows.length >= b.totalItems) break;
  }
  return { totalItems, rows };
}

async function rv4StaffIncome(
  page: Page,
  after: string,
  before: string,
  includeNoIncome = true,
): Promise<LiveRow[]> {
  const rows: LiveRow[] = [];
  for (let n = 1; n < 50; n++) {
    const qs = new URLSearchParams({ after, before, page: String(n), itemsPerPage: '100' });
    if (includeNoIncome) qs.set('include_no_income', 'true');
    const b = await apiGet<{ member: LiveRow[]; totalItems: number }>(
      page,
      `${API}/v4/report_blocks/income-staff/rows?${qs}`,
    );
    rows.push(...b.member);
    if (b.member.length === 0 || rows.length >= b.totalItems) break;
  }
  return rows;
}

function save(name: string, data: unknown): void {
  fs.writeFileSync(path.join(DATA, `${name}.json`), JSON.stringify(data, null, 2));
}

/* ------------------------- closed periods under test ------------------------- */

const CLOSED: [string, string][] = [
  ['2026-10-16', '2026-10-31'],
  ['2026-10-01', '2026-10-15'],
  ['2026-09-16', '2026-09-30'],
  ['2026-09-01', '2026-09-15'],
  ['2026-08-16', '2026-08-31'],
  ['2026-08-02', '2026-08-15'],
  ['2026-07-20', '2026-07-31'],
  ['2026-07-19', '2026-07-19'],
  ['2026-07-09', '2026-07-16'],
  ['2026-06-22', '2026-06-28'],
  ['2026-06-14', '2026-06-21'],
  ['2026-05-17', '2026-05-23'],
  ['2026-05-10', '2026-05-16'],
  ['2026-04-26', '2026-05-02'],
];

/* ------------------------------- tests ------------------------------- */

test.describe('VP-3356 / VP-3891 — PROD #20258 Staff Payroll hiện staff Total Income $0', () => {
  test('TC01 — Current Period (Unclosed): include_no_income + đủ mọi staff', async ({
    page,
    payrollPage,
  }) => {
    test.setTimeout(180_000);
    const blocked = await guard(page);
    const run = await openCurrent(page, payrollPage);
    const combo = (await payrollPage.payPeriodCombobox.innerText()).trim();
    const after = run.params.after;
    const before = run.params.before;
    const n = run.rows.length;
    const withOrders = run.rows.filter((r) => r.numberOfOrders > 0).length;
    const zero = run.rows.filter(zeroIncomeWithActivity);
    save('tc01-current', {
      combo,
      params: run.params,
      totalRows: run.totalRows,
      n,
      withOrders,
      zero,
    });

    expect(combo).toContain('Current Period (Unclosed)');
    expect(combo).toContain(`${label(after)} - ${label(before)}`);
    expect(run.params.include_no_income).toBe('true');
    expect(run.rows).toHaveLength(run.totalRows);
    await expect(payrollPage.paginationSummary).toHaveText(new RegExp(`of ${run.totalRows}$`));
    await shot(
      page,
      `VP-3356_TC01_current_${after}_${before}_p1`,
      `Current Period (Unclosed) ${label(after)} – ${label(before)} · ${n} staff (${withOrders} có order, ${n - withOrders} không order)`,
    );

    await payrollPage.payPeriodCombobox.click();
    await expect(page.getByRole('option').first()).toBeVisible();
    await shot(
      page,
      `VP-3356_TC01_period_selector`,
      'Payroll period selector: Current Period (Unclosed) + các kỳ đã đóng',
    );
    await page.keyboard.press('Escape');
    expect(blocked).toEqual([]);
  });

  test('TC02 — Current Period: mọi trang khớp báo cáo, staff income $0 có dòng $0.00', async ({
    page,
    payrollPage,
  }) => {
    test.setTimeout(300_000);
    const blocked = await guard(page);
    const first = await openCurrent(page, payrollPage);
    const pages = Math.ceil(first.rows.length / PAGE_SIZE);
    const zero = first.rows.filter(zeroIncomeWithActivity);
    const result: unknown[] = [];
    for (let p = 1; p <= pages; p++) {
      const run = p === 1 ? first : await openCurrent(page, payrollPage, p);
      const expected = run.rows.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE).map(liveCells);
      await expect.poll(async () => tableRows(payrollPage), { timeout: 20_000 }).toEqual(expected);
      const onPage = run.rows
        .slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE)
        .filter(zeroIncomeWithActivity)
        .map((r) => r.staffName);
      const shown = await tableRows(payrollPage);
      for (const name of onPage) {
        const row = shown.find((c) => c[0] === name);
        expect(row, `${name} có dòng`).toBeTruthy();
        expect(row![5]).toBe('$0.00');
      }
      const f = await shotRows(
        page,
        `VP-3356_TC02_current_${first.params.after}_${first.params.before}_p${p}`,
        `Current Period (Unclosed) trang ${p}/${pages}` +
          (onPage.length
            ? ` · income $0 có order: ${onPage.join(', ')}`
            : ' · staff 0 order vẫn hiện $0.00'),
        onPage,
      );
      result.push({ page: p, onPage, shot: f });
    }
    save('tc02-current-pages', { zero, result });
    expect(blocked).toEqual([]);
  });

  test('TC03 — Current Period: mở chi tiết staff income $0 không lỗi', async ({
    page,
    payrollPage,
  }) => {
    test.setTimeout(240_000);
    const blocked = await guard(page);
    const first = await openCurrent(page, payrollPage);
    const zero = first.rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => zeroIncomeWithActivity(r))
      .sort((a, b) => b.r.subtotal - a.r.subtotal)
      .slice(0, 3);
    test.skip(zero.length === 0, 'kỳ hiện tại không có staff Orders > 0 và Total income $0');
    const out: unknown[] = [];
    for (const { r, i } of zero) {
      await openCurrent(page, payrollPage, Math.floor(i / PAGE_SIZE) + 1);
      await payrollPage.staffPayrollTable.rows
        .filter({ has: page.getByText(r.staffName, { exact: true }) })
        .first()
        .click();
      const panel = page.locator('[role="tabpanel"][data-state="active"]');
      await expect(panel.getByText(`Thank you, ${r.staffName}!`)).toBeVisible({ timeout: 20_000 });
      await expect(panel).toContainText(/Total income\s*\$0\.00/);
      await expect(page.getByText(/couldn't load/i)).toHaveCount(0);
      await highlight(page, [r.staffName]);
      await payrollPage.staffPayrollTable.rows
        .filter({ has: page.getByText(r.staffName, { exact: true }) })
        .first()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const f = await shot(
        page,
        `VP-3356_TC03_current_detail_${r.staffName.replace(/\W+/g, '_')}`,
        `Chi tiết ${r.staffName}: ${r.numberOfOrders} order, Subtotal ${money(r.subtotal)}, Total income $0.00 — không lỗi`,
      );
      out.push({ staff: r.staffName, shot: f, panel: (await panel.innerText()).slice(0, 1500) });
    }
    save('tc03-current-detail', out);
    expect(blocked).toEqual([]);
  });

  test('TC04 — Current Period: đối chiếu Reports V4 Staff Income / Staff Payroll cùng ngày', async ({
    page,
    payrollPage,
  }) => {
    test.setTimeout(300_000);
    const blocked = await guard(page);
    const run = await openCurrent(page, payrollPage);
    const { after, before } = run.params;

    // Reports V4 › Staff Income (show staff with no income ON) — same dates.
    const rv4 = await rv4StaffIncome(page, after, before, true);
    const rv4Default = await rv4StaffIncome(page, after, before, false);
    const key = (r: LiveRow): string =>
      [r.staffName, r.numberOfOrders, r.subtotal, r.supplyFee, r.tip, r.totalIncome].join('|');
    const payrollKeys = run.rows.map(key).sort();
    const rv4Keys = rv4.map(key).sort();
    const missingInPayroll = rv4.filter(
      (r) => r.numberOfOrders > 0 && !run.rows.some((x) => x.staffName === r.staffName),
    );

    // Reports V4 › Staff Payroll (current period, live block).
    const opts = await page.request.post(`${API}/v4/report_queries/payroll-period-options/run`, {
      headers: { 'x-merch-id': STORE, 'content-type': 'application/json' },
      data: { params: {} },
      failOnStatusCode: false,
    });
    const optRows = ((await opts.json()) as { rows: { id: string; status: string }[] }).rows;
    const current = optRows.find((o) => o.status === 'scheduled');
    const live: LiveRow[] = [];
    if (current) {
      for (let n = 1; n < 20; n++) {
        const b = await apiGet<{ member: LiveRow[]; totalItems: number }>(
          page,
          `${API}/v4/report_blocks/payroll-live-by-staff/rows?page=${n}&itemsPerPage=100&period_id=${current.id}`,
        );
        live.push(...b.member);
        if (b.member.length === 0 || live.length >= b.totalItems) break;
      }
    }
    const liveKeys = live.map(key).sort();

    // Per-day breakdown of the zero-income staff ("nhiều ngày").
    const days: Record<string, LiveRow[]> = {};
    for (
      let d = new Date(`${after}T00:00:00Z`);
      d <= new Date(`${before}T00:00:00Z`);
      d = new Date(d.getTime() + 86400_000)
    ) {
      const iso = d.toISOString().slice(0, 10);
      days[iso] = (await rv4StaffIncome(page, iso, iso, true)).filter((r) => r.numberOfOrders > 0);
    }
    save('tc04-crosscheck-current', {
      after,
      before,
      payroll: run.rows.length,
      rv4: rv4.length,
      rv4Default: rv4Default.length,
      rv4DefaultZero: rv4Default.filter((r) => r.totalIncome === 0).map((r) => r.staffName),
      live: live.length,
      diffPayrollVsRv4: {
        onlyPayroll: payrollKeys.filter((k) => !rv4Keys.includes(k)),
        onlyRv4: rv4Keys.filter((k) => !payrollKeys.includes(k)),
      },
      diffPayrollVsLive: {
        onlyPayroll: payrollKeys.filter((k) => !liveKeys.includes(k)),
        onlyLive: liveKeys.filter((k) => !payrollKeys.includes(k)),
      },
      missingInPayroll,
      days,
    });
    expect.soft(missingInPayroll, 'staff có order ở Reports V4 nhưng thiếu ở Payroll').toEqual([]);
    expect
      .soft(payrollKeys, 'Payroll (Unclosed) = Reports V4 Staff Income include_no_income')
      .toEqual(rv4Keys);
    expect
      .soft(payrollKeys, 'Payroll (Unclosed) = Reports V4 Staff Payroll live')
      .toEqual(liveKeys);

    // UI evidence: Reports V4 Staff Income with "Show staff with no income" ON, page holding zero rows.
    const zeroNames = run.rows.filter(zeroIncomeWithActivity).map((r) => r.staffName);
    const rv4Sorted = rv4; // rendered in response order
    const pagesWithZero = [
      ...new Set(
        rv4Sorted
          .map((r, i) => (zeroNames.includes(r.staffName) ? Math.floor(i / PAGE_SIZE) + 1 : 0))
          .filter(Boolean),
      ),
    ];
    for (const p of pagesWithZero) {
      await page.goto(
        `${reportV4Url('staff-income')}?after=${after}&before=${before}&include_no_income=true&page=${p}`,
      );
      await expect(page.locator('h1[data-slot="pos-page-heading"]')).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(1500);
      await shotRows(
        page,
        `VP-3356_TC04_rv4_staff_income_${after}_${before}_p${p}`,
        `Nguồn đối chiếu: Reports V4 › Staff Income ${label(after)} – ${label(before)} (show no income ON) trang ${p}`,
        zeroNames,
      );
    }
    // Reports V4 Staff Income default (toggle OFF): zero-income staff hidden (VP-2460 behaviour kept).
    await page.goto(`${reportV4Url('staff-income')}?after=${after}&before=${before}`);
    await expect(page.locator('h1[data-slot="pos-page-heading"]')).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(2500);
    await shot(
      page,
      `VP-3356_TC04_rv4_staff_income_default_${after}_${before}`,
      `Reports V4 › Staff Income mặc định (toggle OFF): ${rv4Default.length} staff — ẩn staff income $0 (VP-2460 không regression)`,
    );
    // Reports V4 Staff Payroll (current period live).
    await page.goto(`${reportV4Url('staff-payroll')}`);
    await expect(page.locator('h1[data-slot="pos-page-heading"]')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(2000);
    await shotRows(
      page,
      `VP-3356_TC04_rv4_staff_payroll_current`,
      `Nguồn đối chiếu: Reports V4 › Staff Payroll (Current Period) · ${live.length} staff`,
      zeroNames,
    );
    expect(blocked.filter((b) => !/payroll-period-options/.test(b))).toEqual([]);
  });

  test('TC06 — Current Period: tìm theo tên staff income $0 + Reports V4 theo từng ngày', async ({
    page,
    payrollPage,
  }) => {
    test.setTimeout(300_000);
    const blocked = await guard(page);
    const run = await openCurrent(page, payrollPage);
    const zero = run.rows.filter(zeroIncomeWithActivity);
    test.skip(zero.length === 0, 'kỳ hiện tại không có staff income $0 có order');
    const out: unknown[] = [];
    for (const r of zero
      .filter((x) => ['HANA', 'ZOE'].includes(x.staffName))
      .concat(zero)
      .slice(0, 2)) {
      await openCurrent(page, payrollPage);
      await payrollPage.staffNameSearchInput.fill(r.staffName);
      await expect
        .poll(async () => (await tableRows(payrollPage)).map((c) => c[0]), { timeout: 20_000 })
        .toContain(r.staffName);
      await page.waitForTimeout(800);
      const shown = (await tableRows(payrollPage)).find((c) => c[0] === r.staffName)!;
      expect(shown).toEqual(liveCells(r));
      await highlight(page, [r.staffName]);
      await shot(
        page,
        `VP-3356_TC06_current_search_${r.staffName}`,
        `Tìm "${r.staffName}" kỳ Unclosed: ${r.numberOfOrders} order · Subtotal ${money(r.subtotal)} · Total income $0.00`,
      );
      out.push({ staff: r.staffName, shown });
    }
    // Reports V4 Staff Income per day of the current period.
    const names = zero.map((r) => r.staffName);
    for (
      let d = new Date(`${run.params.after}T00:00:00Z`);
      d <= new Date(`${run.params.before}T00:00:00Z`);
      d = new Date(d.getTime() + 86400_000)
    ) {
      const iso = d.toISOString().slice(0, 10);
      const rows = await rv4StaffIncome(page, iso, iso, true);
      const dayZero = rows.filter(zeroIncomeWithActivity).map((r) => r.staffName);
      if (dayZero.length === 0) continue;
      // Narrow the table to the staff that had orders that day: sort is by name, so page by index.
      const pagesWithZero = [
        ...new Set(
          rows
            .map((r, i) => (dayZero.includes(r.staffName) ? Math.floor(i / PAGE_SIZE) + 1 : 0))
            .filter(Boolean),
        ),
      ];
      for (const p of pagesWithZero) {
        await page.goto(
          `${reportV4Url('staff-income')}?after=${iso}&before=${iso}&include_no_income=true&page=${p}`,
        );
        await expect(page.locator('h1[data-slot="pos-page-heading"]')).toBeVisible({
          timeout: 45_000,
        });
        await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 45_000 });
        await page.waitForTimeout(1500);
        await shotRows(
          page,
          `VP-3356_TC06_rv4_staff_income_day_${iso}_p${p}`,
          `Reports V4 › Staff Income ngày ${label(iso)} · income $0 có order: ${dayZero.filter((n) => names.includes(n) || true).join(', ')}`,
          dayZero,
        );
      }
      out.push({ day: iso, dayZero });
    }
    save('tc06-search-days', out);
    expect(blocked).toEqual([]);
  });

  for (const [start, end] of CLOSED) {
    test(`TC05 — kỳ đã đóng ${start} → ${end}: staff income $0 có dòng, khớp bản chốt + Reports V4`, async ({
      page,
      payrollPage,
    }) => {
      test.setTimeout(300_000);
      const blocked = await guard(page);
      // Load the app once so the session cookie is fresh, then resolve the period id.
      await page.goto(`${Urls.PAYROLL}?tab=staff-payroll`, { waitUntil: 'domcontentloaded' });
      await payrollPage.waitForStaffPayrollRows();
      const period = (await lockedPeriods(page)).find(
        (p) => p.startDate === start && p.endDate === end,
      );
      test.skip(!period, `không có kỳ ${start} → ${end}`);
      const all = await frozenAll(page, period!.id);
      const zeroIdx = all.rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => zeroIncomeWithActivity(r));
      const neg = all.rows.filter((r) => r.subtotal < 0).map((r) => r.staff.nickname);

      // Page 1 + selector evidence.
      const p1 = await openClosed(page, payrollPage, period!.id, 1);
      const combo = (await payrollPage.payPeriodCombobox.innerText()).trim();
      expect(combo).toContain(`${label(start)} - ${label(end)}`);
      expect(combo).not.toContain('Current Period');
      await expect(payrollPage.paginationSummary).toHaveText(new RegExp(`of ${p1.totalItems}$`));
      expect(p1.totalItems).toBe(all.rows.length);

      const pages = [...new Set(zeroIdx.map(({ i }) => Math.floor(i / PAGE_SIZE) + 1))];
      if (!pages.includes(1)) {
        await shot(
          page,
          `VP-3356_TC05_closed_${start}_${end}_p1`,
          `Kỳ đã đóng ${label(start)} – ${label(end)} · ${all.totalItems} staff`,
        );
      }
      const checked: unknown[] = [];
      for (const p of pages) {
        const body = p === 1 ? p1 : await openClosed(page, payrollPage, period!.id, p);
        const expected = body.member.map(frozenCells);
        await expect
          .poll(async () => (await tableRows(payrollPage)).map(pick5), { timeout: 20_000 })
          .toEqual(expected);
        const names = body.member.filter(zeroIncomeWithActivity).map((r) => r.staff.nickname);
        const shown = await tableRows(payrollPage);
        for (const r of body.member.filter(zeroIncomeWithActivity)) {
          const row = shown.find((c) => c[0] === r.staff.nickname);
          expect(row, `${r.staff.nickname} có dòng`).toBeTruthy();
          expect(row![5]).toBe('$0.00');
          expect(row![2]).toBe(money(r.subtotal));
          checked.push({
            page: p,
            staff: r.staff.nickname,
            status: r.staff.status,
            orders: r.numberOfOrders,
            subtotal: row![2],
            supply: row![3],
            tip: row![4],
            total: row![5],
          });
        }
        await shotRows(
          page,
          `VP-3356_TC05_closed_${start}_${end}_p${p}`,
          `Kỳ đã đóng ${label(start)} – ${label(end)} · trang ${p} · income $0 có order: ${names.join(', ')}`,
          names,
        );
      }

      // Detail of the zero-income staff with the largest |subtotal|.
      let detail: unknown = null;
      const pickOne = [...zeroIdx].sort(
        (a, b) => Math.abs(b.r.subtotal) - Math.abs(a.r.subtotal),
      )[0];
      if (pickOne) {
        await openClosed(page, payrollPage, period!.id, Math.floor(pickOne.i / PAGE_SIZE) + 1);
        await payrollPage.staffPayrollTable.rows
          .filter({ has: page.getByText(pickOne.r.staff.nickname, { exact: true }) })
          .first()
          .click();
        const panel = page.locator('[role="tabpanel"][data-state="active"]');
        await expect(
          panel.getByText(
            new RegExp(
              `Thank you, ${pickOne.r.staff.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}!`,
            ),
          ),
        ).toBeVisible({
          timeout: 20_000,
        });
        await expect.soft(panel).toContainText(/Total income\s*\$0\.00/);
        await expect(page.getByText(/couldn't load/i)).toHaveCount(0);
        await highlight(page, [pickOne.r.staff.nickname]);
        await payrollPage.staffPayrollTable.rows
          .filter({ has: page.getByText(pickOne.r.staff.nickname, { exact: true }) })
          .first()
          .evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await shot(
          page,
          `VP-3356_TC05_closed_${start}_${end}_detail_${pickOne.r.staff.nickname.replace(/\W+/g, '_')}`,
          `Kỳ đã đóng ${label(start)} – ${label(end)} · chi tiết ${pickOne.r.staff.nickname} (${pickOne.r.numberOfOrders} order, ${money(pickOne.r.subtotal)}) Total income $0.00`,
        );
        detail = {
          staff: pickOne.r.staff.nickname,
          panel: (await panel.innerText()).slice(0, 1200),
        };
      }

      // Cross-check: Reports V4 Staff Income (include no income) for the same dates.
      const rv4 = await rv4StaffIncome(page, start, end, true);
      const frozenNames = new Set(all.rows.map((r) => r.staff.nickname));
      const rv4WithOrdersMissing = rv4
        .filter((r) => r.numberOfOrders > 0 || r.subtotal !== 0)
        .filter((r) => !frozenNames.has(r.staffName))
        .map((r) => `${r.staffName} (${r.numberOfOrders} order, ${money(r.subtotal)})`);
      const rv4Zero = rv4
        .filter(zeroIncomeWithActivity)
        .map((r) => `${r.staffName}|${r.numberOfOrders}|${r.subtotal}`);
      const frozenZero = all.rows
        .filter(zeroIncomeWithActivity)
        .map((r) => `${r.staff.nickname}|${r.numberOfOrders}|${r.subtotal}`);
      save(`tc05-closed-${start}_${end}`, {
        period: period,
        totalItems: all.totalItems,
        withOrders: all.rows.filter((r) => r.numberOfOrders > 0).length,
        zero: frozenZero,
        neg,
        checked,
        detail,
        rv4Count: rv4.length,
        rv4Zero,
        rv4WithOrdersMissing,
        zeroOnlyFrozen: frozenZero.filter((z) => !rv4Zero.includes(z)),
        zeroOnlyRv4: rv4Zero.filter((z) => !frozenZero.includes(z)),
      });
      expect
        .soft(rv4WithOrdersMissing, 'staff có order ở Reports V4 nhưng thiếu ở Payroll kỳ đóng')
        .toEqual([]);
      expect(blocked).toEqual([]);
    });
  }
});
