import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug, Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { landOnShell, clientSideNavigate, failDataResponses, skeletons } from '@helpers/network';
import {
  RPT_COLUMNS,
  RPT_DEMO_TABS,
  RPT_PAGES,
  RPT_TEXT,
  rptPage,
  rptUrlPattern,
} from '@pages/reports/ReportPagesPage';

/**
 * Reports — tải trang & bố cục (TC-RPT-001 … 008). docs/test-cases/reports.md
 */
test.describe('Reports — page load & layout', () => {
  test(
    'TC-RPT-001 — Daily Sale Report loads with title, controls and data footer',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      const spec = rptPage(ReportPageSlug.DAILY_SALE);
      await rp.open(spec.slug);
      await expect(page).toHaveURL(rptUrlPattern(spec.slug));
      await expect(page).toHaveTitle(spec.title);
      await expect(rp.pageTitle).toHaveText(spec.label);
      await expect(rp.reportDateButton).toBeVisible();
      await expect(rp.exportButton).toBeVisible();
      await expect(page.getByText('Daily Summary', { exact: true })).toBeVisible();
      await expect(page.getByText(/ by Hour$/).first()).toBeVisible();
      await rp.waitForData();
    },
  );

  test(
    'TC-RPT-002 — Income Summary loads with range picker, period combobox, chart and table',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      const spec = rptPage(ReportPageSlug.INCOME_SUMMARY);
      await rp.open(spec.slug);
      await expect(page).toHaveTitle(spec.title);
      await expect(rp.pageTitle).toHaveText(spec.label);
      await expect(rp.dateRangeButton).toBeVisible();
      await expect(rp.periodCombobox).toHaveText('Day');
      await expect(page.getByText('Total Income Table', { exact: true })).toBeVisible();
      await rp.waitForData();
      expect((await rp.headerLabels()).map((h) => h.toLowerCase())).toEqual(
        RPT_COLUMNS.incomeSummary.map((h) => h.toLowerCase()),
      );
    },
  );

  test(
    'TC-RPT-003 — Staff Income loads with search, switch, Print and Staff Summary',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      const spec = rptPage(ReportPageSlug.STAFF_INCOME);
      await rp.open(spec.slug);
      await expect(page).toHaveTitle(spec.title);
      await expect(rp.pageTitle).toHaveText(spec.label);
      await expect(rp.printButton).toBeVisible();
      await expect(rp.staffSearch).toHaveAttribute('placeholder', RPT_TEXT.STAFF_INCOME_SEARCH);
      await expect(rp.noIncomeSwitch).toBeVisible();
      await expect(rp.staffSummaryTrigger).toBeVisible();
      await rp.waitForData();
    },
  );

  test(
    'TC-RPT-004 — Staff Payroll loads and pins the current period_id into the URL',
    { tag: [Tag.REGRESSION, Tag.SMOKE, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      const spec = rptPage(ReportPageSlug.STAFF_PAYROLL);
      await rp.open(spec.slug);
      await expect(page).toHaveTitle(spec.title);
      await expect(rp.pageTitle).toHaveText(spec.label);
      await expect(page).toHaveURL(/[?&]period_id=[0-9a-f-]{36}/, { timeout: Timeouts.LONG });
      await expect(rp.payrollPeriodCombobox).toBeVisible();
      await expect(rp.staffSearch).toHaveAttribute('placeholder', RPT_TEXT.STAFF_PAYROLL_SEARCH);
      await rp.waitForData();
    },
  );

  test(
    'TC-RPT-005 — Demo DS Report loads with its four tabs',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportPagesPage: rp, page }) => {
      const spec = rptPage(ReportPageSlug.DEMO_DS);
      await rp.open(spec.slug);
      await expect(page).toHaveTitle(spec.title);
      await expect(rp.pageTitle).toHaveText(spec.label);
      await expect(rp.tabs).toHaveText([...RPT_DEMO_TABS]);
    },
  );

  test(
    'TC-RPT-006 — no uncaught JS error while loading every report page',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const spec of RPT_PAGES) {
        await rp.open(spec.slug);
        await expect(rp.pageTitle).toHaveText(spec.label, { timeout: Timeouts.LONG });
        if (spec.slug !== ReportPageSlug.DEMO_DS) await rp.waitForData();
      }
      expect(errors).toEqual([]);
    },
  );

  test(
    'TC-RPT-007 — /report-pages without a slug redirects to Overview',
    { tag: [Tag.REGRESSION] },
    async ({ page }) => {
      await page.goto(Urls.REPORT_PAGES, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/pos\/[\w-]+\/\d+\/overview/, { timeout: Timeouts.LONG });
    },
  );

  test(
    'TC-RPT-008 — a failing report API shows an error state instead of endless skeletons',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      // Product bug observed 2026-10-13: with report_pages/report_blocks at 500
      // the body stays on grey skeletons forever and no message is rendered.
      test.fail(true, 'Product bug: report API 500 leaves endless skeletons, no error message');
      await landOnShell(page, Urls.DASHBOARD);
      await page.getByRole('button', { name: 'Reports', exact: true }).click();
      await failDataResponses(page, 500, /report_(pages|blocks)\//);
      await clientSideNavigate(page, /^Income Summary$/);
      await expect(page).toHaveURL(rptUrlPattern(ReportPageSlug.INCOME_SUMMARY));
      await expect(page.getByText(/error|something went wrong|try again|failed/i).first()).toBeVisible({
        timeout: Timeouts.MEDIUM,
      });
      await expect(skeletons(page)).toHaveCount(0);
    },
  );
});
