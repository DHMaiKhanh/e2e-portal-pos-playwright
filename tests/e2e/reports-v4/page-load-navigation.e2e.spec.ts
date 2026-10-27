import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportV4Slug, reportV4Url } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { RV4_DATA_DAY, RV4_PAGES, RV4_TEXT, rv4UrlPattern } from '@pages/reports-v4/ReportsV4Page';
import { env } from '@configs/env/loadEnv';

/**
 * Reports V4 › A. Tải trang & điều hướng (RV4-A01 … A10) — docs/test-cases/reports-v4.md
 */
test.describe('Reports V4 › page load & navigation', () => {
  test(
    'RV4-A01 — Daily Sale opens with V4 heading, Today date, chart, table and summary',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(ReportV4Slug.DAILY_SALE);
      await expect(rp.heading).toContainText('Daily Sale Report');
      await expect(rp.v4Badge).toHaveText('V4');
      await expect(page).toHaveTitle('Daily Sale Report | Portal');
      await expect(rp.reportDateButton).toHaveText('Today');
      await expect(rp.statTiles).toHaveCount(4);
      await expect(page.locator('#pos-main').getByText('Daily Summary')).toBeVisible();
    },
  );

  test(
    'RV4-A02 — Income Summary opens on Today grouped by Day',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(ReportV4Slug.INCOME_SUMMARY);
      await expect(rp.heading).toContainText('Income Summary');
      await expect(page).toHaveTitle('Income Summary | Portal');
      await expect(rp.dateRangeButton).toHaveText('Today');
      await expect(rp.groupByChip).toHaveAttribute('aria-label', 'Period and date window: Day');
    },
  );

  test(
    'RV4-A03 — Staff Income opens with KPIs, By Staff table and a Total row',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(ReportV4Slug.STAFF_INCOME);
      await expect(rp.heading).toContainText('Staff Income');
      await expect(page).toHaveTitle('Staff Income | Portal');
      await expect(page.locator('#pos-main').getByText('By Staff', { exact: true })).toBeVisible();
      await expect(rp.noIncomeSwitch).toHaveAttribute('aria-checked', 'false');
    },
  );

  test(
    'RV4-A04 — Staff Payroll pins the current period_id and flags it as Live',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.openWithData(ReportV4Slug.STAFF_PAYROLL);
      await expect(page).toHaveURL(/[?&]period_id=[\w-]+/);
      await expect(rp.heading).toContainText('Staff Payroll');
      await expect(page.getByText(RV4_TEXT.ESTIMATED)).toBeVisible();
    },
  );

  test(
    'RV4-A05 — sidebar Reports V4 lists exactly the four pages and highlights the current one',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportsV4Page: rp, page }) => {
      await rp.open(ReportV4Slug.INCOME_SUMMARY);
      await rp.expandReportsV4Group();
      for (const p of RV4_PAGES) {
        await expect(rp.reportLink(p.label)).toHaveAttribute('href', rv4UrlPattern(p.slug));
      }
      await expect(
        page.locator(`a[href$="/v4/reports/${ReportV4Slug.STAFF_INCOME_DETAIL}"]`),
      ).toHaveCount(0);
      await rp.reportLink('Staff Payroll').click();
      await expect(page).toHaveURL(rv4UrlPattern(ReportV4Slug.STAFF_PAYROLL));
      await expect(rp.heading).toContainText('Staff Payroll', { timeout: Timeouts.LONG });
    },
  );

  for (const p of RV4_PAGES) {
    test(
      `RV4-A06 — "Open in legacy" on ${p.label} points to /report-pages/${p.slug}`,
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ reportsV4Page: rp }) => {
        await rp.open(p.slug);
        await expect(rp.legacyLink).toHaveAttribute('href', new RegExp(`/report-pages/${p.slug}$`));
      },
    );
  }

  test(
    'RV4-A07 — an unknown slug shows a not-found state, not a loading failure',
    { tag: [Tag.REGRESSION] },
    async ({ reportsV4Page: rp, page }) => {
      // BUG — stays red until fixed: Product bug: /v4/reports/<unknown> says "Unable to load reports … a loading failure"
      await rp.open('not-a-slug');
      await expect(page.getByText(RV4_TEXT.LOAD_FAILURE)).toBeHidden();
      await expect(page.getByText(/not found|doesn.t exist|no such report/i).first()).toBeVisible();
    },
  );

  test(
    'RV4-A08 — without a session the page redirects to /login and keeps the target',
    { tag: [Tag.REGRESSION, Tag.AUTH] },
    async ({ browser, baseURL }) => {
      const ctx = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
      const page = await ctx.newPage();
      try {
        await page.goto(reportV4Url(ReportV4Slug.DAILY_SALE), { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/login\?redirect=.*v4%2Freports%2Fdaily-sale-report/, {
          timeout: Timeouts.LONG,
        });
      } finally {
        await ctx.close();
      }
    },
  );

  test(
    'RV4-A09 — without a session the V4 report API serves nothing (401 on menu, layout and rows)',
    { tag: [Tag.REGRESSION, Tag.AUTH] },
    async ({ playwright }) => {
      // No merchant-scoped account exists for this suite (it runs as a DEV internal admin who can
      // open every merchant), so access control is asserted at the API boundary instead.
      const anon = await playwright.request.newContext({ baseURL: env.API_URL });
      try {
        for (const path of [
          '/v4/report_pages/menu?layout=web',
          `/v4/report_pages/${ReportV4Slug.DAILY_SALE}/layout`,
          `/v4/report_blocks/income-daily-sale/rows?after=${RV4_DATA_DAY}&before=${RV4_DATA_DAY}`,
        ]) {
          const res = await anon.get(path, {
            headers: { 'x-merch-id': env.STORE_ID },
            failOnStatusCode: false,
          });
          expect(res.status(), path).toBe(401);
          expect(await res.text(), path).not.toMatch(/OD\d{6}-|"rows"/);
        }
      } finally {
        await anon.dispose();
      }
    },
  );
});
