import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { env } from '@configs/env/loadEnv';

test.describe('Page load & layout — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
  });

  test(
    'TC-PAY-001 — lands on payroll with Checks tab active by default',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ payrollPage, page }) => {
      await payrollPage.waitForReady();
      await expect(page).toHaveURL(/\/pos\/\d+\/payroll(\?.*tab=checks.*)?$/);
      await expect(payrollPage.pageHeading).toBeVisible();
      await expect(payrollPage.checksTab).toBeVisible();
      await expect(page.getByRole('table').first()).toBeVisible();
    },
  );

  test(
    'TC-PAY-002 — all layout regions render on initial load',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, dashboardPage }) => {
      await payrollPage.waitForReady();
      await expect(dashboardPage.sidebar.item('Payroll')).toBeVisible();
      await expect(payrollPage.pageHeading).toBeVisible();
      await expect(payrollPage.checksTab).toBeVisible();
      await expect(payrollPage.quickBookTab).toBeVisible();
      await expect(payrollPage.staffPayrollTab).toBeVisible();
      await expect(payrollPage.bankAccountsTab).toBeVisible();
      await expect(payrollPage.checkHistoryTab).toBeVisible();
      await expect(payrollPage.page.getByRole('table').first()).toBeVisible();
      await expect(payrollPage.paginationSummary).toBeVisible();
    },
  );

  test(
    'TC-PAY-003 — deep link directly into a non-default tab',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await payrollPage.gotoTab('bank-account');
      await payrollPage.waitForReady();
      await expect(page).toHaveURL(/tab=bank-account/);
      await expect(payrollPage.bankAccountsTab).toBeVisible();
      await expect(page.getByRole('table').first()).toBeVisible();
    },
  );

  test(
    'TC-PAY-004 — reloading the page preserves the active tab and filters',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await payrollPage.gotoTab('history');
      await payrollPage.waitForReady();
      await expect(page).toHaveURL(/tab=history/);

      await page.reload();
      await payrollPage.waitForReady();
      await expect(page).toHaveURL(/tab=history/);
      await expect(payrollPage.checkHistoryTab).toBeVisible();
    },
  );

  test(
    'TC-PAY-005 — unauthenticated access redirects to login',
    { tag: [Tag.REGRESSION, Tag.AUTH] },
    async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined, baseURL: env.BASE_URL });
      const page = await context.newPage();
      try {
        await page.goto(`/pos/${env.STORE_ID}/payroll`, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/login/);
        await expect(page.getByText(/payroll/i)).toHaveCount(0);
      } finally {
        await context.close();
      }
    },
  );
});
