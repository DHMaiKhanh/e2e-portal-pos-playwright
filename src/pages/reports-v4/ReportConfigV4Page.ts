import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { env } from '@configs/env/loadEnv';
import { posAdminBase } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/* ------------------------------------------------------------------------- *
 * Report Configuration V4 › Pages — only what the Reports V4 write tests need
 * (probed 2026-10-20, docs/test-cases/report-config-v4.md).
 *
 *  - Scope "By merchant" + merchant → `New page` creates a page with
 *    `Who sees it: This merchant` (POST /v4/report_pages {scope:"merchant"}),
 *    then lands on the builder `/report-config-v4/pages/<uuid>?merchant=<id>`.
 *  - A new page starts as `Draft` with one empty `Stack`. Select it, then
 *    `Add <block> to the selected container`.
 *  - `Save draft` → PATCH /v4/report_pages/<uuid>; `Publish` → POST …/publish
 *    and `More actions › Deactivate` act at once, WITHOUT a confirmation.
 *    `Delete…` opens a confirm dialog → DELETE /v4/report_pages/<uuid> (204).
 *  - An inactive page is hidden from the "What this merchant sees" list, so
 *    cleanup goes through the builder URL by id.
 * ------------------------------------------------------------------------- */

const API_PAGES = /\/v4\/report_pages(?:\/|$)/;

export class ReportConfigV4Page extends BasePage {
  protected readonly path = `${posAdminBase}/report-config-v4/pages`;

  readonly newPageButton: Locator;
  readonly saveDraftButton: Locator;
  readonly publishButton: Locator;
  readonly moreActionsButton: Locator;
  readonly header: Locator;

  constructor(page: Page) {
    super(page);
    const main = page.locator('#pos-main');
    this.newPageButton = main.getByRole('button', { name: 'New page' });
    this.saveDraftButton = main.getByRole('button', { name: 'Save draft' });
    this.publishButton = main.getByRole('button', { name: 'Publish' });
    this.moreActionsButton = main.getByRole('button', { name: 'More actions' });
    this.header = main.locator('[data-slot="pos-page-header"]').first();
  }

  builderUrl(id: string, merchant = env.STORE_ID): string {
    return `${this.path}/${id}?merchant=${merchant}`;
  }

