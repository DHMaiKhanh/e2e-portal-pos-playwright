import { expect, type Page } from '@playwright/test';
import { Urls } from '@constants/urls';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';

export interface CdcTask {
  id: string;
  merchant: { id: number; businessName: string };
  status: string;
  createdAt: string;
  data: {
    op?: string;
    tag?: string;
    label?: string;
    table?: string;
    payload?: string;
    error_message?: string;
  };
}

export interface AuditLog {
  id: string;
  merchant?: { id: number; businessName: string } | null;
  severity: string;
  errorMessage?: string;
  requestBody?: {
    label?: string;
    op?: string;
    table?: string;
    tag?: string;
    payload?: unknown;
  } | null;
  createdAt: string;
}

const isPop = (page: Page) => page.locator('[data-slot="popover-content"][data-state="open"]');

/**
 * Monitoring → Report tasks, filtered through the UI chips: Type = Sys Notify Cdc Failure
 * (+ Status = Failed, + Merchant = #20258 when asked). Returns the "1–n of N" pager text
 * (or "empty") and the visible rows.
 */
export async function openCdcReportTasks(
  page: Page,
  opts: { failed?: boolean; merchant?: string } = {},
): Promise<{ pager: string; rows: string[]; heading: string }> {
  await page.goto(`${Urls.MONITOR}?tab=report-task`, { waitUntil: 'domcontentloaded' });
  const panel = page.locator('[role="tabpanel"]:visible').first();
  await expect(
    panel.locator('tbody tr').first().or(page.locator('[data-slot="empty"]:visible')).first(),
  ).toBeVisible({ timeout: 30_000 });

  const typeResp = page.waitForResponse(
    (r) => decodeURIComponent(r.url()).includes('type[]=sys_notify_cdc_failure'),
    { timeout: 20_000 },
  );
  await panel.getByRole('button', { name: 'Type', exact: true }).click();
  await isPop(page).getByRole('option', { name: 'Sys Notify Cdc Failure', exact: true }).click();
  if (await isPop(page).isVisible()) await page.keyboard.press('Escape');
  await typeResp;

  if (opts.failed) {
    const r = page.waitForResponse((x) => decodeURIComponent(x.url()).includes('status[]=failed'), {
      timeout: 20_000,
    });
    await panel.getByRole('button', { name: /filter by status/i }).click();
    await isPop(page).getByRole('option', { name: 'Failed', exact: true }).click();
    if (await isPop(page).isVisible()) await page.keyboard.press('Escape');
    await r;
  }
  if (opts.merchant) {
    const r = page
      .waitForResponse(
        (x) =>
          /background_tasks\?/.test(x.url()) &&
          decodeURIComponent(x.url()).includes(opts.merchant!),
        { timeout: 20_000 },
      )
      .catch(() => undefined);
    await panel.getByRole('button', { name: /filter by merchant/i }).click();
    await isPop(page)
      .getByPlaceholder(/search merchants/i)
      .fill(opts.merchant);
    const opt = isPop(page).getByRole('option').filter({ hasText: opts.merchant }).first();
    await expect(opt).toBeVisible({ timeout: 20_000 });
    await opt.click();
    if (await isPop(page).isVisible()) await page.keyboard.press('Escape');
    await r;
  }
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, { timeout: 15_000 });
  const pagerLoc = panel.locator('[data-slot="pos-pagination-range"]');
  const pager = (await pagerLoc.count()) ? (await pagerLoc.innerText()).trim() : 'empty';
  const rows = (await panel.locator('tbody tr').allInnerTexts()).map((t) =>
    t.replace(/\s+/g, ' ').trim(),
  );
  const heading = (
    await page
      .locator('main p, main [data-slot="page-description"]')
      .first()
      .innerText()
      .catch(() => '')
  ).trim();
  return { pager, rows, heading };
}

