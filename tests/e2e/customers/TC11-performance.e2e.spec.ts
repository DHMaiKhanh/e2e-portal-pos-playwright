import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Hiệu năng (Performance) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  test(
    'TC-CUS-071 — first load renders the full 30-row table within budget',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ customersPage, page }) => {
      const start = Date.now();
      await page.reload();
      await customersPage.waitForReady();
      await expect(customersPage.table.rows).toHaveCount(30, { timeout: 5000 });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    },
  );

  test(
    'TC-CUS-072 — pagination (Next) from page 1 to 2 performs well',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ customersPage, page }) => {
      const start = Date.now();
      await customersPage.pagination.next();
      await expect(page).toHaveURL(/page=2&orderCreatedAt=desc/);
      await expect(customersPage.pageIndicator).toHaveText(/2\s*\/\s*\d+/);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(3000);
    },
  );

  test(
    'TC-CUS-073 — search results render quickly without layout shift',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ customersPage, page }) => {
      const searchBoxBefore = await customersPage.searchInput.boundingBox();
      const groupFilterBefore = await customersPage.groupFilter.boundingBox();

      const start = Date.now();
      await customersPage.search('test');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(3000);

      const searchBoxAfter = await customersPage.searchInput.boundingBox();
      const groupFilterAfter = await customersPage.groupFilter.boundingBox();
      expect(searchBoxAfter?.y).toBe(searchBoxBefore?.y);
      expect(groupFilterAfter?.y).toBe(groupFilterBefore?.y);
      void page;
    },
  );
});
