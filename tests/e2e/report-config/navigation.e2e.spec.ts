import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import {
  REPORT_CONFIG_LINKS,
  REPORT_CONFIG_SCREEN_NAMES,
  REPORT_CONFIG_SCREENS,
} from '@pages/report-config/ReportConfigPage';

/**
 * Sidebar (`navigation "Main"`): "Report Configuration" is an accordion button
 * (`data-slot="pos-nav-item"`, aria-expanded) under Management. Collapsed on
 * other screens, auto-expanded on any /report-config/* route. Active link carries
 * `data-on="true"` + `aria-current="page"` (verified 2026-10-20). The screens
 * also have an in-page `navigation "Report configuration"` tab strip with the
 * same link names, so every sidebar lookup is scoped to `navigation "Main"`.
 */
test.describe('Điều hướng sidebar (Navigation) — Report Configuration', () => {
  /**
   * TC-RCF-010 — Nhóm accordion mở ra 4 link đúng thứ tự & href store-scoped
   */
  test(
    'TC-RCF-010 — the Report Configuration accordion expands to Pages, Blocks, Sources, Columns',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      await page.goto(Urls.DASHBOARD, { waitUntil: 'domcontentloaded' });
      const group = reportConfigPage.sidebarGroup;
      await expect(group).toBeVisible({ timeout: 30_000 });
      // The open state is remembered across pages, so normalise it first.
      await reportConfigPage.setSidebarGroupExpanded(false);
      await reportConfigPage.setSidebarGroupExpanded(true);

      const hrefs: string[] = [];
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        const link = reportConfigPage.sidebarLink(screen);
        await expect(link).toBeVisible();
        await expect(link).toHaveText(REPORT_CONFIG_LINKS[screen]);
        hrefs.push((await link.getAttribute('href')) ?? '');
      }
      expect(hrefs).toEqual(REPORT_CONFIG_SCREEN_NAMES.map((s) => REPORT_CONFIG_SCREENS[s].path));
      for (const h of hrefs) expect(h).toMatch(/^\/pos\/[a-z]+\/\d+\/report-config\/[a-z]+$/);
    },
  );

  /**
   * TC-RCF-011 — Click từng link điều hướng (client-side) tới đúng màn hình
   */
  test(
    'TC-RCF-011 — clicking each sidebar link opens that sub-screen',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ reportConfigPage, page }) => {
      await reportConfigPage.goto();
      await reportConfigPage.setSidebarGroupExpanded(true);
      for (const screen of ['blocks', 'sources', 'columns', 'pages'] as const) {
        await expect(reportConfigPage.sidebarLink(screen)).toHaveText(REPORT_CONFIG_LINKS[screen]);
        await reportConfigPage.sidebarLink(screen).click();
        const rc = reportConfigPage.on(screen);
        await expect(page).toHaveURL(new RegExp(`/report-config/${screen}$`));
        await rc.waitForReady();
        await expect(rc.pageTitle).toHaveText(rc.spec.heading);
      }
    },
  );

  /**
   * TC-RCF-012 — Link đang active được đánh dấu; nhóm tự mở trên sub-route
   */
  test(
    'TC-RCF-012 — the current sub-screen link is marked active and the group is expanded',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      const rc = reportConfigPage.on('blocks');
      await rc.goto();
      await expect(rc.sidebarGroup).toHaveAttribute('aria-expanded', 'true');
      await expect(rc.sidebarLink('blocks')).toHaveAttribute('data-on', 'true');
      await expect(rc.sidebarLink('blocks')).toHaveAttribute('aria-current', 'page');
      for (const other of ['pages', 'sources', 'columns'] as const) {
        await expect(rc.sidebarLink(other)).toHaveAttribute('data-on', 'false');
        await expect(rc.sidebarLink(other)).not.toHaveAttribute('aria-current', 'page');
      }
      // Collapsing is still possible while on a sub-route.
      await rc.setSidebarGroupExpanded(false);
    },
  );
});
