import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { MonitorTab, type MonitorTabValue } from '@pages/monitor/MonitorPage';

/**
 * VP-4086 — Monitor: the sync log and background task detail sheets showed Merchant "—".
 * https://linear.app/fastboy/issue/VP-4086
 *
 * The detail API sends the merchant as a link only and a refactor stopped reading the id from it.
 * Read-only: opens the newest row of each tab and compares the sheet's Merchant with the row's.
 */
test.describe('VP-4086 — sheet chi tiết Monitor hiện đúng Merchant', () => {
  const cases: { id: string; tab: MonitorTabValue; name: string }[] = [
    { id: 'TC-VP4086-01', tab: MonitorTab.SYNC, name: 'Syncing (sync log)' },
    { id: 'TC-VP4086-02', tab: MonitorTab.BACKGROUND, name: 'Background tasks' },
  ];

  for (const c of cases) {
    test(
      `${c.id} — tab ${c.name}: Merchant trong sheet khác "—" và khớp dòng`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ monitorPage }) => {
        await monitorPage.open(c.tab);
        const row = monitorPage.table.rows.first();
        expect(!(await row.isVisible()), `tab ${c.name} has no rows on DEV`).toBeFalsy();

        const merchant = monitorPage.rowMerchant(row);
        await expect(merchant).toBeVisible();
        const rowMerchant = (await merchant.innerText()).replace(/\s+/g, ' ').trim();

        await row.click();
        await expect(monitorPage.detailSheet).toBeVisible();
        const value = monitorPage.sheetValue('Merchant');
        await expect(value).toBeVisible();
        await expect(value).not.toHaveText(/^\s*—\s*$/);
        await expect(value.locator('[data-slot="pos-merchant"]')).toBeVisible();
        expect((await value.innerText()).replace(/\s+/g, ' ').trim()).toBe(rowMerchant);
      },
    );
  }
});
