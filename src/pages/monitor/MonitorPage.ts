import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';

/** `?tab=` values of the Monitor tabs. */
export const MonitorTab = {
  SYNC: 'sync-data',
  BACKGROUND: 'background-task',
  REPORT: 'report-task',
  GIFT_CARD: 'gift-card-transaction',
} as const;

export type MonitorTabValue = (typeof MonitorTab)[keyof typeof MonitorTab];

/**
 * Internal › Monitor (`/pos/<seg>/admin/monitor`). Each tab is a table of log
 * rows; clicking a row opens a detail sheet (`role="dialog"`) laid out as a
 * description list (`pos-dl-item` → `pos-dl-label` / `pos-dl-value`).
 */
export class MonitorPage extends BasePage {
  protected readonly path = Urls.MONITOR;

  readonly table: DataTable;

  constructor(page: Page) {
    super(page);
    this.table = new DataTable(page, page.getByRole('table'));
  }

  async waitForReady(): Promise<void> {
    await expect(this.page.getByRole('tab', { name: /^syncing$/i })).toBeVisible();
  }

  async open(tab: MonitorTabValue): Promise<void> {
    await this.page.goto(`${Urls.MONITOR}?tab=${tab}`, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
    // Every tab panel keeps its own empty-state node, so take the first visible match.
    await expect(
      this.table.rows.first().or(this.page.locator('[data-slot="empty"]:visible')).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  /** Merchant cell of a table row, as shown: name + `#id`. */
  rowMerchant(row: Locator): Locator {
    return row.locator('[data-slot="pos-merchant"]');
  }

  get detailSheet(): Locator {
    return this.page.getByRole('dialog');
  }

  /** Value cell of a detail-sheet field, e.g. `sheetValue('Merchant')`. */
  sheetValue(label: string): Locator {
    return this.detailSheet
      .locator('[data-slot="pos-dl-item"]')
      .filter({
        has: this.page.locator('[data-slot="pos-dl-label"]', { hasText: new RegExp(`^${label}$`) }),
      })
      .locator('[data-slot="pos-dl-value"]');
  }
}
