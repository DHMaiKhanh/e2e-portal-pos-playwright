import { type Locator, type Page, type Request, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { env } from '@configs/env/loadEnv';
import { posAdminBase } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/* ------------------------------------------------------------------------- *
 * Report Configuration V4 (Internal) — `/pos/<seg>/admin/report-config-v4/*`
 * Scanned 2026-10-20 against Linear VP-4756 and its QC bugs VP-4830…4847.
 *
 *  - Tabs Reports / Pages / Blocks / Fields; Scope `System (all merchants)` or
 *    `By merchant` (`?scope=resolved&merchant=<id>`); merchant pickers are
 *    buttons named "Filter by merchant" opening `role=option` "<Name> #<id>".
 *  - Row menu `Actions for <name>` → Copy for merchant… / Deactivate / Delete….
 *  - Running a query is a POST but not a write: `/v4/report_queries/<slug>/run`
 *    (block Try query) and `/v4/report_runs` (Fields / report preview).
 *
 * Every spec using this page object calls {@link RcV4Page.guardWrites} first:
 * any other non-GET request to the report API is intercepted (aborted, or
 * answered with a canned response) so the shared DEV configuration is never
 * changed, while the request body is captured for assertions.
 * ------------------------------------------------------------------------- */

export type RcV4Tab = 'reports' | 'pages' | 'blocks' | 'fields';

export interface RcV4Write {
  method: string;
  url: string;
  body: Record<string, unknown> | null;
}

/** A canned answer for an intercepted write (instead of aborting it). */
export interface WriteStub {
  method: string;
  url: RegExp;
  status: number;
  body: unknown;
}

const READ_ONLY_POST = /\/v4\/(report_queries\/[^/]+\/run|report_runs)(?:\?|$)/;

/** Envelope / metadata keys of a query response — never real dataset columns (VP-4832/4833). */
export const RCV4_META_COLUMNS = [
  'member',
  'columns',
  'rows',
  'currency',
  'currencyCode',
  'row_count',
  'rowCount',
  'reportRowCount',
  'group_count',
  'groupCount',
  'totalItems',
];
export const RCV4_META_LABELS =
  /^(Member|Columns|Rows|Currency|Row Count|Group Count|Total Items|Report Row Count)$/;

export class RcV4Page extends BasePage {
  protected readonly path = `${posAdminBase}/report-config-v4/pages`;

  readonly main: Locator;
  readonly writes: RcV4Write[] = [];
  private stubs: WriteStub[] = [];

  constructor(page: Page) {
    super(page);
    this.main = page.locator('#pos-main');
  }

  tabUrl(tab: RcV4Tab, query = ''): string {
    return `${posAdminBase}/report-config-v4/${tab}${query}`;
  }

  // ---- safety ----------------------------------------------------------------

  /** Intercept every write to the report API; queries/previews pass through. */
  async guardWrites(): Promise<void> {
    await this.page.route(`${env.API_URL}/v4/**`, async (route) => {
      const req = route.request();
      if (req.method() === 'GET' || (req.method() === 'POST' && READ_ONLY_POST.test(req.url()))) {
        return route.continue();
      }
      this.writes.push({ method: req.method(), url: req.url(), body: parseBody(req) });
      const stub = this.stubs.find((s) => s.method === req.method() && s.url.test(req.url()));
      if (stub) {
        return route.fulfill({
          status: stub.status,
          contentType: 'application/json',
          body: JSON.stringify(stub.body),
        });
      }
      return route.abort('blockedbyclient');
    });
  }

  /** Answer the next matching write with a canned response instead of aborting it. */
  stubWrite(stub: WriteStub): void {
    this.stubs.push(stub);
  }

  writesTo(method: string, url: RegExp): RcV4Write[] {
    return this.writes.filter((w) => w.method === method && url.test(w.url));
  }

  // ---- navigation --------------------------------------------------------------

  async open(tab: RcV4Tab, query = ''): Promise<void> {
    await this.page.goto(this.tabUrl(tab, query));
    await this.waitForReady(tab);
  }

  async waitForReady(tab?: RcV4Tab): Promise<void> {
    if (tab === 'fields') {
      await expect(this.main.getByRole('button', { name: 'Save as report' })).toBeVisible({
        timeout: 45_000,
      });
    } else {
      await expect(this.main.locator('tbody tr').first()).toBeVisible({ timeout: 45_000 });
    }
  }

  /** Open the detail of a row by its exact name. */
  async openRow(tab: Exclude<RcV4Tab, 'fields'>, name: string, query = ''): Promise<void> {
    await this.open(tab, query);
    await this.main.getByRole('cell', { name, exact: true }).first().click();
    await this.page.waitForURL(new RegExp(`/report-config-v4/${tab}/[0-9a-f-]{36}`), {
      timeout: Timeouts.LONG,
    });
  }

  rowActions(name: string): Locator {
    return this.main.getByRole('button', { name: `Actions for ${name}`, exact: true });
  }

  async rowMenu(name: string, item: RegExp): Promise<void> {
    await this.rowActions(name).click();
    await this.page.getByRole('menuitem', { name: item }).click();
  }

  /** Pick a merchant in any "Filter by merchant" picker inside `scope` (page or dialog). */
  async pickMerchant(id: string, scope: Locator = this.main): Promise<void> {
    await scope.getByRole('button', { name: 'Filter by merchant' }).first().click();
    await this.page.getByRole('option', { name: new RegExp(`#${id}$`) }).click();
  }

  async setScope(scope: 'System (all merchants)' | 'By merchant'): Promise<void> {
    await this.main.getByRole('button', { name: /^Scope/ }).click();
    await this.page.getByText(scope, { exact: true }).last().click();
  }

  /** True while the page is click-locked (`body { pointer-events: none }` left by a closed dialog). */
  async isFrozen(): Promise<boolean> {
    return this.page.evaluate(() => getComputedStyle(document.body).pointerEvents === 'none');
  }

  get dialog(): Locator {
    return this.page
      .locator('[role="dialog"], [role="alertdialog"]')
      .filter({ visible: true })
      .last();
  }

  toastText(): Locator {
    return this.page
      .locator('[data-sonner-toast], [role="status"], [role="alert"]')
      .filter({ visible: true });
  }

  // ---- Fields ----------------------------------------------------------------

  async fieldsDataSource(name: string): Promise<void> {
    await this.main.getByRole('combobox').first().click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  /** Field checkboxes listed under Values / Group by, as their visible labels. */
  async fieldLabels(section: 'Group by' | 'Values'): Promise<string[]> {
    return this.main.evaluate((m, sec) => {
      const text = (m as HTMLElement).innerText;
      const start = text.indexOf(`\n${sec}\n`);
      const end =
        sec === 'Group by'
          ? text.indexOf('\nValues\n', start)
          : text.indexOf('\nShow technical fields', start);
      return text
        .slice(start, end > start ? end : undefined)
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !/selected$|^Group by$|^Values$|^Find a field$/.test(l));
    }, section);
  }
}

function parseBody(req: Request): Record<string, unknown> | null {
  const raw = req.postData();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}
