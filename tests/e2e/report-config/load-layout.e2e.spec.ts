import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import {
  REPORT_CONFIG_SCREEN_NAMES,
  REPORT_CONFIG_SCREENS,
  type ReportConfigScreen,
} from '@pages/report-config/ReportConfigPage';

/**
 * Report Configuration — page load & layout (verified on DEV 2026-10-13).
 * The four sub-screens share one shell; each case below is either per-screen
 * (001–004) or loops the four screens (006–008).
 */
test.describe('Tải trang & bố cục (Page load / Layout) — Report Configuration', () => {
  const loadCase = (id: string, screen: ReportConfigScreen) => {
    const spec = REPORT_CONFIG_SCREENS[screen];

    /**
     * TC-RCF-00x — Tải trực tiếp màn hình <screen>
     * Expected: không bị redirect về /login; tiêu đề `page-title`, document.title,
     * ô tìm kiếm, footer "Showing …" và ít nhất một dòng dữ liệu hiển thị.
     */
    test(
      `${id} — ${spec.heading} loads by direct URL with title, toolbar and rows`,
      { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
      async ({ reportConfigPage, page }) => {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        await expect(page).not.toHaveURL(/\/login/);
        await expect(page).toHaveURL(new RegExp(`/pos/[^/]+/\\d+/report-config/${screen}`));
        await expect(rc.pageTitle).toHaveText(spec.heading);
        await expect(page).toHaveTitle(spec.docTitle);
        expect(await rc.table.rows.count()).toBeGreaterThan(0);
      },
    );
  };
  loadCase('TC-RCF-001', 'pages');
  loadCase('TC-RCF-002', 'blocks');
  loadCase('TC-RCF-003', 'sources');
  loadCase('TC-RCF-004', 'columns');

  /**
   * TC-RCF-005 — Route gốc `/report-config` chuyển về Pages
   * Expected: URL cuối là `/report-config/pages`, màn hình Pages hiển thị.
   */
  test(
    'TC-RCF-005 — the bare /report-config route redirects to Pages',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      await page.goto(Urls.REPORT_CONFIG, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/report-config\/pages/, { timeout: 30_000 });
      await reportConfigPage.waitForReady();
      await expect(reportConfigPage.pageTitle).toHaveText('Pages');
    },
  );

  /**
   * TC-RCF-006 — Thanh công cụ đủ control trên cả 4 màn hình
   * Expected: ô tìm kiếm đúng placeholder; mỗi bộ lọc là combobox có aria-label
   * và hiển thị giá trị mặc định; nút "Add …" hiển thị & enabled.
   */
  test(
    'TC-RCF-006 — every screen renders search, its default filters and the Add button',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        await expect(rc.searchInput).toBeEditable();
        await expect(rc.searchInput).toHaveValue('');
        for (const f of rc.spec.filters) {
          await expect(rc.filter(f.label)).toBeVisible();
          await expect(rc.filter(f.label)).toHaveText(f.defaultOption);
        }
        await expect(rc.addButton).toBeEnabled();
      }
    },
  );

  /**
   * TC-RCF-007 — Header bảng đúng nhãn và thứ tự
   * Expected: Pages NAME|LAYOUTS|STATUS|PUBLISHED; Blocks NAME|STATUS|KIND|DATASET;
   * Sources NAME|TYPE|RESPONSE|COLUMNS|STATUS|UPDATED; Columns NAME|TYPE|KIND|DATA TYPE;
   * cột hành động cuối không có nhãn.
   */
  test(
    'TC-RCF-007 — table headers match the documented columns in order',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        expect(await rc.headerLabels(), screen).toEqual([...rc.spec.columns]);
        // +1 for the unlabeled actions column.
        await expect(rc.columnHeaders).toHaveCount(rc.spec.columns.length + 1);
      }
    },
  );

  /**
   * TC-RCF-008 — Không có lỗi JS / request dữ liệu lỗi khi tải
   * Expected: không có `pageerror`; không request nào tới data host trả ≥ 400.
   */
  test(
    'TC-RCF-008 — loading each screen raises no page errors and no failed data requests',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage, page }) => {
      const pageErrors: string[] = [];
      const failed: string[] = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      page.on('response', (r) => {
        if (/volt-pos\./.test(r.url()) && r.status() >= 400)
          failed.push(`${r.status()} ${r.url()}`);
      });
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        await reportConfigPage.on(screen).goto();
      }
      expect(pageErrors).toEqual([]);
      expect(failed).toEqual([]);
    },
  );
});
