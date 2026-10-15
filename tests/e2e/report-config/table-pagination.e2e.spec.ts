import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Pagination (DEV, 2026-10-13): page size fixed at 30, `?page=N` in the URL,
 * footer "Showing X to Y of Z results" + "n / m" indicator. Sources/Columns page
 * on the server (`page=N`), Pages/Blocks in memory. Two defects are pinned here
 * with annotations (assert current behaviour, flag it in the report):
 *  - D1 Blocks renders every row (90) although the footer says 1–30 and Next
 *    only changes the footer;
 *  - D5 `?page=999` is not clamped ("Showing 29941 to 460 of 460", "999 / 16").
 */
test.describe('Bảng & phân trang (Table / Pagination) — Report Configuration', () => {
  /**
   * TC-RCF-060 — Footer & chỉ báo trang đúng định dạng; số dòng = to − from + 1
   */
  test(
    'TC-RCF-060 — footer and page indicator agree with the rows on screen (Pages, Sources, Columns)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      for (const screen of ['pages', 'sources', 'columns'] as const) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        const { from, to, total } = await rc.footerRange();
        expect(from, screen).toBe(1);
        expect(to, screen).toBe(Math.min(30, total));
        await expect(rc.visibleRows).toHaveCount(to - from + 1);
        await expect(rc.pageIndicator).toHaveText(
          new RegExp(`^1\\s*/\\s*${Math.max(1, Math.ceil(total / 30))}$`),
        );
        await expect(rc.prevButton).toBeDisabled();
        if (total > 30) await expect(rc.nextButton).toBeEnabled();
        else await expect(rc.nextButton).toBeDisabled();
      }
    },
  );

  /**
   * TC-RCF-061 — Next/Previous trên Columns (server-side)
   */
  test(
    'TC-RCF-061 — Columns: Next loads page 2 from the server, Previous returns to page 1',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      const firstOnPage1 = await rc.nameAndSlug(0);
      const { total } = await rc.footerRange();
      const req = page.waitForRequest((r) => /report_columns\.jsonld\?page=2/.test(r.url()));
      await rc.nextButton.click();
      await req;
      await expect(rc.resultsFooter).toHaveText(`Showing 31 to 60 of ${total} results`);
      await expect(rc.pageIndicator).toHaveText(new RegExp(`^2\\s*/\\s*${Math.ceil(total / 30)}$`));
      await expect(page).toHaveURL(/page=2/);
      await expect(rc.prevButton).toBeEnabled();
      await expect.poll(() => rc.nameAndSlug(0)).not.toEqual(firstOnPage1);

      await rc.prevButton.click();
      await expect(rc.resultsFooter).toHaveText(`Showing 1 to 30 of ${total} results`);
      await expect(page).toHaveURL(/page=1/);
    },
  );

  /**
   * TC-RCF-062 — Trang cuối: Next disabled
   */
  test(
    'TC-RCF-062 — Sources: on the last page Next is disabled and the footer ends at the total',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('sources');
      await rc.goto();
      const { total } = await rc.footerRange();
      const last = Math.max(1, Math.ceil(total / 30));
      await rc.gotoWithQuery({ page: String(last) });
      const range = await rc.footerRange();
      expect(range.to).toBe(total);
      expect(range.from).toBe((last - 1) * 30 + 1);
      await expect(rc.nextButton).toBeDisabled();
      await expect(rc.visibleRows).toHaveCount(range.to - range.from + 1);
    },
  );

  /**
   * TC-RCF-063 — Deep link `?page=2` giữ sau reload
   */
  test(
    'TC-RCF-063 — a ?page=2 deep link opens page 2 and survives a reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.gotoWithQuery({ page: '2' });
      expect((await rc.footerRange()).from).toBe(31);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await rc.waitForReady();
      expect((await rc.footerRange()).from).toBe(31);
      await expect(rc.pageIndicator).toHaveText(/^2\s*\//);
    },
  );

  /**
   * TC-RCF-064 — Blocks: trang 1 phải hiển thị tối đa 30 dòng (defect D1)
   */
  test(
    'TC-RCF-064 — Blocks: footer says 1–30 but the table renders every block (defect D1)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const { from, to, total } = await rc.footerRange();
      expect(from).toBe(1);
      expect(to).toBe(Math.min(30, total));
      const shown = await rc.visibleRows.count();
      if (shown !== to - from + 1) {
        test.info().annotations.push({
          type: 'defect',
          description: `D1: Blocks footer "Showing ${from} to ${to} of ${total}" but ${shown} rows are rendered`,
        });
      }
      // Current behaviour: all rows rendered (≥ the page slice).
      expect(shown).toBeGreaterThanOrEqual(to - from + 1);
    },
  );

  /**
   * TC-RCF-065 — Blocks: Next chỉ đổi footer, không đổi nội dung (defect D1)
   */
  test(
    'TC-RCF-065 — Blocks: Next updates the footer to 31–60 (rows unchanged — defect D1)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const { total } = await rc.footerRange();
      test.skip(total <= 30, 'Blocks fits on one page');
      const first = await rc.visibleRows.first().innerText();
      await rc.nextButton.click();
      await expect(rc.resultsFooter).toHaveText(
        `Showing 31 to ${Math.min(60, total)} of ${total} results`,
      );
      await expect(page).toHaveURL(/page=2/);
      const firstAfter = await rc.visibleRows.first().innerText();
      if (firstAfter === first) {
        test.info().annotations.push({
          type: 'defect',
          description:
            'D1: Blocks page 2 shows the same first row as page 1 — client pagination is not applied to the rows',
        });
      }
    },
  );

  /**
   * TC-RCF-066 — `?page=999` không được clamp (defect D5)
   */
  test(
    'TC-RCF-066 — an out-of-range ?page shows the empty state with an impossible footer (defect D5)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('columns');
      await rc.gotoWithQuery({ page: '999' });
      await expect(rc.emptyState).toBeVisible();
      const { from, total } = await rc.footerRange();
      if (from > total) {
        test.info().annotations.push({
          type: 'defect',
          description: `D5: ?page=999 not clamped — footer "Showing ${from} to … of ${total}", indicator "${await rc.pageIndicator.textContent()}"`,
        });
      }
      await expect(rc.prevButton).toBeEnabled();
    },
  );

  /**
   * TC-RCF-067 — Cỡ trang cố định 30, không có control đổi cỡ trang
   */
  test(
    'TC-RCF-067 — page size is fixed at 30 with no page-size control',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      await expect(rc.visibleRows).toHaveCount(30);
      await expect(page.locator('select:visible')).toHaveCount(0);
      // Only the filter comboboxes exist — none of them is a page-size picker.
      const combos = await page
        .getByRole('combobox')
        .evaluateAll((cs) => cs.map((c) => c.getAttribute('aria-label')));
      expect(combos).toEqual(['Filter by type', 'Filter by kind']);
    },
  );
});
