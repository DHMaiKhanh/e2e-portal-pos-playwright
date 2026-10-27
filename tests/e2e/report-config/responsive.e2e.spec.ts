import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { REPORT_CONFIG_SCREEN_NAMES } from '@pages/report-config/ReportConfigPage';

/**
 * 390×844 (iPhone 12-class). Verified on DEV 2026-10-13, re-verified 2026-10-26:
 * no page-level horizontal scroll (the table scrolls inside its own container),
 * the sidebar becomes a drawer, and the pagination keeps its normal
 * "1–30 of 429" footer (the old compact "1-30 of 460" form is gone). The
 * Previous/Next icon buttons now keep their aria-labels (defect D8 fixed).
 */
test.describe('Responsive 390px — Report Configuration', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /**
   * TC-RCF-130 — Không cuộn ngang trang; footer rút gọn; search & Add hiển thị
   */
  test(
    'TC-RCF-130 — at 390px no screen scrolls horizontally and the footer, search and Add stay visible',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportConfigPage, page }) => {
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        const rc = reportConfigPage.on(screen);
        await page.goto(rc.pathname, { waitUntil: 'domcontentloaded' });
        await expect(rc.searchInput).toBeVisible({ timeout: 30_000 });
        await expect(rc.table.rows.first()).toBeVisible({ timeout: 30_000 });
        const { docW, winW } = await page.evaluate(() => ({
          docW: document.documentElement.scrollWidth,
          winW: window.innerWidth,
        }));
        expect(docW, screen).toBeLessThanOrEqual(winW);
        await expect(rc.resultsFooter).toBeVisible();
        await expect(rc.addButton).toBeVisible();
      }
    },
  );

  /**
   * TC-RCF-131 — Sidebar thành drawer, vẫn có nhóm Report Configuration
   */
  test(
    'TC-RCF-131 — at 390px the sidebar is a drawer that still reaches all four screens',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportConfigPage, page }) => {
      await page.goto(reportConfigPage.pathname, { waitUntil: 'domcontentloaded' });
      await expect(reportConfigPage.searchInput).toBeVisible({ timeout: 30_000 });
      const sidebar = reportConfigPage.sidebar;
      await expect(sidebar.toggle).toBeVisible();
      await sidebar.toggle.click();
      const drawer = sidebar.mobileDrawer;
      await expect(drawer).toBeVisible();
      const group = drawer.getByRole('button', { name: 'Report Configuration', exact: true });
      await expect(group).toBeVisible();
      if ((await group.getAttribute('aria-expanded')) !== 'true') await group.click();
      await expect(drawer.locator('a[href*="/report-config/"]')).toHaveCount(4);
      await drawer.getByRole('link', { name: 'Columns', exact: true }).click();
      await expect(page).toHaveURL(/\/report-config\/columns$/);
    },
  );

  /**
   * TC-RCF-132 — Nút phân trang icon-only vẫn có accessible name (defect D8 đã sửa)
   */
  test(
    'TC-RCF-132 — at 390px the icon-only Previous/Next buttons keep their accessible names (D8 fixed)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await page.goto(rc.pathname, { waitUntil: 'domcontentloaded' });
      await expect(rc.table.rows.first()).toBeVisible({ timeout: 30_000 });
      const pager = page.locator(
        'button:has(svg.lucide-chevron-left), button:has(svg.lucide-chevron-right)',
      );
      await expect(pager).toHaveCount(2);
      // D8 (2026-10-13: no aria-label once the text was hidden) is fixed.
      await expect(rc.prevButton).toBeVisible();
      await expect(rc.nextButton).toBeVisible();
      await rc.nextButton.click();
      await expect(page).toHaveURL(/page=2/);
    },
  );
});
