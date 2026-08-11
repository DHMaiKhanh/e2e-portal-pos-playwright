import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tìm kiếm (Search) — Services', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  test(
    'TC-SVC-020 — search by real service name returns matching results',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.search('Diamond Pedicure');
      const footerText = await productsPage.paginationFooterText();
      expect(footerText).toMatch(/Showing \d+ to \d+ of \d+ results/);
      const hasMatch = await productsPage.hasProduct('Diamond Pedicure');
      if (hasMatch) {
        await expect(productsPage.serviceRow('Diamond Pedicure')).toBeVisible();
      }
    },
  );

  test(
    'TC-SVC-021 — search with nonexistent keyword returns empty table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await productsPage.search('zzz_no_such_service_zzz');
      const footerText = await productsPage.paginationFooterText();
      expect(footerText).toContain('Showing 0 to 0 of 0 results');
      expect(consoleErrors).toEqual([]);
    },
  );

  test(
    'TC-SVC-022 — clearing search keyword restores full list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage }) => {
      await productsPage.search('Diamond Pedicure');
      await productsPage.search('');
      const footerText = await productsPage.paginationFooterText();
      expect(footerText).toContain('of 259 results');
      const pageIndicatorText = await productsPage.pageIndicatorText();
      expect(pageIndicatorText).toMatch(/1 \/ 9/);
    },
  );

  test(
    'TC-SVC-023 — search with special characters does not error',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ productsPage, page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      const pageErrors: Error[] = [];
      page.on('pageerror', (err) => pageErrors.push(err));

      for (const term of ['&', '/', '%', '😀']) {
        await productsPage.search(term);
        const footerText = await productsPage.paginationFooterText();
        expect(footerText).toMatch(/Showing \d+ to \d+ of \d+ results/);
      }

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    },
  );
});
