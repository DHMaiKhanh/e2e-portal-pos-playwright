import { type Page, expect } from '@playwright/test';
import { env } from '@configs/env/loadEnv';
import { dataApiUrl } from '@pages/customers/CustomerGroupsPage';

/** A merchant sys setting flag as `GET /sys_settings?key=<key>` returns it. */
export interface SysSetting<V = unknown> {
  id: string;
  key: string;
  value: V;
  updatedAt: string;
  config?: { default_value?: unknown };
}

/**
 * Reads the store's own copy of a sys setting flag through the page's cookies (read-only).
 * Load any Portal page first so the access-token cookie is fresh.
 */
export async function readSysSetting<V>(page: Page, key: string): Promise<SysSetting<V>> {
  const res = await page.request.get(`${dataApiUrl}/sys_settings?key=${encodeURIComponent(key)}`, {
    headers: { 'x-merch-id': env.STORE_ID, Accept: 'application/ld+json' },
    failOnStatusCode: false,
  });
  expect(res.ok(), `GET /sys_settings?key=${key} → ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { member?: SysSetting<V>[] };
  const flag = body.member?.find((s) => s.key === key);
  expect(flag, `sys setting "${key}" of store ${env.STORE_ID}`).toBeTruthy();
  return flag as SysSetting<V>;
}
