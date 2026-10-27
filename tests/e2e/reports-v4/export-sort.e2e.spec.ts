import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportV4Slug } from '@constants/urls';
import {
  RV4_COLUMNS,
  RV4_CURRENCY,
  RV4_DATA_DAY,
  RV4_EXPORT_ITEMS,
  RV4_PAGES,
} from '@pages/reports-v4/ReportsV4Page';

/**
 * Reports V4 › F. Export, sort & shared table behaviour (RV4-F01 … F06)
 */
const DAY = { after: RV4_DATA_DAY, before: RV4_DATA_DAY };

/** Non-empty CSV lines. */
function csvLines(text: string): string[] {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // strip UTF-8 BOM
  return body.split(/\r?\n/).filter((l) => l.trim() !== '');
}

test.describe('Reports V4 › export & sort', () => {
  for (const p of RV4_PAGES) {
    test(
      `RV4-F01 — Export on ${p.label} offers CSV and Excel`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ reportsV4Page: rp }) => {
        await rp.openWithData(p.slug);
        await rp.exportButton.click();
        for (const item of RV4_EXPORT_ITEMS) await expect(rp.exportMenuItem(item)).toBeVisible();
        await rp.page.keyboard.press('Escape');
      },
    );
  }

  test(
    'RV4-F02 — Daily Sale CSV has the table header and one line per order',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(ReportV4Slug.DAILY_SALE, DAY);
      await rp.expectDefaultLayout(ReportV4Slug.DAILY_SALE);
      const orders = await rp.countValue();
      const { name, text } = await rp.downloadText('CSV');
      expect(name).toMatch(/\.csv$/i);
      const lines = csvLines(text);
      expect(lines[0].replace(/"/g, '')).toBe(RV4_COLUMNS.dailySale.join(','));
      const dataLines = lines.slice(1).filter((l) => !/^"?Total/i.test(l));
      expect(dataLines).toHaveLength(orders);
    },
  );

  test(
    'RV4-F03 — Excel export downloads a non-empty .xlsx',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(ReportV4Slug.INCOME_SUMMARY, DAY);
      const dl = await rp.download('Excel');
      expect(dl.suggestedFilename()).toMatch(/\.xlsx$/i);
      const fs = await import('node:fs');
      const bytes = fs.readFileSync(await dl.path());
      expect(bytes.length).toBeGreaterThan(0);
      expect(bytes.subarray(0, 2).toString()).toBe('PK'); // zip container
    },
  );

  test(
    'RV4-F04 — export respects the current search filter',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(ReportV4Slug.STAFF_INCOME, DAY);
      const name = (await rp.columnTexts(0))[0];
      await rp.staffSearch.fill(name);
      await expect
        .poll(async () => (await rp.columnTexts(0)).every((n) => n.includes(name)))
        .toBe(true);
      const shown = await rp.bodyRows.count();
      const { text } = await rp.downloadText('CSV');
      const dataLines = csvLines(text)
        .slice(1)
        .filter((l) => !/^"?Total/i.test(l));
      expect(dataLines).toHaveLength(shown);
      for (const l of dataLines) expect(l).toContain(name);
    },
  );

  test(
    'RV4-F05 — numeric sort orders rows and keeps the Total row last',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      await rp.openWithData(ReportV4Slug.STAFF_INCOME, DAY);
      for (const column of ['Orders', 'Total Income']) {
        const idx = (await rp.headerLabels()).findIndex((h) => h.startsWith(column));
        await rp.clickSort(column);
        expect(await rp.expectColumnSorted(column, idx)).not.toBe('none');
        expect((await rp.footTexts())[0]).toBe('Total');
      }
    },
  );

  test(
    'RV4-F06 — money cells use $#,##0.00 (negatives as -$) on every table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp }) => {
      const tables: { slug: string; cols: number[] }[] = [
        { slug: ReportV4Slug.DAILY_SALE, cols: [1, 2, 3, 4] },
        { slug: ReportV4Slug.INCOME_SUMMARY, cols: [1, 2, 3, 4] },
        { slug: ReportV4Slug.STAFF_INCOME, cols: [2, 3, 4, 5] },
      ];
      for (const t of tables) {
        await rp.openWithData(t.slug, DAY);
        await rp.expectDefaultLayout(t.slug);
        for (const col of t.cols) {
          for (const v of await rp.columnTexts(col))
            expect(v, `${t.slug} col ${col}`).toMatch(RV4_CURRENCY);
        }
      }
    },
  );
});
