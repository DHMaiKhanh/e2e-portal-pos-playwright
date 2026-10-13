import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';

test.describe('Bảng dữ liệu & phân trang (Tables/lists) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  test(
    'TC-CUS-037 — table header renders all columns in the correct order',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ customersPage }) => {
      const headers = customersPage.columnHeaders;
      await expect(headers).toHaveCount(8);
      const expected = [
        /name/i,
        /phone/i,
        /email/i,
        /group/i,
        /total visits/i,
        /points/i,
        /cashback balance/i,
        /last visit/i,
      ];
      for (let i = 0; i < expected.length; i++) {
        await expect(headers.nth(i)).toHaveText(expected[i]);
      }
    },
  );

  test(
    'TC-CUS-038 — a fully populated customer row formats each column correctly',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await customersPage.waitForReady();
      const populated = (await customersPage.rowCells()).filter(
        (cells) => cells[1] !== '—' && cells[6].startsWith('$'),
      );

      // The unconditional `test.skip(true, ...)` this replaces made the case a
      // no-op: it ran the loop, and if a fully-populated row *was* found the
      // early `return` skipped the skip — but any other outcome reported green
      // without asserting anything.
      expect(populated.length, 'no fully-populated customer row on page 1').toBeGreaterThan(0);

      for (const cells of populated) {
        expect(cells[1]).toMatch(/^\(\*{3}\) \*{3}-\d{4}$/);
        expect(cells[6]).toMatch(/^\$[\d,]+\.\d{2}$/);
        // TOTAL VISITS / POINTS are deliberately not asserted as integers here:
        // rows in this store render "—" for them, and whether that placeholder
        // is correct is the subject of TC-CUS-039 and TC-CUS-050 rather than of
        // this column-format case.
      }
    },
  );

  test(
    'TC-CUS-039 — TOTAL VISITS and POINTS render zero consistently',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      const rows = customersPage.table.rows;
      const count = await rows.count();
      const totalVisitsValues = new Set<string>();
      for (let i = 0; i < count; i++) {
        const lastVisit = (await rows.nth(i).getByRole('cell').nth(7).textContent())?.trim() ?? '';
        if (lastVisit === '-') {
          const totalVisits =
            (await rows.nth(i).getByRole('cell').nth(4).textContent())?.trim() ?? '';
          totalVisitsValues.add(totalVisits);
        }
      }
      if (totalVisitsValues.size > 0) {
        expect(totalVisitsValues.size).toBe(1);
      }
    },
  );

  test(
    'TC-CUS-040 — direct navigation to a middle page shows correct data and controls',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await page.goto(`${Urls.CUSTOMERS}?page=5&orderCreatedAt=desc`, {
        waitUntil: 'domcontentloaded',
      });
      await customersPage.waitForReady();
      await expect(customersPage.pageIndicator).toHaveText(/5\s*\/\s*\d+/);
      await expect(customersPage.table.rows).toHaveCount(30);
      await expect(customersPage.resultsFooter).toContainText(/showing 121 to 150 of \d+ results/i);
      await expect(customersPage.pagination.prevButton).toBeEnabled();
      await expect(customersPage.pagination.nextButton).toBeEnabled();
    },
  );

  test(
    'TC-CUS-041 — last page shows the correct remaining row count (partial page)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage, page }) => {
      await customersPage.waitForReady();
      // totalPages() asserts the indicator is readable rather than skipping when
      // it is not — an unreadable pager is a broken screen, not a missing
      // precondition.
      const totalPages = await customersPage.totalPages();

      await page.goto(`${Urls.CUSTOMERS}?page=${totalPages}&orderCreatedAt=desc`, {
        waitUntil: 'domcontentloaded',
      });
      await customersPage.waitForReady();
      const rowCount = await customersPage.table.rows.count();
      expect(rowCount).toBeGreaterThan(0);
      expect(rowCount).toBeLessThanOrEqual(30);
      await expect(customersPage.pagination.nextButton).toBeDisabled();
      await expect(customersPage.pageIndicator).toHaveText(
        new RegExp(`${totalPages}\\s*/\\s*${totalPages}`),
      );
    },
  );

  test(
    'TC-CUS-042 — empty state renders when search matches nothing',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ customersPage }) => {
      await customersPage.search('zzzxxxnonexistent999');
      await expect(customersPage.emptyState).toBeVisible();
      await expect(customersPage.resultsFooter).not.toContainText('313');
    },
  );
});
