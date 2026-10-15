import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { REPORT_CONFIG_SCREENS } from '@pages/report-config/ReportConfigPage';

/**
 * Cell formats observed on DEV 2026-10-13. Values come from live data, so every
 * case asserts membership in a closed set or a pattern — never a fixed value.
 */
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CAMEL = /^[a-z][a-zA-Z0-9]*$/;
const STATUS = new Set(['Active', 'Inactive']);
const TYPES = new Set(REPORT_CONFIG_SCREENS.sources.filters[0].options.slice(1));

test.describe('Định dạng dữ liệu (Data formatting) — Report Configuration', () => {
  /**
   * TC-RCF-110 — Cột NAME: tên + slug; slug kebab-case (Pages/Blocks/Sources), camelCase (Columns)
   */
  test(
    'TC-RCF-110 — NAME cell stacks a label over a slug in the right case convention',
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
   * TC-RCF-111 — Pages: LAYOUTS / STATUS / PUBLISHED
   */
  test(
    'TC-RCF-111 — Pages: layouts are Web/POS Window/Mobile (+Hidden in menu), status badge, "Published vN" or "Draft"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc }) => {
      await rc.goto();
      const n = await rc.table.rows.count();
      for (let i = 0; i < n; i++) {
        const badges = (
          await rc.row(i).getByRole('cell').nth(1).locator('[data-slot="badge"]').allInnerTexts()
        ).map((t) => t.trim());
        expect(badges.length).toBeGreaterThan(0);
        for (const b of badges)
          expect(['Web', 'POS Window', 'Mobile', 'Hidden in menu']).toContain(b);
        expect(badges).toContain('Web');
      }
      for (const s of await rc.columnValues(2)) expect(STATUS).toContain(s);
      for (const p of await rc.columnValues(3)) expect(p).toMatch(/^(Published v\d+|Draft)$/);
    },
  );

  /**
   * TC-RCF-112 — Blocks: STATUS / KIND / DATASET
   */
  test(
    'TC-RCF-112 — Blocks: status badge, kind in {Table, Summary, Chart, Detail}, kebab-case dataset',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      for (const s of await rc.columnValues(1)) expect(STATUS).toContain(s);
      for (const k of await rc.columnValues(2))
        expect(['Table', 'Summary', 'Chart', 'Detail']).toContain(k);
      for (const d of await rc.columnValues(3)) expect(d).toMatch(KEBAB);
    },
  );

  /**
   * TC-RCF-113 — Sources: TYPE / RESPONSE / COLUMNS / STATUS / UPDATED
   */
  test(
    'TC-RCF-113 — Sources: known type, Collection|Summary response, integer column count, "MMM D, YYYY" date',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('sources');
      await rc.goto();
      for (const t of await rc.columnValues(1)) expect(TYPES).toContain(t);
      for (const r of await rc.columnValues(2)) expect(['Collection', 'Summary']).toContain(r);
      for (const c of await rc.columnValues(3)) expect(c).toMatch(/^\d+$/);
      for (const s of await rc.columnValues(4)) expect(STATUS).toContain(s);
      for (const u of await rc.columnValues(5)) {
        expect(u).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
        expect(Number.isNaN(Date.parse(u))).toBe(false);
      }
    },
  );

  /**
   * TC-RCF-114 — Columns: TYPE / KIND / DATA TYPE thuộc tập hợp đã biết
   */
  test(
    'TC-RCF-114 — Columns: type, kind and data type come from closed sets',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('columns');
      await rc.goto();
      for (const t of await rc.columnValues(1)) expect(TYPES).toContain(t);
      for (const k of await rc.columnValues(2)) {
        expect(['Column (Leaf)', 'Derived (Formula)', 'Joined', 'Subquery']).toContain(k);
      }
      for (const d of await rc.columnValues(3)) {
        expect([
          'Integer',
          'Boolean',
          'Bigint',
          'Numeric',
          'String',
          'JSONB',
          'Timestamp',
        ]).toContain(d);
      }
    },
  );
});
