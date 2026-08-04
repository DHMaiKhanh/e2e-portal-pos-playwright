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
      const optionCount = await options.count();
      test.skip(optionCount === 0, 'No customer groups available to filter by in this dataset');

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
      const optionCount = await options.count();
      test.skip(optionCount === 0, 'No customer groups available to filter by in this dataset');

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

  // TODO(manual/setup): detail navigation on row click is not confirmed by the static
  // scan — needs live verification before asserting concrete detail-page behavior.
  test.fixme(
    'TC-CUS-025 — clicking a customer row navigates to (or does not error on) detail',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  // TODO(manual/setup): click-to-sort on the LAST VISIT column header is not confirmed
  // by the static scan — needs live verification of whether it's interactive.
  test.fixme(
    'TC-CUS-026 — clicking LAST VISIT header toggles sort direction',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
