import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

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

      const firstOption = options.first();
      const groupName = (await firstOption.textContent())?.trim() ?? '';
      await firstOption.click();

      await expect(customersPage.groupFilterButtonWithLabel(groupName)).toBeVisible();
      await expect(customersPage.pageIndicator).toHaveText(/1\s*\/\s*\d+/);
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

      await customersPage.groupFilterButtonWithLabel(groupName).click();
      await page.getByRole('option', { name: /all groups/i }).click();

      await expect(customersPage.groupFilter).toBeVisible();
      await expect(customersPage.pageIndicator).toHaveText(/1\s*\/\s*\d+/);
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
      await expect(customersPage.resultsFooter).toContainText(/showing 31 to 60 of \d+ results/i);
      await expect(customersPage.pagination.prevButton).toBeEnabled();
    },
  );

  test(
    'TC-CUS-024 — "Next" is disabled on the last page',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      const lastPageLink = page.getByRole('button', { name: /^11$/i });
      if (await lastPageLink.isVisible().catch(() => false)) {
        await lastPageLink.click();
      } else {
        for (let i = 0; i < 10; i++) {
          if (await customersPage.pagination.nextButton.isDisabled()) break;
          await customersPage.pagination.next();
        }
      }
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
