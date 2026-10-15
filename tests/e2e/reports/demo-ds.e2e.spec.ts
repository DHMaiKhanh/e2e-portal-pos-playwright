import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { RPT_COLUMNS, RPT_DEMO_TABS, rptBlockSort } from '@pages/reports/ReportPagesPage';

/**
 * Reports › Demo DS Report — trang demo, phủ nhẹ (TC-RPT-072 … 075).
 */
const SLUG = ReportPageSlug.DEMO_DS;

test.describe('Reports › Demo DS Report', () => {
  test(
    'TC-RPT-072 — four tabs render with Daily Sale selected by default',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await rp.open(SLUG);
      await expect(rp.tabs).toHaveText([...RPT_DEMO_TABS], { timeout: Timeouts.LONG });
      await expect(rp.tabs.first()).toHaveAttribute('aria-selected', 'true');
      for (let i = 1; i < RPT_DEMO_TABS.length; i++) await expect(rp.tabs.nth(i)).toHaveAttribute('aria-selected', 'false');
    },
  );

  test(
    'TC-RPT-073 — switching tabs selects the tab and writes ?tab=; Staff Payroll pins a period_id',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.open(SLUG);
      const seen = new Set<string>();
      for (const name of ['Income Summary', 'Staff Income', 'Staff Payroll', 'Daily Sale']) {
        const tab = page.getByRole('tab', { name, exact: true });
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        await expect.poll(() => rp.param('tab')).toBeTruthy();
        seen.add(rp.param('tab')!);
        if (name === 'Staff Payroll') {
          await expect.poll(() => rp.param('period_id'), { timeout: Timeouts.LONG }).toMatch(/^[0-9a-f-]{36}$/);
        }
      }
      expect(seen.size).toBe(4);
      expect(rp.param('tab')).toBe('daily-sale');
    },
  );

  test(
    'TC-RPT-074 — the demo Order Details has six columns and a "Total · N rows" line',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      expect((await rp.headerLabels()).map((h) => h.toLowerCase())).toEqual(
        RPT_COLUMNS.demoDailySale.map((h) => h.toLowerCase()),
      );
      if ((await rp.dataRows().count()) > 0) {
        await expect(page.getByText(/^Total · \d[\d,]* rows$/)).toBeVisible();
      }
    },
  );

  test(
    'TC-RPT-075 — sorting the demo Total column writes its own blockSort key',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(SLUG);
      await rp.clickSort('Total');
      expect(await rp.sortState('Total')).toBe('descending');
      expect(rptBlockSort(page.url())['demo-ds-order-details']).toMatch(/:desc$/);
    },
  );
});
