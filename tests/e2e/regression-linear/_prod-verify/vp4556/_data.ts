import { expect, type Page } from '@playwright/test';
import { env } from '@configs/env/loadEnv';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';
import { PREFIX } from './_shared';

export interface Category {
  '@id': string;
  id: string;
  name: string;
  status: string;
  colorHex: string | null;
  type: string;
  updatedAt: string;
}

export interface Service {
  '@id': string;
  id: string;
  name: string;
  status: string;
  price: number;
  description: string | null;
  durationHours: number | null;
  durationMinutes: number | null;
  supplyFee: number;
  flexiblePricing?: boolean | null;
  showOnGoCheckin?: boolean | null;
  showOnWebBooking?: boolean | null;
  showOnGoPos?: boolean | null;
  category: Category | null;
  updatedAt: string;
}

const headers = (): Record<string, string> => ({
  'x-merch-id': env.STORE_ID,
  Accept: 'application/ld+json',
  'Content-Type': 'application/ld+json',
});

function guardStore(): void {
  expect(env.STORE_ID, 'PROD safety: only store #20258').toBe('20258');
}

export async function getCategory(page: Page, id: string): Promise<Category> {
  const res = await page.request.get(`${dataApiUrl}/categories/${id}`, {
    headers: headers(),
    failOnStatusCode: false,
  });
  expect(res.ok(), `GET /categories/${id} → ${res.status()}`).toBeTruthy();
  return (await res.json()) as Category;
}

export async function getService(page: Page, id: string): Promise<Service> {
  const res = await page.request.get(`${dataApiUrl}/services/${id}`, {
    headers: headers(),
    failOnStatusCode: false,
  });
  expect(res.ok(), `GET /services/${id} → ${res.status()}`).toBeTruthy();
  return (await res.json()) as Service;
}

/** Every category of the store in the given statuses (all pages). */
export async function listCategories(page: Page, statuses: string[]): Promise<Category[]> {
  const out: Category[] = [];
  for (let p = 1; p <= 20; p++) {
    const qs = new URLSearchParams({ page: String(p) });
    qs.append('type[]', 'service');
    qs.append('type[]', 'product');
    for (const s of statuses) qs.append('status[]', s);
    const res = await page.request.get(`${dataApiUrl}/categories?${qs}`, {
      headers: headers(),
      failOnStatusCode: false,
    });
    expect(res.ok(), `GET /categories → ${res.status()}`).toBeTruthy();
    const b = (await res.json()) as { member: Category[] };
    out.push(...b.member);
    if (b.member.length < 30) break;
  }
  return out;
}

/** Every service of the store in the given statuses (all pages). */
export async function listServices(page: Page, statuses: string[]): Promise<Service[]> {
  const out: Service[] = [];
  for (let p = 1; p <= 40; p++) {
    const qs = new URLSearchParams({ page: String(p) });
    for (const s of statuses) qs.append('status[]', s);
    const res = await page.request.get(`${dataApiUrl}/services?${qs}`, {
      headers: headers(),
      failOnStatusCode: false,
    });
    expect(res.ok(), `GET /services → ${res.status()}`).toBeTruthy();
    const b = (await res.json()) as { member: Service[] };
    out.push(...b.member);
    if (b.member.length < 30) break;
  }
  return out;
}

/**
 * Soft-delete a category the way the POS does: PUT /categories/{id} with status "deleted"
 * (the Portal's own API client defines this write: {name, status: active|inactive|deleted, colorHex}).
 * Refuses anything that is not one of ours.
 */
export async function deleteCategory(
  page: Page,
  id: string,
): Promise<{ status: number; body: Category }> {
  guardStore();
  const c = await getCategory(page, id);
  expect(
    c.name.startsWith(PREFIX),
    `refusing to delete non-test category "${c.name}"`,
  ).toBeTruthy();
  const res = await page.request.put(`${dataApiUrl}/categories/${id}`, {
    headers: headers(),
    data: { name: c.name, status: 'deleted', colorHex: c.colorHex },
    failOnStatusCode: false,
  });
  const body = (await res.json().catch(() => ({}))) as Category;
  return { status: res.status(), body };
}

/** Soft-delete a service (PUT /services/{id} status "deleted"), keeping every other field as stored. */
export async function deleteService(
  page: Page,
  id: string,
): Promise<{ status: number; body: Service }> {
  guardStore();
  const s = await getService(page, id);
  expect(s.name.startsWith(PREFIX), `refusing to delete non-test service "${s.name}"`).toBeTruthy();
  const data: Record<string, unknown> = {
    name: s.name,
    status: 'deleted',
    price: s.price,
    category: s.category?.['@id'] ?? null,
    description: s.description,
    durationHours: s.durationHours,
    durationMinutes: s.durationMinutes,
    supplyFee: s.supplyFee,
  };
  for (const k of [
    'flexiblePricing',
    'showOnGoCheckin',
    'showOnWebBooking',
    'showOnGoPos',
  ] as const) {
    if (s[k] !== undefined) data[k] = s[k];
  }
  const res = await page.request.put(`${dataApiUrl}/services/${id}`, {
    headers: headers(),
    data,
    failOnStatusCode: false,
  });
  const body = (await res.json().catch(() => ({}))) as Service;
  return { status: res.status(), body };
}

/** Prefix leftovers that are still visible to the store (active or inactive). */
export async function leftovers(
  page: Page,
): Promise<{ categories: Category[]; services: Service[] }> {
  const categories = (await listCategories(page, ['active', 'inactive'])).filter((c) =>
    c.name.startsWith(PREFIX),
  );
  const services = (await listServices(page, ['active', 'inactive'])).filter((s) =>
    s.name.startsWith(PREFIX),
  );
  return { categories, services };
}
