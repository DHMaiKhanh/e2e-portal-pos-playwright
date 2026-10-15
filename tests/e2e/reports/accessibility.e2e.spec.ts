import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { RPT_COLUMNS, RPT_PAGES, RPT_TEXT } from '@pages/reports/ReportPagesPage';

/**
 * Reports — khả năng tiếp cận (TC-RPT-096 … 100).
 */
test.describe('Reports — accessibility', () => {
  test(
    'TC-RPT-096 — every sort header is a named button and th[aria-sort] mirrors its state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(ReportPageSlug.STAFF_INCOME);
      for (const col of RPT_COLUMNS.staffIncome) await expect(rp.sortButton(col)).toBeVisible();
      const th = page.getByRole('columnheader', { name: /^Sort by Staff/ });
      await expect(th).toHaveAttribute('aria-sort', 'ascending');
      await rp.clickSort('Staff');
      await expect(th).toHaveAttribute('aria-sort', 'descending');
      await expect(page.getByRole('columnheader', { name: /^Sort by Orders/ })).toHaveAttribute('aria-sort', 'none');
    },
  );

  test(
    'TC-RPT-097 — the no-income switch and the search box have accessible names',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(ReportPageSlug.STAFF_INCOME);
      await expect(page.getByRole('switch', { name: RPT_TEXT.NO_INCOME_SWITCH })).toHaveCount(1);
      await expect(page.getByRole('textbox', { name: /Search by staff name/ })).toHaveCount(1);
      await expect(rp.dateRangeButton).toHaveAccessibleName('Report date range');
      await expect(rp.exportButton).toHaveAccessibleName('Export');
    },
  );

  test(
    'TC-RPT-098 — keyboard: Tab walks search → preset → date → switch → Export → sort headers; Enter sorts',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(ReportPageSlug.STAFF_INCOME);
      await rp.staffSearch.focus();
      const order: string[] = [];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        order.push(
          await page.evaluate(() => {
            const el = document.activeElement as HTMLElement;
            return el.getAttribute('aria-label') ?? (el.getAttribute('role') === 'switch' ? 'switch' : el.innerText.trim());
          }),
        );
      }
      expect(order[0]).toBe('Report Date Range preset');
      expect(order[1]).toBe('Report date range');
      expect(order[2]).toBe('switch');
      expect(order[3]).toBe('Export');
      expect(order[4]).toMatch(/^Sort by Staff/);
      expect(order[5]).toMatch(/^Sort by Orders/);
      await page.keyboard.press('Enter');
      await expect.poll(() => rp.sortState('Orders'), { timeout: Timeouts.MEDIUM }).toBe('descending');
    },
  );

  test(
    'TC-RPT-099 — KPI tiles are focusable buttons that Enter activates',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(ReportPageSlug.DAILY_SALE);
      const tile = rp.kpiTile('Total Tip');
      await expect(tile).toHaveAttribute('role', 'button');
      await expect(tile).toHaveAttribute('tabindex', '0');
      await tile.focus();
      await page.keyboard.press('Enter');
      await expect(tile).toHaveAttribute('data-selected', 'true');
      await expect.poll(() => rp.param('metric')).toBe('dailySaleTip');
    },
  );

  test(
    'TC-RPT-100 — each report exposes its name as a page heading',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      test.fail(true, 'Product gap: the report name is a <div data-slot="page-title">, no h1–h6');
      const spec = RPT_PAGES[0];
      await rp.open(spec.slug);
      await expect(rp.pageTitle).toBeVisible({ timeout: Timeouts.LONG });
      await expect(page.getByRole('heading', { name: spec.label })).toBeVisible({ timeout: Timeouts.SHORT });
    },
  );
});
