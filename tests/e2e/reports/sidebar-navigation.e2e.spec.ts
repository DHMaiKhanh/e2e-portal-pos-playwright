import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug, Urls, reportPageUrl } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { RPT_DATA_PAGES, RPT_PAGES, rptPage, rptUrlPattern } from '@pages/reports/ReportPagesPage';

/**
 * Reports — sidebar & điều hướng (TC-RPT-009 … 015). docs/test-cases/reports.md
 */
test.describe('Reports — sidebar navigation', () => {
  test.beforeEach(async ({ page, reportPagesPage: rp }) => {
    await page.goto(Urls.DASHBOARD, { waitUntil: 'domcontentloaded' });
    await rp.waitForShell();
  });

  test(
    'TC-RPT-009 — the Reports group is collapsed by default outside the reports',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await expect(rp.reportsGroupButton).toBeVisible();
      await expect(rp.reportsGroupButton).toHaveAttribute('aria-expanded', 'false');
      await expect(rp.reportLinks.filter({ visible: true })).toHaveCount(0);
    },
  );

  test(
    'TC-RPT-010 — expanding Reports lists the report links in order with store-scoped hrefs',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await rp.expandReportsGroup();
      // The link set is Report-Configuration driven: the four data reports are
      // required, the Demo page is optional (it was unpublished from the sidebar
      // on DEV mid-run on 2026-10-13). Order must follow RPT_PAGES either way.
      await expect(rp.reportLinks.first()).toBeVisible();
      const labels = (await rp.reportLinks.allTextContents()).map((t) => t.trim());
      for (const spec of RPT_DATA_PAGES) expect(labels, spec.label).toContain(spec.label);
      const known = RPT_PAGES.map((p) => p.label).filter((l) => labels.includes(l));
      expect(labels.filter((l) => known.includes(l))).toEqual(known);
      for (const spec of RPT_PAGES.filter((p) => labels.includes(p.label))) {
        await expect(rp.reportLink(spec.label)).toHaveAttribute('href', reportPageUrl(spec.slug));
      }
    },
  );

  test(
    'TC-RPT-011 — each report link navigates to its report',
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      test.setTimeout(150_000);
      await rp.expandReportsGroup();
      await expect(rp.reportLinks.first()).toBeVisible();
      const labels = (await rp.reportLinks.allTextContents()).map((t) => t.trim());
      for (const spec of RPT_PAGES.filter((p) => labels.includes(p.label))) {
        await rp.reportLink(spec.label).click();
        await expect(page).toHaveURL(rptUrlPattern(spec.slug), { timeout: Timeouts.LONG });
        await expect(page).toHaveTitle(spec.title, { timeout: Timeouts.LONG });
        await expect(rp.pageTitle).toHaveText(spec.label, { timeout: Timeouts.LONG });
      }
    },
  );

  test(
    'TC-RPT-012 — the open report link is marked current and its group auto-expands',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      const spec = rptPage(ReportPageSlug.STAFF_INCOME);
      await rp.open(spec.slug);
      await expect(rp.reportsGroupButton).toHaveAttribute('aria-expanded', 'true');
      await expect(rp.reportLink(spec.label)).toHaveAttribute('aria-current', 'page');
      await expect(rp.reportLink('Daily Sale Report')).not.toHaveAttribute('aria-current', 'page');
    },
  );

  test(
    'TC-RPT-013 — collapsing Reports hides its links again',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      await rp.expandReportsGroup();
      await expect(rp.reportLinks.first()).toBeVisible();
      expect(await rp.reportLinks.filter({ visible: true }).count()).toBeGreaterThanOrEqual(RPT_DATA_PAGES.length);
      await rp.reportsGroupButton.click();
      await expect(rp.reportsGroupButton).toHaveAttribute('aria-expanded', 'false');
      await expect(rp.reportLinks.filter({ visible: true })).toHaveCount(0);
    },
  );

  test(
    "TC-RPT-014 — Overview's Today's Summary 'View All' opens Income Summary",
    { tag: [Tag.REGRESSION, Tag.SMOKE] },
    async ({ reportPagesPage: rp, page }) => {
      const viewAll = page
        .getByRole('link', { name: 'View All' })
        .and(page.locator(`a[href="${reportPageUrl(ReportPageSlug.INCOME_SUMMARY)}"]`));
      await expect(viewAll).toBeVisible({ timeout: Timeouts.LONG });
      await viewAll.click();
      await expect(page).toHaveURL(rptUrlPattern(ReportPageSlug.INCOME_SUMMARY), { timeout: Timeouts.LONG });
      await expect(rp.pageTitle).toHaveText('Income Summary', { timeout: Timeouts.LONG });
    },
  );

  test(
    'TC-RPT-015 — the legacy screen is labelled "Income Reports (Legacy)" and still links to /income',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp }) => {
      const legacy = rp.sidebar.item('Income Reports (Legacy)');
      await expect(legacy).toBeVisible();
      await expect(legacy).toHaveAttribute('href', Urls.INCOME);
    },
  );
});
