import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { CustomersPage } from '@pages/customers/CustomersPage';

test.describe('Hành động chính (Core actions) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  test(
    'TC-CUS-020 — opening the Group filter and selecting a group filters the table',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.openGroupFilter();
      const options = page.getByRole('option');
      // The store defines customer groups, so an empty list is a failure of the
      // filter rather than a reason to skip — which is what this used to do.
      await expect(options.first()).toBeVisible();
      expect(await options.count()).toBeGreaterThan(1);

      // Pinned to "Rich" — a store-100004 group that has members on DEV
      // (verified 2026-10-20: 2 customers). The first option ("VIP") is empty,
      // which would only exercise the empty state.
      const groupName = 'Rich';
      await page.getByRole('option', { name: groupName, exact: true }).click();

      await expect(customersPage.groupFilterButtonWithLabel(groupName)).toBeVisible();
      await expect(page).toHaveURL(/[?&]group=/);
      await expect(customersPage.pageIndicator).toHaveText(/1\s*\/\s*\d+/);
      const rows = customersPage.table.rows;
      await expect(rows.first()).toBeVisible();
      // Every remaining row belongs to the picked group. Poll: the filtered
      // page replaces the unfiltered one only after its own fetch settles.
      await expect
        .poll(async () =>
          (await customersPage.rowCells()).every((cells) =>
            cells[CustomersPage.Column.GROUP].split(/,\s*/).includes(groupName),
          ),
        )
        .toBe(true);
    },
  );

  test(
    'TC-CUS-021 — resetting Group filter to "All Groups" restores full dataset',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.openGroupFilter();
      const options = page.getByRole('option');
      await expect(options.first()).toBeVisible();
      expect(await options.count()).toBeGreaterThan(1);

      const firstOption = options.first();
      const groupName = (await firstOption.textContent())?.trim() ?? '';
      await firstOption.click();
      await expect(customersPage.groupFilterButtonWithLabel(groupName)).toBeVisible();

      // The old "All Groups" option is gone: the chip now carries its own
      // "Clear group filter" (x) control.
      await customersPage.clearGroupButton.click();

      await expect(customersPage.groupFilter).toHaveAccessibleName('Group');
      await expect(page).not.toHaveURL(/[?&]group=/);
      await expect(customersPage.pageIndicator).toHaveText(/1\s*\/\s*\d+/);
      await expect(customersPage.resultsFooter).toContainText(/^1–30 of [\d,]+$/);
    },
  );

  test(
    'TC-CUS-022 — "Previous" is disabled on page 1',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.waitForReady();
      await expect(customersPage.pagination.prevButton).toBeDisabled();
      await expect(page).toHaveURL(/page=1&orderCreatedAt=desc/);
    },
  );

  test(
    'TC-CUS-023 — "Next" navigates to page 2 and updates URL/table',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.pagination.next();
      await expect(page).toHaveURL(/page=2&orderCreatedAt=desc/);
      await expect(customersPage.pageIndicator).toHaveText(/2\s*\/\s*\d+/);
      await expect(customersPage.resultsFooter).toContainText(/^31–60 of [\d,]+$/);
      await expect(customersPage.pagination.prevButton).toBeEnabled();
    },
  );

  test(
    'TC-CUS-024 — "Next" is disabled on the last page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await customersPage.waitForReady();
      // The store spans hundreds of pages and the pager exposes only
      // Previous/Next plus an "n / m" indicator (no numbered page buttons), so
      // jump straight to the last page by its number rather than clicking Next
      // (which can never reach the end here).
      const totalPages = await customersPage.totalPages();
      await customersPage.gotoPage(totalPages);
      await expect(customersPage.pagination.nextButton).toBeDisabled();
    },
  );

  test(
    'TC-CUS-025 — clicking a customer row navigates to (or does not error on) detail',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, customerDetailPage, page }) => {
      await customersPage.waitForReady();
      const firstRow = customersPage.table.rows.first();
      const name = (await firstRow.getByRole('cell').nth(0).innerText()).trim();

      await firstRow.click();

      // Live behaviour: the row is a link to a detail *page*, not a modal.
      await expect(page).toHaveURL(
        /\/customers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\?tab=profile/,
      );
      await customerDetailPage.waitForReady();
      await expect(customerDetailPage.nameInput).toHaveValue(name);
    },
  );

  test(
    'TC-CUS-026 — LAST VISIT header is not click-to-sort',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.waitForReady();
      const header = customersPage.columnHeader(/last visit/i);

      // Verified against the live DOM: the header renders a plain <div>, with no
      // button, no aria-sort and no sort affordance. This case is therefore a
      // negative one — it pins "the column is inert" so that adding sorting
      // later is a deliberate change rather than a silent one.
      await expect(header.getByRole('button')).toHaveCount(0);
      await expect(header).not.toHaveAttribute('aria-sort', /.*/);

      const urlBefore = page.url();
      const orderBefore = (await customersPage.rowCells()).map((cells) => cells[0]);

      await header.click();
      await page.waitForTimeout(1000);

      expect(page.url()).toBe(urlBefore);
      const orderAfter = (await customersPage.rowCells()).map((cells) => cells[0]);
      expect(orderAfter).toEqual(orderBefore);
    },
  );
});
