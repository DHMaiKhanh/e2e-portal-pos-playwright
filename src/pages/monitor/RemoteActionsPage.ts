import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { blockMutations } from '@helpers/writeGuard';

/**
 * Monitoring › Remote Actions — `/pos/<seg>/admin/remote-actions`.
 *
 * A list of server-issued actions sent to POS devices (Merchant / Action /
 * Result / Sent at), with filters Merchant / Action / Result and a Refresh
 * button. Clicking a row opens a detail sheet (Author + Email, Merchant, Device,
 * Sent, Last report, Result, Payload). The "Send action" form lives at
 * `/admin/remote-actions/send-action` (Merchant / Action / Device / Delivery);
 * its submit stays disabled until an Action is picked.
 *
 * SAFETY: sending a remote action executes a command on a live device. Call
 * {@link blockWrites} before opening the send-action form.
 */
export class RemoteActionsPage extends BasePage {
  protected readonly path = Urls.REMOTE_ACTIONS;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly merchantFilter: Locator;
  readonly actionFilter: Locator;
  readonly resultFilter: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.merchantFilter = page
      .getByRole('button', { name: /filter by merchant|merchant/i })
      .first();
    this.actionFilter = page.getByRole('button', { name: /filter by action|action/i }).first();
    this.resultFilter = page.getByRole('button', { name: /filter by result|result/i }).first();
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.pageHeader.first()).toBeVisible();
    await expect(
      this.table.rows.first().or(this.page.locator('[data-slot="empty"]:visible')).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  get pageHeader(): Locator {
    return this.page.locator('[data-slot="pos-page-header"]');
  }

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  get detailSheet(): Locator {
    return this.page.getByRole('dialog');
  }

  /** Value cell of a detail-sheet field, e.g. `sheetValue('Result')`. */
  sheetValue(label: string): Locator {
    return this.detailSheet
      .locator('[data-slot="pos-dl-item"]')
      .filter({
        has: this.page.locator('[data-slot="pos-dl-label"]', { hasText: new RegExp(`^${label}$`) }),
      })
      .locator('[data-slot="pos-dl-value"]');
  }

  // --- Send action form -----------------------------------------------------

  async openSendAction(): Promise<void> {
    await this.page.goto(`${this.path}/send-action`, { waitUntil: 'domcontentloaded' });
    await expect(this.sendActionButton).toBeVisible();
  }

  get actionSelect(): Locator {
    return this.page.getByRole('combobox', { name: /action/i }).first();
  }

  get sendActionButton(): Locator {
    return this.page.getByRole('button', { name: /send action/i });
  }

  /** Abort any send-action / remote-action write. Call BEFORE navigating. */
  async blockWrites(): Promise<string[]> {
    return blockMutations(this.page, (url) =>
      /\/(remote[-_]?actions?|send[-_]?action|commands?)(\/|\?|$)/i.test(url.pathname + url.search),
    );
  }
}
