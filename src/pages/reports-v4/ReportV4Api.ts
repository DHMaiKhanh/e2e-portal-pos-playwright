import { type APIRequestContext, type Page, expect } from '@playwright/test';
import { env } from '@configs/env/loadEnv';

/* ------------------------------------------------------------------------- *
 * Read-only client for the Reports V4 block API on the volt-pos host — the
 * same calls the portal makes (`/v4/report_blocks/<block>/rows`), so data
 * can be reconciled across blocks for many days without driving the UI.
 *
 *  - Amounts are integer CENTS.
 *  - Collection blocks page at most 100 rows: {@link rowsAll} walks pages.
 *  - Summary blocks answer `{ data: { … } }`.
 *  - Auth is the browser session cookie; the short-lived access token is only
 *    refreshed by the SPA, so {@link ready} loads the app once first.
 * ------------------------------------------------------------------------- */

export type Row = Record<string, unknown>;

export class ReportV4Api {
  private readonly request: APIRequestContext;

  constructor(private readonly page: Page) {
    this.request = page.request;
  }

  /** Load the portal once so the access-token cookie is fresh. */
  async ready(merchant = env.STORE_ID): Promise<void> {
    await this.page.goto(`/pos/${env.POS_SEGMENT}/${merchant}/v4/reports/daily-sale-report`);
    await expect(this.page.locator('h1[data-slot="pos-page-heading"]')).toBeVisible({
      timeout: 45_000,
    });
  }

  private async get(
    block: string,
    merchant: string,
    query: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const qs = new URLSearchParams(query).toString();
    const res = await this.request.get(`${env.API_URL}/v4/report_blocks/${block}/rows?${qs}`, {
      headers: { 'x-merch-id': merchant },
      failOnStatusCode: false,
    });
    expect(res.status(), `${block} ${qs} → ${res.status()}`).toBe(200);
    return (await res.json()) as Record<string, unknown>;
  }

  /** Every row of a collection block for a date range (walks the 100-row pages). */
  async rowsAll(
    block: string,
    merchant: string,
    after: string,
    before = after,
    extra: Record<string, string> = {},
  ): Promise<Row[]> {
    const all: Row[] = [];
    for (let page = 1; page < 200; page++) {
      const body = await this.get(block, merchant, {
        after,
        before,
        page: String(page),
        itemsPerPage: '100',
        ...extra,
      });
      const member = (body.member as Row[] | undefined) ?? [];
      all.push(...member);
      const total = Number(body.totalItems ?? all.length);
      if (member.length === 0 || all.length >= total) break;
    }
    return all;
  }

  /** `data` of a summary block. */
  async summary(
    block: string,
    merchant: string,
    after: string,
    before = after,
    extra: Record<string, string> = {},
  ): Promise<Row> {
    const body = await this.get(block, merchant, { after, before, ...extra });
    return (body.data as Row | undefined) ?? (body.member as Row[] | undefined)?.[0] ?? {};
  }

  static sum(rows: Row[], key: string): number {
    return rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
  }
}

/** Cents → "$1,234.56" for readable assertion messages. */
export function usd(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
