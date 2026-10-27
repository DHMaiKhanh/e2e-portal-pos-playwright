import { type Page, type Response, expect } from '@playwright/test';
import { test } from '@fixtures/index';
import { env } from '@configs/env/loadEnv';
import { Urls } from '@constants/urls';

/**
 * Shared steps for the Linear bug regression specs (docs/test-cases/regression-bugs-linear.md).
 *
 * The staff specs write to the shared DEV store on purpose (approved "ghi thật rồi hoàn tác"):
 * each one snapshots the staff record through the API first and puts it back in `finally`.
 */

/** A staff record as `GET /staffs/<id>` returns it (only the fields the specs read). */
export interface StaffRecord {
  id: string;
  nickname: string;
  firstName: string | null;
  lastName: string | null;
  staffCode: number;
  status: 'active' | 'inactive';
  isAllowBooking: boolean;
  role: { '@id': string; id: string; name: string } | null;
  ssn: string;
  address: string;
  phone: string;
  email: string;
  avatarObjFid: string | null;
  postalCode: string;
  city: string;
  country: string;
  state: string;
  colorHex: string;
}

const STAFF_PATH = /\/staffs\/[0-9a-f-]{20,}$/i;

export const staffApiUrl = (id: string): string => `${env.API_URL}/staffs/${id}`;

/** The body the detail page itself sends on `PUT /staffs/<id>` (role as an IRI). */
export function toPutPayload(s: StaffRecord): Record<string, unknown> {
  return {
    staffCode: s.staffCode,
    status: s.status,
    isAllowBooking: s.isAllowBooking,
    firstName: s.firstName ?? null,
    lastName: s.lastName ?? null,
    nickname: s.nickname,
    role: s.role?.['@id'] ?? null,
    ssn: s.ssn,
    address: s.address,
    phone: s.phone,
    email: s.email,
    avatarObjFid: s.avatarObjFid ?? null,
    postalCode: s.postalCode,
    city: s.city,
    country: s.country,
    state: s.state,
    colorHex: s.colorHex,
  };
}

/** The data API takes the session's `token` cookie as a bearer, like `removeStaffViaApi`. */
async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = (await page.context().cookies()).find((c) => c.name === 'token')?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getStaff(page: Page, id: string): Promise<StaffRecord> {
  const res = await page.request.get(staffApiUrl(id), { headers: await authHeaders(page) });
  expect(res.ok(), `GET /staffs/${id} → ${res.status()}`).toBeTruthy();
  return (await res.json()) as StaffRecord;
}

/** Puts a snapshot back. Used only in `finally` when a spec left the record changed. */
export async function restoreStaff(page: Page, snapshot: StaffRecord): Promise<void> {
  const res = await page.request.put(staffApiUrl(snapshot.id), {
    headers: { ...(await authHeaders(page)), 'Content-Type': 'application/ld+json' },
    data: toPutPayload(snapshot),
  });
  expect(res.ok(), `restore PUT /staffs/${snapshot.id} → ${res.status()}`).toBeTruthy();
}

/** True when the fields a staff write can touch are the same in both records. */
export const sameStaff = (a: StaffRecord, b: StaffRecord): boolean =>
  JSON.stringify(toPutPayload(a)) === JSON.stringify(toPutPayload(b));

export function isStaffWrite(r: Response, id: string): boolean {
  return r.url().endsWith(`/staffs/${id}`) && r.request().method() === 'PUT';
}

async function waitStaffGet(page: Page): Promise<StaffRecord> {
  // The page URL also ends in the staff uuid, so match the data API host, not just the path.
  const res = await page.waitForResponse(
    (r) =>
      r.url().startsWith(env.API_URL) &&
      STAFF_PATH.test(new URL(r.url()).pathname) &&
      r.request().method() === 'GET' &&
      r.ok(),
    { timeout: 30_000 },
  );
  return (await res.json()) as StaffRecord;
}

