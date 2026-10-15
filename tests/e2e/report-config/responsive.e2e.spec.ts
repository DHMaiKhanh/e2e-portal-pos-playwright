import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { REPORT_CONFIG_SCREEN_NAMES } from '@pages/report-config/ReportConfigPage';

/**
 * 390×844 (iPhone 12-class). Verified on DEV 2026-10-13: no page-level
 * horizontal scroll (the table scrolls inside its own container), the footer
 * switches to the compact "1-30 of 460" form, the sidebar becomes a drawer, and
 * the Previous/Next labels are `hidden sm:inline` — leaving icon-only buttons
 * with no accessible name (defect D8).
 */
test.describe('Responsive 390px — Report Configuration', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /**
   * TC-RCF-130 — Không cuộn ngang trang; footer rút gọn; search & Add hiển thị
   */
  test(
    'TC-RCF-130 — at 390px no screen scrolls horizontally and the compact footer is shown',
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
        await expect(page.getByText(/^\d+-\d+ of \d+$/)).toBeVisible();
        await expect(rc.resultsFooter).toBeHidden();
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
   * TC-RCF-132 — Nút phân trang chỉ còn icon, mất accessible name (defect D8)
   */
  test(
    'TC-RCF-132 — at 390px Previous/Next become icon-only buttons with no accessible name (defect D8)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportConfigPage, page }) => {
      const rc = reportConfigPage.on('columns');
      await page.goto(rc.pathname, { waitUntil: 'domcontentloaded' });
      await expect(rc.table.rows.first()).toBeVisible({ timeout: 30_000 });
      const pager = page.locator(
        'button:has(svg.lucide-chevron-left), button:has(svg.lucide-chevron-right)',
      );
      await expect(pager).toHaveCount(2);
      const named = await rc.nextButton.count();
      if (named === 0) {
        test.info().annotations.push({
          type: 'defect',
          description:
            'D8: at <640px the Previous/Next text is display:none and the buttons have no aria-label — screen readers announce "button"',
        });
      }
      // Still operable by pointer.
      await pager.last().click();
      await expect(page).toHaveURL(/page=2/);
    },
  );
});
