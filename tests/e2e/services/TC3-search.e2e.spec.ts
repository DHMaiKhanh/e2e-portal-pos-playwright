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
      // Baseline read at run time rather than hardcoded. The catalogue is live:
      // it was 259 when this was written, and any test that adds a service —
      // TC-SVC-050 does, briefly — used to break this one from another file.
      const unfilteredFooter = await productsPage.paginationFooterText();
      const unfilteredPager = await productsPage.pageIndicatorText();
      const total = Number(unfilteredFooter.match(/of (\d+) results/i)?.[1]);
      expect(total).toBeGreaterThan(0);

      await productsPage.search('Diamond Pedicure');
      const filtered = await productsPage.paginationFooterText();
      expect(Number(filtered.match(/of (\d+) results/i)?.[1])).toBeLessThan(total);

      await productsPage.search('');
      expect(await productsPage.paginationFooterText()).toBe(unfilteredFooter);
      expect(await productsPage.pageIndicatorText()).toBe(unfilteredPager);
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
