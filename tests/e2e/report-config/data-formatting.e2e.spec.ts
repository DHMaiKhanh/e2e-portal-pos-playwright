import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { RC_SOURCE_TYPES } from '@pages/report-config/ReportConfigPage';

/**
 * Cell formats observed on DEV (re-verified 2026-10-20 after the design-system
 * refactor: the slug moved into its own "Key" column, data types are shown as
 * plain-language labels, "Updated" is "MMM D, h:mm AM"). Values come from live data, so every
 * case asserts membership in a closed set or a pattern — never a fixed value.
 */
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CAMEL = /^[a-z][a-zA-Z0-9]*$/;
const STATUS = new Set(['Active', 'Inactive']);
const TYPES = new Set<string>(RC_SOURCE_TYPES);

test.describe('Định dạng dữ liệu (Data formatting) — Report Configuration', () => {
  /**
   * TC-RCF-110 — Cột Name + Key: tên không rỗng; key kebab-case (Pages/Blocks/Sources), camelCase (Columns)
   */
  test(
    'TC-RCF-110 — every row has a name and a key (slug) in the right case convention',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      for (const [screen, rule] of [
        ['pages', KEBAB],
        ['blocks', KEBAB],
        ['sources', KEBAB],
        ['columns', CAMEL],
      ] as const) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        const n = Math.min(await rc.table.rows.count(), 30);
        for (let i = 0; i < n; i++) {
          const { name, slug } = await rc.nameAndSlug(i);
          expect(name, `${screen} row ${i}`).not.toBe('');
          expect(slug, `${screen} row ${i}`).toMatch(rule);
        }
      }
    },
  );

  /**
   * TC-RCF-111 — Pages: Layouts / Status / Published
   */
  test(
    'TC-RCF-111 — Pages: layouts are Web/POS window/Mobile badges (+N, Hidden in menu), status badge, "Published vN" or "Draft"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc }) => {
      await rc.goto();
      const layoutCol = rc.columnIndex('Layouts');
      const n = await rc.table.rows.count();
      for (let i = 0; i < n; i++) {
        const cell = rc.row(i).getByRole('cell').nth(layoutCol);
        const badges = (await cell.getByRole('button').allTextContents()).map((t) => t.trim());
        expect(badges.length).toBeGreaterThan(0);
        for (const b of badges) expect(['Web', 'POS window', 'Mobile']).toContain(b);
        expect(badges).toContain('Web');
        // Cell text is e.g. "Web POS window +1" (the "+N" badge's title names the
        // hidden layouts) — strip the clickable badges, leaving "+N" / "Hidden in menu".
        let rest = (await cell.textContent()) ?? '';
        for (const b of badges) rest = rest.replace(b, ' ');
        expect(rest.replace(/\s+/g, ' ').trim()).toMatch(/^(\+\d+)?\s*(Hidden in menu)?$/);
      }
      for (const s of await rc.columnValues(rc.columnIndex('Status'))) expect(STATUS).toContain(s);
      for (const p of await rc.columnValues(rc.columnIndex('Published')))
        expect(p).toMatch(/^(Published v\d+|Draft)$/);
    },
  );

  /**
   * TC-RCF-112 — Blocks: Status / Kind / Source
   */
  test(
    'TC-RCF-112 — Blocks: status badge, kind in {Table, Summary, Chart, Detail}, Source links to its source',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      for (const s of await rc.columnValues(rc.columnIndex('Status'))) expect(STATUS).toContain(s);
      for (const k of await rc.columnValues(rc.columnIndex('Kind')))
        expect(['Table', 'Summary', 'Chart', 'Detail']).toContain(k);
      const sourceLinks = rc.table.rows.locator(`td:nth-child(${rc.columnIndex('Source') + 1}) a`);
      const n = await rc.table.rows.count();
      await expect(sourceLinks).toHaveCount(n);
      for (const href of await sourceLinks.evaluateAll((as) =>
        as.map((a) => a.getAttribute('href')),
      ))
        expect(href).toMatch(/\/report-config\/sources\/[0-9a-f-]{36}$/);
      for (const name of await sourceLinks.allInnerTexts()) expect(name.trim()).not.toBe('');
    },
  );

  /**
   * TC-RCF-113 — Sources: Type / Response / Columns / Status / Updated
   */
  test(
    'TC-RCF-113 — Sources: known type, Collection|Summary response, integer column count, "MMM D, h:mm AM" updated',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('sources');
      await rc.goto();
      for (const t of await rc.columnValues(rc.columnIndex('Type'))) expect(TYPES).toContain(t);
      for (const r of await rc.columnValues(rc.columnIndex('Response')))
        expect(['Collection', 'Summary']).toContain(r);
      for (const c of await rc.columnValues(rc.columnIndex('Columns'))) expect(c).toMatch(/^\d+$/);
      for (const s of await rc.columnValues(rc.columnIndex('Status'))) expect(STATUS).toContain(s);
      for (const u of await rc.columnValues(rc.columnIndex('Updated')))
        expect(u).toMatch(/^[A-Z][a-z]{2} \d{1,2}(, \d{4})?, \d{1,2}:\d{2} (AM|PM)$/);
    },
  );

  /**
   * TC-RCF-114 — Columns: Type / Kind / Data type thuộc tập hợp đã biết
   */
  test(
    'TC-RCF-114 — Columns: type, kind and data type come from closed sets',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      for (const t of await rc.columnValues(rc.columnIndex('Type'))) expect(TYPES).toContain(t);
      for (const k of await rc.columnValues(rc.columnIndex('Kind')))
        expect(['Column', 'Formula', 'Joined', 'Subquery']).toContain(k);
      // Plain-language data-type labels (all values seen across the 429 DEV columns).
      for (const d of await rc.columnValues(rc.columnIndex('Data type'))) {
        expect(['Whole number', 'Yes/No', 'Money', 'Text', 'Structured data', 'Date']).toContain(d);
      }
    },
  );
});
