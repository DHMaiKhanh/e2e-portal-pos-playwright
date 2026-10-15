import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug, Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { RPT_DATA_PAGES, rptUrlPattern } from '@pages/reports/ReportPagesPage';

/**
 * Reports — responsive (TC-RPT-093 … 095). Viewport overrides get a dedicated
 * context (see reuseContext.fixture.ts).
 */
test.describe('Reports — responsive @ 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test(
    'TC-RPT-093 — no horizontal page scroll and Export stays reachable on every report',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportPagesPage: rp, page }) => {
      test.setTimeout(180_000);
      for (const spec of RPT_DATA_PAGES) {
        await rp.openWithData(spec.slug);
        const [scrollW, innerW] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        expect(scrollW, spec.slug).toBeLessThanOrEqual(innerW);
        await expect(rp.exportButton).toBeVisible();
        await expect(rp.pageTitle).toBeVisible();
      }
    },
  );

  test(
    'TC-RPT-094 — the mobile drawer exposes the Reports group and navigates to a report',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportPagesPage: rp, page }) => {
      await page.goto(Urls.DASHBOARD, { waitUntil: 'domcontentloaded' });
      await expect(rp.sidebar.toggle).toBeVisible({ timeout: Timeouts.LONG });
      await rp.sidebar.toggle.click();
      await expect(rp.sidebar.mobileDrawer).toBeVisible();
      await rp.expandReportsGroup();
      await rp.reportLink('Staff Payroll').click();
      await expect(page).toHaveURL(rptUrlPattern(ReportPageSlug.STAFF_PAYROLL), { timeout: Timeouts.LONG });
      await expect(rp.pageTitle).toHaveText('Staff Payroll', { timeout: Timeouts.LONG });
    },
  );
});

test.describe('Reports — responsive @ 768px', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test(
    'TC-RPT-095 — tablet: Income Summary table and side panel render without page overflow',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ reportPagesPage: rp, page }) => {
      await rp.openWithData(ReportPageSlug.INCOME_SUMMARY);
      await expect(rp.table).toBeVisible();
      await expect(rp.noRowSelected).toBeVisible();
      const [scrollW, innerW] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(scrollW).toBeLessThanOrEqual(innerW);
    },
  );
});
