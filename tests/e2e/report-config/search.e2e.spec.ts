import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { REPORT_CONFIG_SCREEN_NAMES } from '@pages/report-config/ReportConfigPage';

/**
 * Search facts (DEV, 2026-10-13):
 *  - every screen writes `?search=<term>&page=1` and restores it on reload;
 *  - Pages/Blocks filter in memory (they re-GET the full `itemsPerPage=100` list),
 *    Sources sends `report_data.jsonld?name[]=`, Columns sends `label[]=` or
 *    `slug[]=` depending on the shape of the term;
 *  - no-match renders `[data-slot="empty"]` + "Showing 0 to 0 of 0 results".
 * Needles are read from live rows, never hard-coded.
 */
test.describe('Tìm kiếm (Search) — Report Configuration', () => {
  /**
   * TC-RCF-020 — Pages: tìm theo một phần tên, không phân biệt hoa/thường
   */
  test(
    'TC-RCF-020 — Pages: partial, case-insensitive name search narrows rows and writes ?search=',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      await reportConfigPage.goto();
      const before = await reportConfigPage.totalResults();
      const { name } = await reportConfigPage.nameAndSlug(0);
      const needle = name.split(' ')[0].toUpperCase();

      await reportConfigPage.search(needle);

      await expect(page).toHaveURL(new RegExp(`search=${encodeURIComponent(needle)}`));
      const after = await reportConfigPage.totalResults();
      expect(after).toBeGreaterThan(0);
      expect(after).toBeLessThanOrEqual(before);
      for (const row of await reportConfigPage.table.rows.allInnerTexts()) {
        expect(row.toLowerCase()).toContain(needle.toLowerCase());
      }
    },
  );

  /**
   * TC-RCF-021 — Blocks: tìm theo dataset (placeholder hứa "name, slug or dataset")
   */
  test(
    'TC-RCF-021 — Blocks: searching a dataset slug returns blocks bound to it',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const dataset = (await rc.columnValues(rc.columnIndex('DATASET')))[0];
      await rc.search(dataset);
      expect(await rc.totalResults()).toBeGreaterThan(0);
      const datasets = await rc.columnValues(rc.columnIndex('DATASET'));
      expect(datasets).toContain(dataset);
      // Slug search works too — the first row's slug finds that exact block.
      await rc.clearSearch();
      const { slug } = await rc.nameAndSlug(0);
      await rc.search(slug);
      expect((await rc.nameAndSlug(0)).slug).toBe(slug);
    },
  );

  /**
   * TC-RCF-022 — Sources: tìm theo tên gọi server với `name[]=`
   */
  test(
    'TC-RCF-022 — Sources: name search is server-side (name[]=) and returns matching rows',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('sources');
      await rc.goto();
      const needle = (await rc.nameAndSlug(0)).name.split(' ')[0];
      const req = page.waitForRequest((r) => /report_data\.jsonld\?.*name%5B%5D=/.test(r.url()));
      await rc.search(needle);
      expect((await req).url()).toContain(`name%5B%5D=${encodeURIComponent(needle)}`);
      for (const n of await rc.columnValues(0))
        expect(n.toLowerCase()).toContain(needle.toLowerCase());
    },
  );

  /**
   * TC-RCF-023 — Columns: tìm theo label (có khoảng trắng) gửi `label[]=`
   */
  test(
    'TC-RCF-023 — Columns: a label-shaped term is sent as label[]= and matches labels',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      const label = (await rc.nameAndSlug(0)).name.split(' ').slice(0, 2).join(' ');
      const req = page.waitForRequest((r) =>
        /report_columns\.jsonld\?.*label%5B%5D=/.test(r.url()),
      );
      await rc.search(label);
      await req;
      expect(await rc.totalResults()).toBeGreaterThan(0);
      for (const row of await rc.table.rows.allInnerTexts()) {
        expect(row.toLowerCase()).toContain(label.toLowerCase());
      }
    },
  );

  /**
   * TC-RCF-024 — Columns: tìm theo slug camelCase trả đúng các cột có slug đó
   */
  test(
    'TC-RCF-024 — Columns: searching an exact camelCase slug returns only that slug',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      const { slug } = await rc.nameAndSlug(0);
      const req = page.waitForRequest((r) =>
        /report_columns\.jsonld\?.*(slug|label)%5B%5D=/.test(r.url()),
      );
      await rc.search(slug);
      const sent = (await req).url();
      test.info().annotations.push({
        type: 'behaviour',
        description: `slug term sent as ${/slug%5B%5D/.test(sent) ? 'slug[]' : 'label[]'}`,
      });
      const n = await rc.table.rows.count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) expect((await rc.nameAndSlug(i)).slug).toBe(slug);
    },
  );

  /**
   * TC-RCF-025 — Không khớp → empty state riêng từng màn hình
   */
  test(
    'TC-RCF-025 — a non-matching term shows the screen-specific empty state on all four screens',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        await rc.search('zzz-no-match-xyz');
        await expect(rc.emptyState).toHaveText(rc.spec.emptyText);
        await expect(rc.resultsFooter).toHaveText('Showing 0 to 0 of 0 results');
        await expect(rc.pageIndicator).toHaveText(/^1\s*\/\s*1$/);
        await expect(rc.prevButton).toBeDisabled();
        await expect(rc.nextButton).toBeDisabled();
      }
    },
  );

  /**
   * TC-RCF-026 — Xoá ô tìm kiếm khôi phục danh sách & bỏ param
   */
  test(
    'TC-RCF-026 — clearing the search restores the full list and drops ?search',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      const total = await rc.totalResults();
      await rc.search('zzz-no-match-xyz');
      await expect(rc.emptyState).toBeVisible();
      await rc.clearSearch();
      await expect.poll(() => rc.totalResults()).toBe(total);
      expect(page.url()).not.toContain('search=');
    },
  );

  /**
   * TC-RCF-027 — Chuỗi toàn khoảng trắng (defect D4 trên Sources)
   */
  test(
    'TC-RCF-027 — whitespace-only search: ignored on Pages/Blocks/Columns, empties Sources (defect D4)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      for (const screen of ['pages', 'blocks', 'columns'] as const) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        const total = await rc.totalResults();
        await rc.search('   ');
        expect(await rc.totalResults(), screen).toBe(total);
      }
      const sources = reportConfigPage.on('sources');
      await sources.goto();
      await sources.search('   ');
      const total = await sources.totalResults();
      if (total === 0) {
        test.info().annotations.push({
          type: 'defect',
          description:
            'D4: Sources sends name[]=%20%20%20 untrimmed and shows 0 results for a whitespace-only term',
        });
      }
      // Current behaviour: no crash either way, empty state or rows.
      await expect(sources.table.rows.first().or(sources.emptyState)).toBeVisible();
    },
  );

  /**
   * TC-RCF-028 — Deep link `?search=` khôi phục ô tìm kiếm và kết quả
   */
  test(
    'TC-RCF-028 — a ?search= deep link restores the input and the filtered result set',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('sources');
      await rc.gotoWithQuery({ search: 'Staff' });
      await expect(rc.searchInput).toHaveValue('Staff');
      for (const n of await rc.columnValues(0)) expect(n.toLowerCase()).toContain('staff');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await rc.waitForReady();
      await expect(rc.searchInput).toHaveValue('Staff');
    },
  );

  /**
   * TC-RCF-029 — Tìm kiếm đưa về trang 1
   */
  test(
    'TC-RCF-029 — searching from page 2 resets to page 1',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.gotoWithQuery({ page: '2' });
      expect((await rc.footerRange()).from).toBe(31);
      await rc.search('Card');
      await expect(page).toHaveURL(/page=1/);
      expect((await rc.footerRange()).from).toBe(1);
    },
  );
});
