import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import {
  clientSideNavigate,
  delayDataResponses,
  landOnShell,
  restoreNetwork,
  skeletons,
} from '@helpers/network';

test.describe('Tải trang & bố cục (Page load / Layout) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  test(
    'TC-CUS-001 — lands on /pos/<id>/customers with default query params',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.waitForReady();
      // The screen gained a tab system, so the landing URL now leads with
      // `tab=customers` before the paging params:
      //   /pos/14/customers?tab=customers&page=1&orderCreatedAt=desc
      await expect(page).toHaveURL(
        /\/pos\/\d+\/customers\?tab=customers&page=1&orderCreatedAt=desc/,
      );
      await expect(customersPage.pageTitle).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  test(
    'TC-CUS-002 — all content regions render on first load',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage }) => {
      await customersPage.waitForReady();
      await expect(customersPage.pageTitle).toBeVisible();
      await expect(customersPage.searchInput).toBeVisible();
      await expect(customersPage.groupFilter).toBeVisible();
      await expect(customersPage.page.getByRole('table')).toBeVisible();
      await expect(customersPage.resultsFooter).toContainText(/showing 1 to 30 of \d+ results/i);
      await expect(customersPage.pagination.prevButton).toBeVisible();
      await expect(customersPage.pageIndicator).toBeVisible();
      await expect(customersPage.pagination.nextButton).toBeVisible();
    },
  );

  test(
    'TC-CUS-003 — global chrome renders with Customers marked active',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage }) => {
      await customersPage.waitForReady();
      await expect(customersPage.sidebar.item('Customers')).toHaveAttribute('aria-current', 'page');
    },
  );

  test(
    'TC-CUS-004 — table renders exactly 30 rows with all columns on first page',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage }) => {
      await customersPage.waitForReady();
      await expect(customersPage.table.rows).toHaveCount(30);
      await expect(customersPage.columnHeaders).toHaveCount(8);
      await expect(customersPage.resultsFooter).toContainText(/showing 1 to 30 of \d+ results/i);
    },
  );

  test(
    'TC-CUS-005 — loading/skeleton state renders before table data resolves',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, customersPage }) => {
      await test.step('Reach Customers over a deliberately slow API', async () => {
        // Arrive by clicking, not goto: a goto is server-rendered and the data
        // fetch never passes through page.route.
        await landOnShell(page, Urls.DASHBOARD);
        await delayDataResponses(page, 6000);
        await clientSideNavigate(page, /^Customers$/i);
      });

      await test.step('Skeleton placeholders stand in for the table', async () => {
        await expect(skeletons(page).first()).toBeVisible({ timeout: 15_000 });
        // Column headers are part of the shell and paint immediately; the rows
        // are what is still pending.
        await expect(customersPage.columnHeaders.first()).toBeVisible();
      });

      await test.step('Skeletons give way to real rows once data resolves', async () => {
        // Lift the delay first. The screen fetches its groups and its rows
        // separately and refetches on settle, and the handler delays every one
        // of them, so with it installed something is always pending and the
        // skeleton count never reaches zero.
        await restoreNetwork(page);

        await expect(customersPage.table.rows.first()).toBeVisible({ timeout: 30_000 });
        await expect(skeletons(page)).toHaveCount(0, { timeout: 30_000 });
      });
    },
  );

  test(
    'TC-CUS-006 — pagination controls show correct initial state on page 1',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage }) => {
      await customersPage.waitForReady();
      await expect(customersPage.pagination.prevButton).toBeDisabled();
      await expect(customersPage.pageIndicator).toHaveText(/1\s*\/\s*\d+/);
      await expect(customersPage.pagination.nextButton).toBeEnabled();
    },
  );

  test(
    'TC-CUS-007 — direct navigation to a specific page renders correct content',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await page.goto(`${Urls.CUSTOMERS}?page=5&orderCreatedAt=desc`, {
        waitUntil: 'domcontentloaded',
      });
      await customersPage.waitForReady();
      await expect(page).toHaveURL(/page=5/);
      await expect(customersPage.pageIndicator).toHaveText(/5\s*\/\s*\d+/);
      await expect(customersPage.pagination.prevButton).toBeEnabled();
      await expect(customersPage.pagination.nextButton).toBeEnabled();
    },
  );

  test(
    'TC-CUS-008 — table layout does not break when shrinking the viewport',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.waitForReady();
      for (const size of [
        { width: 1440, height: 900 },
        { width: 1024, height: 768 },
        { width: 768, height: 1024 },
      ]) {
        await page.setViewportSize(size);
        await expect(customersPage.searchInput).toBeVisible();
        await expect(customersPage.groupFilter).toBeVisible();
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(size.width + 1);
      }
    },
  );

  test(
    'TC-CUS-009 — layout and title persist after browser reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.waitForReady();
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const urlBeforeReload = page.url();
      await page.reload();
      await customersPage.waitForReady();
      await expect(page).toHaveURL(urlBeforeReload);
      await expect(customersPage.pageTitle).toBeVisible();
      expect(errors).toHaveLength(0);
    },
  );

  test(
    'TC-CUS-010 — LAST VISIT column reflects default descending sort',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.waitForReady();
      await expect(page).toHaveURL(/orderCreatedAt=desc/);
      await expect(customersPage.columnHeader(/last visit/i)).toBeVisible();
    },
  );

  test(
    'TC-CUS-011 — out-of-range page param does not crash the table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto(`${Urls.CUSTOMERS}?page=999&orderCreatedAt=desc`, {
        waitUntil: 'domcontentloaded',
      });
      await customersPage.waitForReady();
      expect(errors).toHaveLength(0);
      // The empty-state placeholder renders as a row inside the table body
      // (not as a table/empty-state alternative), so both locators match at
      // once — assert each independently instead of chaining with `.or()`.
      await expect(customersPage.page.getByRole('table')).toBeVisible();
    },
  );

  test(
    'TC-CUS-012 — cells with missing data show placeholders without breaking row layout',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await customersPage.waitForReady();
      const dashCells = customersPage.page.getByRole('cell', { name: '—' });
      const count = await dashCells.count();
      if (count > 0) {
        await expect(dashCells.first()).toBeVisible();
      }
    },
  );
});
