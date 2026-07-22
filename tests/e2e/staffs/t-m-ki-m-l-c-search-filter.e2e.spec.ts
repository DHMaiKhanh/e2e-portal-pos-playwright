import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tìm kiếm & lọc (Search / Filter) — Staffs', () => {
  test.beforeEach(async ({ staffsPage }) => {
    await staffsPage.goto();
    await staffsPage.waitForReady();
  });

  test(
    'TC-STF-020 — search by nick name returns matching results',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.search('trine');
      await expect(page).toHaveURL(/search=trine/);
      const rows = staffsPage.table.rows;
      await expect(rows.first()).toContainText(/trine/i);
    },
  );

  test(
    'TC-STF-021 — search with no match shows empty state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await staffsPage.search('zzz_no_such_staff_zzz');
      await expect(staffsPage.resultsFooter).toContainText(/showing 0 to 0 of 0 results/i);
      expect(errors).toHaveLength(0);
    },
  );

  test(
    'TC-STF-022 — clearing search restores full list',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.search('trine');
      await expect(page).toHaveURL(/search=trine/);

      await staffsPage.clearSearch();
      await expect(page).not.toHaveURL(/search=trine/);
      await expect(staffsPage.resultsFooter).toBeVisible();
    },
  );

  test(
    'TC-STF-023 — filter by Status = Inactive',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.statusFilter.click();
      await page.getByRole('option', { name: /inactive/i }).click();

      await expect(page).toHaveURL(/status=inactive/);
      const rows = staffsPage.table.rows;
      const count = await rows.count();
      if (count > 0) {
        await expect(rows.first()).toContainText(/inactive/i);
      } else {
        await expect(staffsPage.emptyState).toBeVisible();
      }
    },
  );

  test(
    'TC-STF-024 — change sort order to Oldest first',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.sortFilter.click();
      await page.getByRole('option', { name: /oldest first/i }).click();

      await expect(page).toHaveURL(/orderCreatedAt=asc/);
      const rows = staffsPage.table.rows;
      await expect(rows.first()).toBeVisible();
    },
  );

  test(
    'TC-STF-025 — combine search + status filter (AND)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.search('a');
      await staffsPage.statusFilter.click();
      await page.getByRole('option', { name: /inactive/i }).click();

      await expect(page).toHaveURL(/search=a/);
      await expect(page).toHaveURL(/status=inactive/);
      const rows = staffsPage.table.rows;
      const count = await rows.count();
      if (count > 0) {
        await expect(rows.first()).toContainText(/inactive/i);
      } else {
        await expect(staffsPage.emptyState).toBeVisible();
      }
    },
  );

  test(
    'TC-STF-026 — changing filter/search resets to page 1',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const page2 = page.getByRole('button', { name: '2', exact: true });
      if (await page2.isVisible().catch(() => false)) {
        await page2.click();
        await expect(page).toHaveURL(/page=2/);
      }

      await staffsPage.search('trine');
      await expect(page).toHaveURL(/search=trine/);
      await expect(page).not.toHaveURL(/page=2/);
    },
  );

  test(
    'TC-STF-027 — search with special characters does not error',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await staffsPage.search(`%, _, ', --, <script>`);
      await expect(staffsPage.resultsFooter).toBeVisible();
      expect(errors).toHaveLength(0);
      const dialogHandled = await page
        .evaluate(() => document.title)
        .then(() => true)
        .catch(() => false);
      expect(dialogHandled).toBe(true);
    },
  );

  test(
    'TC-STF-028 — reload with existing filter/sort/search query params',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ staffsPage, page }) => {
      await staffsPage.search('trine');
      await staffsPage.statusFilter.click();
      await page.getByRole('option', { name: /inactive/i }).click();

      const url = page.url();
      await page.goto(url);
      await staffsPage.waitForReady();

      await expect(page).toHaveURL(/search=trine/);
      await expect(page).toHaveURL(/status=inactive/);
      await expect(staffsPage.searchInput).toHaveValue('trine');
    },
  );
});
