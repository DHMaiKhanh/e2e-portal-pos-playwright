import type { Locator, Page } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import type { OrderDetailPage, OrderSummary, ServiceGroup } from '@pages/orders/OrderDetailPage';
import { EDITABLE_STATUSES } from './helpers';

/**
 * Helpers for the cases that really save an order on DEV (`Confirm update`) and then put it back.
 *
 * Every mutating test follows the same shape:
 *   const snap = await openMutableOrder(orderDetailPage, slot);
 *   try { …edit, save, assert… } finally { await restoreOrder(orderDetailPage, snap); }
 *
 * `slot` picks a different matching order per spec file, so the two files running in parallel
 * never edit the same order. Inside a file the mutating tests run one after another
 * (`test.describe.configure({ mode: 'default' })`).
 */

/** Appended to renamed services / notes so a cleanup can always strip it again. */
export const MARK = ' ·E2E';

/** Label of the store-sold group on Service details (same rule as `OrderDetailPage.storeGroup`). */
const STORE_GROUP = /^(store|no staff|unassigned|—)$/i;

export interface OrderSnapshot {
  url: string;
  orderNo: string;
  note: string;
  groups: ServiceGroup[];
  tips: Record<string, number>;
  summary: OrderSummary;
  payments: number;
}

export async function snapshotOrder(odp: OrderDetailPage): Promise<OrderSnapshot> {
  return {
    url: odp.page.url(),
    orderNo: (await odp.heading.innerText()).match(/OD[\d-]+/)?.[0] ?? '',
    note: await odp.readOrderNote(),
    groups: await odp.readServiceGroups(),
    tips: await odp.readTipBreakdown(),
    summary: await odp.readOrderSummary(),
    payments: await odp.readPaymentCount(),
  };
}

/**
 * Opens an editable order with a tip, 2+ staff and one staff owning 2+ services (so a service can
 * be moved without emptying a group). `slot` = how many matching orders to skip.
 */
export async function openMutableOrder(odp: OrderDetailPage, slot: number): Promise<OrderSnapshot> {
  let opened = false;
  for (const status of EDITABLE_STATUSES) {
    if (
      await odp.openOrderWithStatus(status, {
        withTip: true,
        staffCount: 2,
        withMultiServiceStaff: true,
        skipMatches: slot,
        maxCandidates: 20,
      })
    ) {
      opened = true;
      break;
    }
  }
  expect(!opened, `no DEV editable order with a tip and 2+ staff (slot ${slot})`).toBeFalsy();
  const snap = await snapshotOrder(odp);
  expect(
    !snap.groups.some((g) => g.services.length >= 2),
    'order has no staff with 2+ services to move',
  ).toBeFalsy();
  test.info().annotations.push({ type: 'order', description: `${snap.orderNo} ${snap.url}` });
  return snap;
}

/** Staff that owns the most services, and another staff of the order. */
export function pickMove(snap: OrderSnapshot): { from: string; to: string; service: string } {
  // The Store group (store-sold lines) is listed like a staff but is not a staff: it is not in
  // the dialog and cannot be a "Move to…" target.
  const staffGroups = snap.groups.filter((g) => !STORE_GROUP.test(g.staff));
  const from = [...staffGroups].sort((a, b) => b.services.length - a.services.length)[0];
  const to = staffGroups.find((g) => g.staff !== from.staff) as ServiceGroup;
  // Some specs rename the dialog's first service (MARK) before moving, so avoid moving a line
  // with that name — after the rename it is no longer found under `from`.
  const renamed = staffGroups[0]?.services[0]?.name;
  const movable = from.services.filter((s) => s.name !== renamed);
  const pool = movable.length ? movable : from.services;
  // Prefer a priced service: moving a $0.00 line moves no sale/tip/income, which is what the
  // report checks look for.
  const service = pool.find((s) => s.price > 0) ?? pool[0];
  return { from: from.staff, to: to.staff, service: service.name };
}