/** All sys_notify_cdc_failure tasks newer than `sinceIso` (any status, any merchant), via the Portal's API. */
export async function cdcTasks(
  page: Page,
  opts: { status?: string; merchant?: string } = {},
): Promise<{ total: number; items: CdcTask[] }> {
  const qs = new URLSearchParams({
    page: '1',
    'order[createdAt]': 'desc',
    'type[]': 'sys_notify_cdc_failure',
  });
  if (opts.status) qs.append('status[]', opts.status);
  const headers: Record<string, string> = { Accept: 'application/ld+json' };
  if (opts.merchant) headers['x-merch-id'] = opts.merchant;
  const items: CdcTask[] = [];
  let total = 0;
  for (let p = 1; p <= 5; p++) {
    qs.set('page', String(p));
    const res = await page.request.get(`${dataApiUrl}/background_tasks?${qs}`, {
      headers,
      failOnStatusCode: false,
    });
    expect(res.ok(), `GET background_tasks → ${res.status()}`).toBeTruthy();
    const b = (await res.json()) as { member: CdcTask[]; totalItems: number };
    total = b.totalItems;
    items.push(...b.member);
    if (b.member.length < 30) break;
  }
  return { total, items };
}

/** Sync (audit) logs newer than `sinceIso`, newest first, all merchants. */
export async function auditLogsSince(page: Page, sinceIso: string): Promise<AuditLog[]> {
  const out: AuditLog[] = [];
  const since = Date.parse(sinceIso);
  for (let p = 1; p <= 60; p++) {
    const res = await page.request.get(`${dataApiUrl}/audit_log?page=${p}&order[createdAt]=desc`, {
      headers: { Accept: 'application/ld+json' },
      failOnStatusCode: false,
    });
    if (!res.ok()) break;
    const b = (await res.json()) as { member: AuditLog[] };
    let older = false;
    for (const x of b.member) {
      if (Date.parse(x.createdAt) >= since) out.push(x);
      else older = true;
    }
    if (older || b.member.length < 30) break;
  }
  return out;
}

/** Background tasks of a given type for the store, newer than `sinceIso`. */
export async function storeTasksSince(
  page: Page,
  store: string,
  type: string,
  sinceIso: string,
): Promise<CdcTask[]> {
  const qs = new URLSearchParams({ page: '1', 'order[createdAt]': 'desc', 'type[]': type });
  const res = await page.request.get(`${dataApiUrl}/background_tasks?${qs}`, {
    headers: { Accept: 'application/ld+json', 'x-merch-id': store },
    failOnStatusCode: false,
  });
  if (!res.ok()) return [];
  const b = (await res.json()) as { member: CdcTask[] };
  return b.member.filter(
    (t) => Date.parse(t.createdAt) >= Date.parse(sinceIso) && String(t.merchant?.id) === store,
  );
}

export function describeTask(t: CdcTask): string {
  const d = t.data ?? {};
  return `${t.createdAt} | ${t.status} | #${t.merchant?.id} ${t.merchant?.businessName} | ${d.tag} ${d.label} table=${d.table} op=${d.op} | ${(d.error_message ?? '').replace(/\s+/g, ' ').slice(0, 220)}`;
}

export function describeLog(l: AuditLog): string {
  const b = l.requestBody ?? {};
  return `${l.createdAt} | ${l.severity} | #${l.merchant?.id ?? '-'} | ${b.tag ?? ''} ${b.label ?? ''} table=${b.table ?? ''} op=${b.op ?? ''} | ${(l.errorMessage ?? '').replace(/\s+/g, ' ').slice(0, 220)}`;
}

/** Does a CDC task / audit log concern the service↔category FK this ticket is about? */
export function isServiceCategoryIssue(text: string): boolean {
  return /fk_e19d9ad212469de2|23503|table=service\b|table=category\b|service_(update|insert)|category_(update|delete|insert)|catalog\/service|catalog\/category/i.test(
    text,
  );
}