/** Opens the Staff Members list (Active filter) and waits for real rows. */
export async function openStaffList(page: Page): Promise<void> {
  await page.goto(Urls.STAFFS, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('tbody tr').first()).not.toHaveText('', { timeout: 15_000 });
}

/**
 * Opens the detail page of the `nth` (0-based) listed staff that has a role, and returns its
 * record. Specs that run in parallel pass different `nth` so they never share a staff.
 * Clicking the row itself does not navigate; the nickname text does.
 */
export async function openStaffWithRole(page: Page, nth = 0, maxRows = 15): Promise<StaffRecord> {
  await openStaffList(page);
  const count = Math.min(await page.locator('tbody tr').count(), maxRows);
  let found = 0;
  for (let i = 0; i < count; i++) {
    const row = page.locator('tbody tr').nth(i);
    const nick = (await row.locator('td').first().innerText()).split('\n')[0].trim();
    const loaded = waitStaffGet(page);
    await row.getByText(nick, { exact: true }).first().click();
    const record = await loaded;
    if (record.role && found++ === nth) return record;
    await openStaffList(page);
  }
  expect(true, `fewer than ${nth + 1} of the first ${count} staff have a role`).toBeFalsy();
  throw new Error('unreachable');
}

/** Opens a staff detail page by id and returns the record the page loaded. */
export async function openStaffDetail(page: Page, id: string): Promise<StaffRecord> {
  const loaded = waitStaffGet(page);
  await page.goto(`${Urls.STAFFS}/${id}?tab=profile`, { waitUntil: 'domcontentloaded' });
  return loaded;
}

// ---------------------------------------------------------------- import CSV

/** Header row of "Download template" (`staffs-import-template.csv`), byte for byte. */
export const IMPORT_HEADER =
  '﻿STT,"Employee First Name (*)","Employee Last Name (*)","Employee Nickname (*)",' +
  '"Employee Code (*)","Employee Role (*)",SSN,"Employee Phone (*)","Employee Email",Status,' +
  'Address,Country,State,City,"Zip Code","Compensation (*)","Services Active Full",' +
  '"Booking Online Active"';

export interface ImportRow {
  firstName: string;
  lastName: string;
  nickname: string;
  code: string | number;
  role: string;
  phone: string;
  email?: string;
}

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function importCsv(rows: ImportRow[]): string {
  const lines = rows.map((r, i) =>
    [
      i + 1,
      r.firstName,
      r.lastName,
      r.nickname,
      r.code,
      r.role,
      '',
      r.phone,
      r.email ?? '',
      'active',
      '',
      '',
      '',
      '',
      '',
      'commission',
      1,
      1,
    ]
      .map(csvCell)
      .join(','),
  );
  return `${IMPORT_HEADER}\n${lines.join('\n')}\n`;
}

/** A valid US phone in the template's E.164 form. Anything without `+1` is refused as a format. */
export const VALID_PHONE = '+14155550115';

/** Searches the list by staff code and returns the matching row count (exact Code cell). */
export async function rowsWithCode(page: Page, code: string | number): Promise<number> {
  await openStaffList(page);
  await page.getByPlaceholder(/search name, code, phone/i).fill(String(code));
  // Settled once every visible row matches the search; a search with no hit leaves only the
  // (hidden) empty-state row, so "no visible row" counts as settled too.
  await expect
    .poll(
      async () =>
        (await page.locator('tbody tr:visible').allInnerTexts()).every((t) =>
          t.includes(String(code)),
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
  return page
    .locator('tbody tr')
    .filter({ has: page.getByRole('cell', { name: String(code), exact: true }) })
    .count();
}

/** A 4-digit code no current staff uses. */
export async function unusedStaffCode(page: Page): Promise<number> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = 9000 + Math.floor(Math.random() * 1000);
    if ((await rowsWithCode(page, code)) === 0) return code;
  }
  throw new Error('could not find an unused 4-digit staff code');
}
