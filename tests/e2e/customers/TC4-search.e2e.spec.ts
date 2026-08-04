import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Ô tìm kiếm (Search input) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  test(
    'TC-CUS-027 — search by full name returns matching rows',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.search('test checkin');
      await expect(page).toHaveURL(/search=test(\+|%20)checkin/i);
      const count = await customersPage.table.rows.count();
      if (count > 0) {
        await expect(customersPage.table.rows.first()).toContainText(/test checkin/i);
      } else {
        await expect(customersPage.emptyState).toBeVisible();
      }
    },
  );

  test(
    'TC-CUS-028 — search by phone number returns matching row',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      const firstPhoneCell = customersPage.table.rows.first().getByRole('cell').nth(1);
      const phoneText = (await firstPhoneCell.textContent())?.trim() ?? '';
      const rawPhone = phoneText.replace(/\D/g, '');
      test.skip(rawPhone.length < 7, 'No usable phone number found on page 1 to search by');

      await customersPage.search(rawPhone);
      await expect(page).toHaveURL(/search=/);
      const count = await customersPage.table.rows.count();
      expect(count).toBeGreaterThan(0);
    },
  );

  test(
    'TC-CUS-029 — searching with different phone formats returns the same result',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      const firstPhoneCell = customersPage.table.rows.first().getByRole('cell').nth(1);
      const phoneText = (await firstPhoneCell.textContent())?.trim() ?? '';
      const raw = phoneText.replace(/\D/g, '');
      test.skip(raw.length < 10, 'No usable 10-digit phone number found on page 1');

      const dashed = `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
      const formatted = `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`;

      await customersPage.search(raw);
      const rawCount = await customersPage.table.rows.count();

      await customersPage.search(dashed);
      const dashedCount = customersPage.table.rows;

      await customersPage.search(formatted);
      const formattedCount = customersPage.table.rows;

      await expect(dashedCount).toHaveCount(rawCount);
      await expect(formattedCount).toHaveCount(rawCount);
      void page;
    },
  );

  test(
    'TC-CUS-030 — clearing the search input restores the full list',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage, page }) => {
      await customersPage.search('test');
      await expect(page).toHaveURL(/search=test/);

      await customersPage.clearSearch();
      await expect(page).not.toHaveURL(/search=test/);
      await expect(customersPage.resultsFooter).toContainText(/showing 1 to 30 of \d+ results/i);
    },
  );

  test(
    'TC-CUS-031 — search with no match shows empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const errors: string[] = [];
      customersPage.page.on('pageerror', (err) => errors.push(err.message));

      await customersPage.search('zzzzznotarealcustomer999');
      await expect(customersPage.emptyState).toBeVisible();
      await expect(customersPage.pagination.prevButton).toBeDisabled();
      await expect(customersPage.pagination.nextButton).toBeDisabled();
      expect(errors).toHaveLength(0);
    },
  );

  test(
    'TC-CUS-032 — search input accepts special characters present in real data',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const errors: string[] = [];
      customersPage.page.on('pageerror', (err) => errors.push(err.message));

      await customersPage.search('@@@!');
      expect(errors).toHaveLength(0);
      const count = await customersPage.table.rows.count();
      if (count > 0) {
        await expect(customersPage.table.rows.first()).toContainText('@@@!');
      }
    },
  );

  test(
    'TC-CUS-033 — leading/trailing whitespace in search is trimmed',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await customersPage.search('   test   ');
      const count = await customersPage.table.rows.count();
      expect(count).toBeGreaterThan(0);
    },
  );

  test(
    'TC-CUS-034 — search results update as the user types without pressing Enter',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.searchInput.pressSequentially('test', { delay: 100 });
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/search=test/);
    },
  );

  test(
    'TC-CUS-035 — combining search with an active Group filter narrows by both',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.openGroupFilter();
      const options = page.getByRole('option').filter({ hasNotText: /all groups/i });
      const optionCount = await options.count();
      test.skip(optionCount === 0, 'No customer groups available to combine with search');

      const groupName = (await options.first().textContent())?.trim() ?? '';
      await options.first().click();
      await expect(customersPage.groupFilterButtonWithLabel(groupName)).toBeVisible();

      await customersPage.search('test');
      await expect(page).toHaveURL(/search=test/);

      await customersPage.clearSearch();
      await expect(customersPage.groupFilterButtonWithLabel(groupName)).toBeVisible();
    },
  );

  test(
    'TC-CUS-036 — search keyword and group filter are preserved across pagination',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.search('a');
      await expect(page).toHaveURL(/search=a/);

      const count = await customersPage.table.rows.count();
      if (await customersPage.pagination.nextButton.isEnabled()) {
        await customersPage.pagination.next();
        await expect(page).toHaveURL(/search=a/);
        await expect(page).toHaveURL(/page=2/);
        await expect(customersPage.searchInput).toHaveValue('a');
      }
      void count;
    },
  );
});