  /** Create a merchant-scoped page and return its uuid (lands on the builder). */
  async createMerchantPage(name: string, key: string, merchant = env.STORE_ID): Promise<string> {
    await this.page.goto(`${this.path}?scope=resolved&page=1&merchant=${merchant}`);
    await expect(this.newPageButton).toBeVisible({ timeout: 45_000 });
    await this.newPageButton.click();
    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByRole('combobox').first()).toHaveText('This merchant');
    await dialog.locator('input[name="name"]').fill(name);
    await dialog.locator('input[name="slug"]').fill(key);
    const [res] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.request().method() === 'POST' && /\/v4\/report_pages$/.test(r.url()),
      ),
      dialog.getByRole('button', { name: 'Create page' }).click(),
    ]);
    expect(res.status(), 'create page').toBe(201);
    expect(JSON.parse(res.request().postData() ?? '{}').scope).toBe('merchant');
    await this.page.waitForURL(/\/report-config-v4\/pages\/[0-9a-f-]{36}/, {
      timeout: Timeouts.LONG,
    });
    const id = /\/pages\/([0-9a-f-]{36})/.exec(this.page.url())![1];
    await expect(this.saveDraftButton).toBeVisible({ timeout: Timeouts.LONG });
    return id;
  }

  async openBuilder(id: string, merchant = env.STORE_ID): Promise<void> {
    await this.page.goto(this.builderUrl(id, merchant));
    await expect(this.moreActionsButton).toBeVisible({ timeout: 45_000 });
  }

  /** Select the first Stack and add a block from the palette by its display name. */
  async addBlockToStack(blockName: string): Promise<void> {
    await this.page
      .locator('#pos-main')
      .getByRole('button', { name: 'Stack', exact: true })
      .first()
      .click();
    await this.page
      .getByRole('button', { name: `Add ${blockName} to the selected container` })
      .click();
    await expect(
      this.page
        .getByRole('region', { name: 'Page canvas' })
        .getByText(blockName, { exact: true })
        .first(),
    ).toBeVisible();
  }

  async saveDraft(): Promise<void> {
    await this.writeAndWait('PATCH', () => this.saveDraftButton.click());
  }

  /** Page details › Name ("The page heading in Reports") → Save changes. */
  async renamePage(name: string): Promise<void> {
    await this.page.locator('#pos-main').getByRole('button', { name: 'Page details' }).click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Edit page' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Name', { exact: true }).fill(name);
    await this.writeAndWait(null, () =>
      dialog.getByRole('button', { name: 'Save changes' }).click(),
    );
    await expect(dialog).toBeHidden();
    await this.unfreeze();
  }

  /**
   * Publish and return the new `Published vN`. Today it fires immediately (VP-4845); once a
   * confirmation dialog exists, its confirm button is clicked too.
   */
  async publish(): Promise<number> {
    await this.writeAndWait(
      'POST',
      async () => {
        await this.publishButton.click();
        const confirm = this.page
          .getByRole('alertdialog')
          .or(this.page.getByRole('dialog'))
          .filter({ hasText: /publish/i });
        if (
          await confirm
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          await confirm
            .first()
            .getByRole('button', { name: /^Publish|^Confirm/ })
            .last()
            .click();
        }
      },
      /\/publish$/,
    );
    await expect(this.header).toContainText(/Published v\d+/, { timeout: Timeouts.MEDIUM });
    return Number(/Published v(\d+)/.exec(await this.header.innerText())![1]);
  }

  /** Reload when a closed dialog left the page click-locked (`body { pointer-events: none }`). */
  async unfreeze(): Promise<boolean> {
    const frozen = await this.page.evaluate(
      () => getComputedStyle(document.body).pointerEvents === 'none',
    );
    if (frozen) {
      await this.page.reload();
      await expect(this.saveDraftButton.or(this.newPageButton).first()).toBeVisible({
        timeout: 45_000,
      });
    }
    return frozen;
  }

  /** Page filters › Blank filter → Control "Report date" (keeps the control's default options). */
  async addReportDateFilter(name = 'date'): Promise<void> {
    await this.page.getByRole('button', { name: 'Page filters' }).click();
    const panel = this.page.getByRole('dialog').filter({ hasText: 'Page filters' }).last();
    await panel.getByRole('button', { name: 'Filter', exact: true }).click();
    await this.page.getByRole('menuitem', { name: /Blank filter/ }).click();
    await panel.getByRole('combobox', { name: 'Control' }).last().click();
    await this.page.getByRole('option', { name: 'Report date', exact: true }).click();
    await panel.getByLabel('Filter name').last().fill(name);
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).toBeHidden();
    await this.unfreeze(); // VP-4756 regression: closing this dialog can leave the page locked
  }

  async deactivate(): Promise<void> {
    await this.moreActionsButton.click();
    await this.writeAndWait(null, () =>
      this.page.getByRole('menuitem', { name: 'Deactivate' }).click(),
    );
  }

  /**
   * Delete the page by id through its builder, then confirm through the API that it is gone.
   * No-op when the page no longer exists.
   */
  async deleteById(id: string, merchant = env.STORE_ID): Promise<void> {
    if (!(await this.existsById(id, merchant))) return;
    await this.page.goto(this.builderUrl(id, merchant));
    // NB: `isVisible({ timeout })` does not wait — a real wait is needed on this slow SPA.
    await expect(this.moreActionsButton).toBeVisible({ timeout: 45_000 });
    await this.moreActionsButton.click();
    await this.page.getByRole('menuitem', { name: /^Delete/ }).click();
    const confirm = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog')).first();
    await expect(confirm).toContainText('This cannot be undone');
    // Safety: only ever delete a merchant's own page, never an "all merchants" one.
    await expect(confirm).toContainText("this merchant's page");
    await this.writeAndWait('DELETE', () =>
      confirm.getByRole('button', { name: /^Delete/ }).click(),
    );
    expect(await this.existsById(id, merchant), `page ${id} deleted`).toBe(false);
  }

  /**
   * Remove a merchant's override copy of a shared page ("Revert to default…" — DELETE of the copy
   * only; the shared page is untouched). No-op when it no longer exists.
   */
  async revertMerchantCopy(id: string, merchant = env.STORE_ID): Promise<void> {
    if (!(await this.existsById(id, merchant))) return;
    await this.page.goto(this.builderUrl(id, merchant));
    await expect(this.moreActionsButton).toBeVisible({ timeout: 45_000 });
    await expect(this.header).toContainText('This merchant · overrides default');
    await this.moreActionsButton.click();
    await this.page.getByRole('menuitem', { name: /Revert to default/ }).click();
    const confirm = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog')).first();
    await expect(confirm).toContainText("This merchant's copy");
    await this.writeAndWait('DELETE', () =>
      confirm.getByRole('button', { name: /^Revert/ }).click(),
    );
    expect(await this.existsById(id, merchant), `merchant copy ${id} removed`).toBe(false);
  }

  /** Merchant-scoped pages of this merchant whose key starts with `prefix`. */
  async listMerchantPages(
    prefix: string,
    merchant = env.STORE_ID,
  ): Promise<{ id: string; slug: string }[]> {
    const list = () =>
      this.page.request.get(`${env.API_URL}/v4/report_pages?itemsPerPage=200`, {
        headers: { 'x-merch-id': merchant },
        failOnStatusCode: false,
      });
    let res = await list();
    if (res.status() === 401) {
      // The short-lived access-token cookie is only refreshed by the SPA — load it, then retry.
      await this.page.goto(`${this.path}?scope=resolved&page=1&merchant=${merchant}`);
      await expect(this.newPageButton).toBeVisible({ timeout: 45_000 });
      res = await list();
    }
    expect(res.ok(), `list pages → ${res.status()}`).toBe(true);
    // JSON-LD (`hydra:member` / `member`) or a plain array, depending on the Accept header.
    const body = (await res.json()) as unknown;
    const items = (
      Array.isArray(body)
        ? body
        : (Object.values(body as Record<string, unknown>).find((v) => Array.isArray(v)) ?? [])
    ) as { id: string; slug: string; scope: string }[];
    return items.filter((p) => p.scope === 'merchant' && p.slug?.startsWith(prefix));
  }

  async existsById(id: string, merchant = env.STORE_ID): Promise<boolean> {
    const res = await this.page.request.get(`${env.API_URL}/v4/report_pages/${id}`, {
      headers: { 'x-merch-id': merchant },
      failOnStatusCode: false,
    });
    return res.status() === 200;
  }

  /** Remove leftovers of earlier interrupted runs (only `prefix`-keyed merchant pages). */
  async sweep(prefix: string, merchant = env.STORE_ID, olderThanMs = 15 * 60_000): Promise<void> {
    // Keys end with `Date.now().toString(36)`; skip pages a parallel worker created moments ago.
    const createdAt = (slug: string) => parseInt(/-([0-9a-z]{7,})$/.exec(slug)?.[1] ?? '0', 36);
    for (const p of await this.listMerchantPages(prefix, merchant)) {
      if (Date.now() - createdAt(p.slug) >= olderThanMs) await this.deleteById(p.id, merchant);
    }
  }

  /** Run `action` and wait for its write to the pages API (`method` null = any non-GET). */
  private async writeAndWait(
    method: string | null,
    action: () => Promise<void>,
    url: RegExp = API_PAGES,
  ): Promise<void> {
    const [res] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          (method ? r.request().method() === method : r.request().method() !== 'GET') &&
          API_PAGES.test(r.url()) &&
          url.test(r.url()),
        {
          timeout: Timeouts.LONG,
        },
      ),
      action(),
    ]);
    expect(res.ok(), `${res.request().method()} ${res.url()} → ${res.status()}`).toBe(true);
  }
}
