import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { REPORT_CONFIG_SCREENS } from '@pages/report-config/ReportConfigPage';

/**
 * Filters are filter chips (`[data-slot="pos-filter-chip"]`, aria-label "<label>"
 * → "<label>: <value>" once set) opening a `listbox "Suggestions"`; there is no
 * "All …" option any more — a set chip gets a sibling "Clear … filter" button.
 * URL params verified on DEV 2026-10-20: Pages `variant=web|pos|mobile`, Blocks
 * `blockKind=table|summary|chart|detail`, Sources/Columns `type=<slug>`
 * (Store Daily Income → `store`), Columns `kind=column|derived|…`
 * (Database column → `column`, Formula → `derived`). Sources/Columns forward
 * them to the API as `type[]=` / `kind[]=`.
 */
test.describe('Bộ lọc (Filters) — Report Configuration', () => {
  const optionsCase = (id: string, screen: 'pages' | 'blocks' | 'sources' | 'columns') => {
    test(
      `${id} — ${REPORT_CONFIG_SCREENS[screen].heading}: filter options are exactly the documented set`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ reportConfigPage, page }) => {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        for (const f of rc.spec.filters) {
          expect(await rc.openFilter(f.label), f.label).toEqual([...f.options]);
          await page.keyboard.press('Escape');
          await expect(rc.listbox).toHaveCount(0);
        }
      },
    );
  };

  /** TC-RCF-040 — Pages: option "Layout variant" */
  optionsCase('TC-RCF-040', 'pages');

  /**
   * TC-RCF-041 — Pages: lọc "Mobile"
   */
  test(
    'TC-RCF-041 — Pages: filtering by Mobile keeps only pages with a Mobile layout (variant=mobile)',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      await reportConfigPage.goto();
      const before = await reportConfigPage.totalResults();
      await reportConfigPage.selectFilter('Mobile');
      await expect(page).toHaveURL(/variant=mobile/);
      expect(await reportConfigPage.totalResults()).toBeLessThanOrEqual(before);
      // Only the first two layout badges are drawn; the rest collapse into "+N".
      const layouts = await reportConfigPage.columnValues(reportConfigPage.columnIndex('Layouts'));
      expect(layouts.length).toBeGreaterThan(0);
      for (const l of layouts) expect(l).toMatch(/Mobile|\+\d+/);
    },
  );

  /** TC-RCF-042 — Blocks: option Kind */
  optionsCase('TC-RCF-042', 'blocks');

  /**
   * TC-RCF-043 — Blocks: lọc Kind = Chart
   */
  test(
    'TC-RCF-043 — Blocks: Kind=Chart keeps only Chart blocks (blockKind=chart)',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      await rc.selectFilter('Chart');
      await expect(page).toHaveURL(/blockKind=chart/);
      const kinds = await rc.columnValues(rc.columnIndex('Kind'));
      expect(kinds.length).toBeGreaterThan(0);
      expect(new Set(kinds)).toEqual(new Set(['Chart']));
    },
  );

  /** TC-RCF-044 — Sources: option Type (11) */
  optionsCase('TC-RCF-044', 'sources');

  /**
   * TC-RCF-045 — Sources: lọc theo Type, gửi `type[]=` lên server
   */
  test(
    'TC-RCF-045 — Sources: a Type filter is sent as type[]= and every TYPE cell matches',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('sources');
      await rc.goto();
      const req = page.waitForRequest((r) => /report_data\.jsonld\?.*type%5B%5D=/.test(r.url()));
      await rc.selectFilter('Store Daily Income');
      expect((await req).url()).toMatch(/type%5B%5D=[a-z_]+/);
      await expect(page).toHaveURL(/[?&]type=[a-z_]+/);
      const types = await rc.columnValues(rc.columnIndex('Type'));
      expect(types.length).toBeGreaterThan(0);
      expect(new Set(types)).toEqual(new Set(['Store Daily Income']));
    },
  );

  /** TC-RCF-046 — Columns: option Type & Kind */
  optionsCase('TC-RCF-046', 'columns');

  /**
   * TC-RCF-047 — Columns: lọc Kind = Derived (Formula)
   */
  test(
    'TC-RCF-047 — Columns: Kind=Formula keeps only derived columns (kind=derived)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      await rc.selectFilter('Formula', 'Filter by kind');
      await expect(page).toHaveURL(/kind=derived/);
      expect(new Set(await rc.columnValues(rc.columnIndex('Kind')))).toEqual(new Set(['Formula']));
    },
  );

  /**
   * TC-RCF-048 — Columns: kết hợp Type + Kind
   */
  test(
    'TC-RCF-048 — Columns: Type and Kind combine (AND) and both land in the URL',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      await rc.selectFilter('Payroll', 'Filter by type');
      await rc.selectFilter('Database column', 'Filter by kind');
      await expect(page).toHaveURL(/type=[a-z_]+/);
      await expect(page).toHaveURL(/kind=column/);
      const types = await rc.columnValues(rc.columnIndex('Type'));
      expect(types.length).toBeGreaterThan(0);
      expect(new Set(types)).toEqual(new Set(['Payroll']));
      expect(new Set(await rc.columnValues(rc.columnIndex('Kind')))).toEqual(new Set(['Column']));
    },
  );

  /**
   * TC-RCF-049 — Bộ lọc giữ sau reload
   */
  test(
    'TC-RCF-049 — a selected filter survives a reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      await rc.selectFilter('Summary');
      const total = await rc.totalResults();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await rc.waitForReady();
      await expect(page).toHaveURL(/blockKind=summary/);
      expect(await rc.filterValue()).toBe('Summary');
      expect(await rc.totalResults()).toBe(total);
    },
  );

  /**
   * TC-RCF-050 — Bộ lọc + tìm kiếm kết hợp (Blocks)
   */
  test(
    'TC-RCF-050 — Blocks: Kind filter and search combine',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      await rc.selectFilter('Table');
      // Pinned to existing DEV data: store 100004 has several "Payroll …" table blocks.
      await rc.search('payroll');
      const n = await rc.table.rows.filter({ visible: true }).count();
      expect(n).toBeGreaterThan(0);
      const rows = await rc.visibleRows.allInnerTexts();
      for (const r of rows) {
        expect(r.toLowerCase()).toContain('payroll');
        expect(r).toContain('Table');
      }
    },
  );

  /**
   * TC-RCF-051 — Xoá bộ lọc ("Clear … filter") bỏ param và khôi phục tổng
   */
  test(
    'TC-RCF-051 — clearing the filter chip drops the param and restores the total',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      const total = await rc.totalResults();
      await rc.selectFilter('Chart');
      expect(await rc.totalResults()).toBeLessThan(total);
      await rc.clearFilter();
      expect(await rc.filterValue()).toBe('');
      expect(page.url()).not.toContain('blockKind=');
      expect(await rc.totalResults()).toBe(total);
    },
  );

  /**
   * TC-RCF-052 — Giá trị filter không hợp lệ trên URL
   */
  test(
    'TC-RCF-052 — an unknown filter value in the URL yields the empty state, not a crash',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const blocks = reportConfigPage.on('blocks');
      await blocks.gotoWithQuery({ blockKind: 'bogus' });
      await expect(blocks.emptyState).toHaveText(blocks.spec.emptyText);
      const sources = reportConfigPage.on('sources');
      await sources.gotoWithQuery({ type: 'bogus' });
      await expect(sources.emptyState).toHaveText(sources.spec.emptyText);
      expect(errors).toEqual([]);
    },
  );
});
