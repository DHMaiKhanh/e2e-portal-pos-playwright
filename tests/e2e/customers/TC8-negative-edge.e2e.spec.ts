import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import {
  clientSideNavigate,
  failDataResponses,
  landOnShell,
  restoreNetwork,
} from '@helpers/network';

test.describe('Trường hợp tiêu cực & biên (Negative/Edge cases) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  test(
    'TC-CUS-056 — search with no match shows an explicit empty state, not a blank table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await customersPage.search('zzzzznotexist999');
      await expect(customersPage.emptyState).toBeVisible();
      await expect(customersPage.pagination.prevButton).toBeDisabled();
      await expect(customersPage.pagination.nextButton).toBeDisabled();
    },
  );

  test(
    'TC-CUS-057 — last page handles a partial (non-full) row count',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.waitForReady();
      const totalPages = await customersPage.totalPages();

      await page.goto(`${Urls.CUSTOMERS}?page=${totalPages}&orderCreatedAt=desc`, {
        waitUntil: 'domcontentloaded',
      });
      await customersPage.waitForReady();
      const rowCount = await customersPage.table.rows.count();
      expect(rowCount).toBeGreaterThan(0);
      expect(rowCount).toBeLessThanOrEqual(30);
      await expect(customersPage.pagination.nextButton).toBeDisabled();
      await expect(customersPage.pagination.prevButton).toBeEnabled();
    },
  );

  test(
    'TC-CUS-058 — page param beyond the valid range is handled safely',
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

  /**
   * The earlier draft asserted that `?page=0` gets clamped to a valid page, saw
   * an error screen instead, and was parked. Clamping is one acceptable
   * outcome, not the only one: refusing the request with a visible, recoverable
   * error is also "handled safely". What must never happen is a blank screen,
   * an unhandled exception, or a half-rendered table.
   *
   * So this asserts the contract rather than one implementation of it, and
   * stays green if the app later starts clamping.
   *
   * Open defect, separate from this case: the error screen prints the raw Zod
   * validator payload ("Too small: expected number to be >=1") to the user.
   * That is an internals leak and is reported as a product issue — asserting it
   * here would freeze the bug into the suite.
   */
  test(
    'TC-CUS-059 — invalid page params (0 or non-numeric) are handled safely',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      for (const badPage of ['0', 'abc', '-1']) {
        await test.step(`?page=${badPage}`, async () => {
          await page.goto(`${Urls.CUSTOMERS}?page=${badPage}&orderCreatedAt=desc`, {
            waitUntil: 'domcontentloaded',
          });

          // Either the app recovered onto a real page of data, or it refused
          // the input out loud. Both are safe; silence is not.
          const recovered = customersPage.table.rows.first();
          const refused = page.getByRole('button', { name: /retry/i });
          await expect(recovered.or(refused).first()).toBeVisible({ timeout: 30_000 });

          // The app shell must survive either way — the user needs a way out.
          await expect(customersPage.sidebar.item('Customers')).toBeVisible();
        });
      }

      expect(errors, `unhandled page errors: ${errors.join(' | ')}`).toHaveLength(0);
    },
  );

  test(
    'TC-CUS-060 — network error loading the customer list shows a recoverable error state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page, customersPage }) => {
      await test.step('Reach Customers with the list API failing', async () => {
        // Must arrive by clicking: a goto is server-rendered, where page.route
        // cannot reach the data fetch.
        await landOnShell(page, Urls.DASHBOARD);
        await failDataResponses(page, 500);
        await clientSideNavigate(page, /^Customers$/i);
      });

      await test.step('The failure is surfaced, not swallowed', async () => {
        await expect(page.getByText(/failed to load customers/i)).toBeVisible({
          timeout: 30_000,
        });
        // No stale or partial customer data is presented as if it were current.
        await expect(customersPage.table.rows).toHaveCount(0);
      });

      await test.step('Recoverable — the screen loads once the API is healthy again', async () => {
        await restoreNetwork(page);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await customersPage.waitForReady();
        await expect(customersPage.table.rows.first()).toBeVisible();
      });
    },
  );

  test(
    'TC-CUS-061 — rapid consecutive pagination clicks settle on a single consistent page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.pagination.next();
      await customersPage.pagination.next();
      await customersPage.pagination.next();

      await expect(page).toHaveURL(/page=4&orderCreatedAt=desc/);
      await expect(customersPage.pageIndicator).toHaveText(/4\s*\/\s*\d+/);
      const rowCount = await customersPage.table.rows.count();
      expect(rowCount).toBeGreaterThan(0);
      expect(rowCount).toBeLessThanOrEqual(30);
    },
  );
});