/** Service names of each staff group as currently shown in the open edit dialog. */
async function dialogGroups(odp: OrderDetailPage): Promise<Map<string, string[]>> {
  const groups = new Map<string, string[]>();
  for (const staff of await odp.staffNames()) {
    groups.set(
      staff,
      await odp
        .groupByStaff(staff)
        .getByRole('textbox', { name: 'Service name' })
        .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value)),
    );
  }
  return groups;
}

/** In the open dialog: moves the service called `service` from staff `from` to staff `to`. */
export async function moveService(
  odp: OrderDetailPage,
  service: string,
  from: string,
  to: string,
): Promise<void> {
  const names = (await dialogGroups(odp)).get(from) ?? [];
  const index = names.indexOf(service);
  expect(index, `"${service}" under ${from}`).toBeGreaterThanOrEqual(0);
  await odp.groupByStaff(from).getByRole('checkbox', { name: 'Select service' }).nth(index).check();
  await odp.moveSelectedTo(to);
}

/**
 * Puts the order back as `snap`: strips MARK from service names, moves services back to their
 * original staff, restores the order note, then the exact tip split. Best effort — it never
 * throws, so it cannot hide the real test failure.
 */
export async function restoreOrder(odp: OrderDetailPage, snap: OrderSnapshot): Promise<void> {
  try {
    await odp.page.unrouteAll({ behavior: 'ignoreErrors' });
    await odp.page.goto(snap.url);
    await odp.waitForReady();
    await odp.openEditServiceDialog();

    const inputs = odp.serviceNameInputs;
    for (let i = 0; i < (await inputs.count()); i++) {
      const value = await inputs.nth(i).inputValue();
      if (value.includes(MARK)) await inputs.nth(i).fill(value.split(MARK)[0]);
    }

    // Move each extra service back to a staff that is missing it (multiset diff by name).
    for (let guard = 0; guard < 20; guard++) {
      const current = await dialogGroups(odp);
      let moved = false;
      for (const [staff, names] of current) {
        const expected = [...(snap.groups.find((g) => g.staff === staff)?.services ?? [])].map(
          (s) => s.name,
        );
        const extra = names.find((n) => {
          const i = expected.indexOf(n);
          if (i < 0) return true;
          expected.splice(i, 1);
          return false;
        });
        if (!extra) continue;
        const target = snap.groups.find((g) => {
          if (STORE_GROUP.test(g.staff)) return false;
          const want = g.services.filter((s) => s.name === extra).length;
          const have = (current.get(g.staff) ?? []).filter((n) => n === extra).length;
          return g.staff !== staff && have < want;
        });
        if (!target) continue;
        await moveService(odp, extra, staff, target.staff);
        moved = true;
        break;
      }
      if (!moved) break;
    }

    if ((await odp.orderNote.inputValue()) !== snap.note) await odp.orderNote.fill(snap.note);
    if (await odp.saveChangesButton.isEnabled()) await odp.saveAndConfirm();
    else await odp.closeEditServiceDialog();

    await odp.restoreTipShares(snap.tips);
  } catch (error) {
    test.info().annotations.push({
      type: 'restore-failed',
      description: `${snap.orderNo}: ${String(error).slice(0, 300)}`,
    });
  }
}

/** Saves an order-note change on the open dialog and returns the note written. */
export async function saveNote(odp: OrderDetailPage, note: string): Promise<void> {
  await odp.orderNote.fill(note);
  const { status } = await odp.saveAndConfirm();
  expect(status).toBeLessThan(300);
}

/** Runs `check`; if it throws, attaches `data()` as JSON to the report, then rethrows. */
export async function attachOnFail(
  name: string,
  data: () => unknown,
  check: () => Promise<unknown>,
): Promise<void> {
  try {
    await check();
  } catch (error) {
    await test.info().attach(`${name}.json`, {
      body: JSON.stringify(data(), null, 2),
      contentType: 'application/json',
    });
    throw error;
  }
}

