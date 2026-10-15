import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { ReportPageSlug } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import { RPT_TEXT } from '@pages/reports/ReportPagesPage';

/**
 * Reports — tiêu cực & biên (TC-RPT-087 … 092).
 */
test.describe('Reports — negative & edge', () => {
  test(
    'TC-RPT-087 — an unknown report slug shows a not-found message, not a blank page',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      test.fail(true, 'Product bug: /report-pages/does-not-exist renders a blank body with an empty document.title');
      await rp.open('does-not-exist');
      await expect(page.getByText(/not found|does not exist|no report|404/i).first()).toBeVisible({
        timeout: Timeouts.LONG,
      });
      await expect(page).not.toHaveTitle('');
    },
  );

  test(
    'TC-RPT-088 — a non-date after/before falls back to the default date instead of an error screen',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      test.fail(true, 'Product bug: after=garbage shows "This merchant is not available. Invalid time value"');
      await rp.open(ReportPageSlug.DAILY_SALE, { after: 'garbage', before: 'garbage' });
      await rp.waitForData();
      await expect(rp.reportDateButton).toBeVisible();
      await expect(rp.merchantUnavailable).toHaveCount(0);
    },
  );

  test(
    'TC-RPT-089 — an impossible calendar date (2026-13-45) is rejected, never labelled "Invalid Date"',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      test.fail(true, 'Product bug: trigger reads "Invalid Date - <before>" and the table renders blank');
      await rp.open(ReportPageSlug.STAFF_INCOME, { after: '2026-13-45', before: '2026-10-13' });
      await expect(rp.dateRangeButton).toBeVisible({ timeout: Timeouts.LONG });
      await expect(page.getByText(/Invalid Date/)).toHaveCount(0, { timeout: Timeouts.SHORT });
    },
  );

  test(
    'TC-RPT-090 — a long-past day (2020-01-01) renders a clean zero state',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp }) => {
      await rp.openWithData(ReportPageSlug.DAILY_SALE, { after: '2020-01-01', before: '2020-01-01' });
      await expect(rp.reportDateButton).toHaveText('Jan 1, 2020');
      await expect(rp.emptyRow).toBeVisible();
      await expect(rp.resultsFooter).toHaveText('Showing 0 to 0 of 0 results');
    },
  );

  test(
    'TC-RPT-091 — an XSS payload in the staff search is inert and treated as text',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      let dialogs = 0;
      page.on('dialog', async (d) => {
        dialogs++;
        await d.dismiss();
      });
      await rp.openWithData(ReportPageSlug.STAFF_INCOME);
      const payload = '<img src=x onerror=alert(1)>';
      await rp.staffSearch.fill(payload);
      await expect(page).toHaveURL(/[?&]search=/);
      await expect(rp.emptyRow).toBeVisible({ timeout: Timeouts.MEDIUM });
      await expect(rp.staffSearch).toHaveValue(payload);
      expect(await page.locator('img[src="x"]').count()).toBe(0);
      expect(dialogs).toBe(0);
    },
  );

  test(
    'TC-RPT-092 — a 200-char search with special characters does not break the page',
    { tag: [Tag.REGRESSION] },
    async ({ reportPagesPage: rp, page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await rp.openWithData(ReportPageSlug.STAFF_PAYROLL);
      const term = `%_'"\\;--${'a'.repeat(190)}`;
      await rp.staffSearch.fill(term);
      await expect(rp.emptyRow).toBeVisible({ timeout: Timeouts.MEDIUM });
      await expect(rp.pageTitle).toHaveText('Staff Payroll');
      expect(await page.getByText(RPT_TEXT.MERCHANT_UNAVAILABLE).count()).toBe(0);
      expect(errors).toEqual([]);
    },
  );
});
