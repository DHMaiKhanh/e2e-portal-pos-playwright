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
      // "Diamond Pedicure" no longer exists in store 100004; pinned to
      // "Gel Polish", which does (verified 2026-10-20).
      const term = 'Gel Polish';
      await productsPage.search(term);
      await expect(productsPage.page).toHaveURL(/[?&]name=Gel(%20|\+)Polish/);
      await expect(productsPage.serviceRow(term)).toBeVisible();
      const { total } = await productsPage.footerRange();
      expect(total).toBeGreaterThan(0);
      // Poll: the filtered page replaces the unfiltered one only once its own
      // fetch lands, which can lag the URL update on a loaded DEV.
      await expect
        .poll(async () =>
          (await productsPage.table.rows.allInnerTexts()).every((rowText) =>
            rowText.toLowerCase().includes('gel'),
          ),
        )
        .toBe(true);
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
      // Since the 2026-10-13 refactor an empty result shows the empty state and
      // removes the pager (there is no "0 to 0 of 0" footer any more).
      await expect(productsPage.emptyState).toBeVisible();
      await expect(productsPage.table.rows).toHaveCount(0);
      await expect(productsPage.paginationFooter).toHaveCount(0);
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
      const { total } = await productsPage.footerRange();
      expect(total).toBeGreaterThan(0);

      // search() gives up waiting for the refetch after 5s, and under a loaded
      // run the footer can still show the unfiltered count — poll instead.
      await productsPage.search('Gel Polish');
      await expect.poll(async () => (await productsPage.footerRange()).total).toBeLessThan(total);

      await productsPage.search('');
      await expect.poll(() => productsPage.paginationFooterText()).toBe(unfilteredFooter);
      await expect.poll(() => productsPage.pageIndicatorText()).toBe(unfilteredPager);
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
        // Either matching rows with a pager, or the controlled empty state.
        await expect(
          productsPage.paginationFooter.or(productsPage.emptyState).first(),
        ).toBeVisible();
      }

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    },
  );
});