/** Error feedback after a failed save (toast / alert). */
export const errorMessage = (page: Page): Locator =>
  page
    .getByRole('alert')
    .filter({ hasText: /\S/ })
    .or(page.getByText(/error|failed|could not|couldn't|try again|lỗi/i))
    .first();

/** Unique note text for one test step. */
export const noteFor = (id: string): string => `E2E ${id} ${Date.now()}${MARK}`;

// ---------------------------------------------------------------- reports

/** `/pos/nail/<store>` part of an order URL. */
export const storeBase = (orderUrl: string): string =>
  new URL(orderUrl).pathname.replace(/\/orders\/.*$/, '');

export interface StaffIncomeRow {
  orders: number;
  subtotal: number;
  supplyFee: number;
  tip: number;
  income: number;
}

const money = (s: string): number => Number(s.replace(/[$,\s]/g, '')) || 0;

/** `?after=<day>&before=<day>` — the report pages take their date range from the URL. */
const dayQuery = (day?: string): string => (day ? `?after=${day}&before=${day}` : '');

/**
 * Staff Income report for `day` (`YYYY-MM-DD`, store time zone; default "Today"): staff name
 * (and "Total") → row.
 */
export async function readStaffIncome(
  odp: OrderDetailPage,
  base: string,
  day?: string,
): Promise<Record<string, StaffIncomeRow>> {
  const page = odp.page;
  await page.goto(`${base}/report-pages/staff-income${dayQuery(day)}`);
  const rows = page.getByRole('row');
  await expect(rows.filter({ hasText: /^\s*Total/ }).first()).toBeVisible({ timeout: 30_000 });
  const out: Record<string, StaffIncomeRow> = {};
  for (const cells of await rows.evaluateAll((trs) =>
    trs.map((tr) => [...tr.querySelectorAll('td,th')].map((c) => (c.textContent ?? '').trim())),
  )) {
    if (cells.length < 6 || cells[0] === 'Staff') continue;
    out[cells[0]] = {
      orders: Number(cells[1]) || 0,
      subtotal: money(cells[2]),
      supplyFee: money(cells[3]),
      tip: money(cells[4]),
      income: money(cells[5]),
    };
  }
  return out;
}

/**
 * After `service` moved from staff `from` to `to`: waits for Staff Income to move its subtotal,
 * then checks that tip and income moved with it. Attaches the before/after rows to the report
 * when a check fails.
 */
export async function expectStaffIncomeMoved(
  odp: OrderDetailPage,
  base: string,
  before: Record<string, StaffIncomeRow>,
  move: { from: string; to: string; service: string },
  day?: string,
): Promise<void> {
  const { from, to, service } = move;
  let after = before;
  await attachOnFail(
    'staff-income',
    () => ({ ...move, before, after }),
    async () => {
      await expect
        .poll(
          async () => {
            after = await readStaffIncome(odp, base, day);
            const out = before[from].subtotal - after[from].subtotal;
            const inn = after[to].subtotal - before[to].subtotal;
            return out > 0 && Math.abs(out - inn) < 0.005;
          },
          {
            timeout: 120_000,
            intervals: [5_000, 10_000],
            message: `Staff Income chưa chuyển subtotal của "${service}" từ ${from} sang ${to}`,
          },
        )
        .toBe(true);
      // Store-wide totals are not compared: other orders keep landing on the shared DEV store.
      expect(after[to].tip, `Tip của ${to} (staff mới) phải tăng`).toBeGreaterThan(before[to].tip);
      expect(after[from].tip, `Tip của ${from} (staff cũ) phải giảm`).toBeLessThan(
        before[from].tip,
      );
      expect(after[to].income, `Income của ${to} (staff mới) phải tăng`).toBeGreaterThan(
        before[to].income,
      );
      expect(after[from].income, `Income của ${from} (staff cũ) phải giảm`).toBeLessThan(
        before[from].income,
      );
    },
  );
}

/**
 * Daily Sale Report row of an order for `day` (default "Today"): Sale / Tax / Tip / Total, or
 * null when absent.
 */
export async function readDailySaleRow(
  odp: OrderDetailPage,
  base: string,
  orderNo: string,
  day?: string,
): Promise<{ sale: number; tax: number; tip: number; total: number } | null> {
  const page = odp.page;
  await page.goto(`${base}/report-pages/daily-sale-report${dayQuery(day)}`);
  await expect(page.getByText('Order Details')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 30_000 });
  const row = page.getByRole('row').filter({ hasText: orderNo }).first();
  // The table can first paint the default ("Today") rows before the URL's date range is
  // fetched, so give the order's row a moment to appear before calling it absent.
  if (day) await row.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
  if ((await row.count()) === 0) return null;
  const cells = (await row.locator('td,th').allInnerTexts()).map((c) => c.trim());
  return {
    sale: money(cells[1]),
    tax: money(cells[2]),
    tip: money(cells[3]),
    total: money(cells[4]),
  };
}

/**
 * The open order's date in the store's time zone as `YYYY-MM-DD` — the day to open the reports
 * on (`?after=<day>&before=<day>`), so report checks no longer need an order placed "today".
 */
export async function orderReportDay(odp: OrderDetailPage): Promise<string> {
  const text = await odp.page.locator('body').innerText();
  const dates = [
    ...text.matchAll(/([A-Z][a-z]{2} \d{1,2}, \d{4}), [\d:]+ [AP]M \(UTC([+-]\d+)\)/g),
  ];
  // Order date is the first date on the page: viewer's zone first, then the store's zone.
  const store = dates[1] ?? dates[0];
  expect(store, 'could not read the order date (UTC±N) on the order page').toBeTruthy();
  const d = new Date(`${(store as RegExpMatchArray)[1]} 00:00:00 UTC`);
  return d.toISOString().slice(0, 10);
}

/** Back to the order after visiting a report. */
export async function backToOrder(odp: OrderDetailPage, snap: OrderSnapshot): Promise<void> {
  await odp.page.goto(snap.url);
  await odp.waitForReady();
}

// ---------------------------------------------------------------- activity log

/**
 * Finds the newest activity-log entry whose change line matches `change` (e.g. /^Note .* → E2E/).
 * Entries render as: <time> / <Order|Item|Tip…> / <Server|App> / <change>. The author's name is
 * printed once per run of consecutive entries by the same person, so it is not per entry.
 */
export async function findLogEntry(
  odp: OrderDetailPage,
  change: RegExp,
): Promise<{ time: string; kind: string; change: string } | null> {
  const lines = (await odp.readActivityLog()).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!change.test(lines[i])) continue;
    return {
      time: lines.slice(Math.max(0, i - 4), i).find((l) => /\d{2}:\d{2}:\d{2} [AP]M/.test(l)) ?? '',
      kind: lines[i - 2] ?? '',
      change: lines[i],
    };
  }
  return null;
}

/** Reloads until the activity log (loaded after the page) has an entry matching `change`. */
export async function expectLogEntry(odp: OrderDetailPage, change: RegExp): Promise<void> {
  await expect
    .poll(
      async () => {
        await odp.reload();
        return (await findLogEntry(odp, change)) !== null;
      },
      { timeout: 90_000, intervals: [1_000, 5_000] },
    )
    .toBe(true);
}

/** Name of the signed-in user, read from the sidebar (the line above their e-mail). */
export async function currentUserName(odp: OrderDetailPage): Promise<string> {
  const lines = (await odp.page.locator('body').innerText()).split('\n').map((l) => l.trim());
  const i = lines.findIndex((l) => /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(l));
  return i > 0 ? lines[i - 1] : '';
}
