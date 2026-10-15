import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import {
  REPORT_CONFIG_LINKS,
  REPORT_CONFIG_SCREEN_NAMES,
  REPORT_CONFIG_SCREENS,
} from '@pages/report-config/ReportConfigPage';

/**
 * Sidebar: "Report Configuration" is a Radix collapsible (`data-slot=
 * "collapsible-trigger"`) under Management. Collapsed on other screens,
 * auto-expanded on any /report-config/* route. Active link carries
 * `data-active="true"` + `aria-current="page"` (verified 2026-10-13).
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
      await expect(group).toHaveAttribute('aria-expanded', 'false');
      await expect(reportConfigPage.sidebarLink('pages')).toBeHidden();

      await group.click();
      await expect(group).toHaveAttribute('aria-expanded', 'true');

      const hrefs: string[] = [];
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        const link = page.getByRole('link', { name: REPORT_CONFIG_LINKS[screen], exact: true });
        await expect(link).toBeVisible();
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
      for (const screen of ['blocks', 'sources', 'columns', 'pages'] as const) {
        await page.getByRole('link', { name: REPORT_CONFIG_LINKS[screen], exact: true }).click();
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
      await expect(rc.sidebarLink('blocks')).toHaveAttribute('data-active', 'true');
      await expect(rc.sidebarLink('blocks')).toHaveAttribute('aria-current', 'page');
      for (const other of ['pages', 'sources', 'columns'] as const) {
        await expect(rc.sidebarLink(other)).toHaveAttribute('data-active', 'false');
        await expect(rc.sidebarLink(other)).not.toHaveAttribute('aria-current', 'page');
      }
      // Collapsing is still possible while on a sub-route.
      await rc.sidebarGroup.click();
      await expect(rc.sidebarGroup).toHaveAttribute('aria-expanded', 'false');
      await expect(rc.sidebarLink('blocks')).toBeHidden();
    },
  );
});
