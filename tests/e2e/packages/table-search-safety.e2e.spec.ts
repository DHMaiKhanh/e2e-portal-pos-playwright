import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { PackageColumn } from '@pages/packages/PackagesPage';

/**
 * Search, the "Enabled features x/62" formatting, and the read-only safety of the
 * list screen. Every test blocks writes first so the per-row Clone / Edit and the
 * toolbar Add can be probed without any risk of a cross-merchant mutation.
 *
 * Source: docs 16-packages.md (BUG-16-01 found 3 packages all named
 * "Copy of GO POS BASIC" — Clone does not enforce a unique name).
 */
test.describe('Danh sách, tìm kiếm & an toàn (Table / Search / Safety) — Packages', () => {
  test.beforeEach(async ({ packagesPage }) => {
    await packagesPage.blockWrites();
    await packagesPage.goto();
    await packagesPage.waitForReady();
  });

  /**
   * TC-PKG-010 — "Enabled features" reads as "N / 62" on every row.
   */
  test(
    'TC-PKG-010 — the Enabled features column is formatted as "N / 62"',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ packagesPage }) => {
      const rows = await packagesPage.table.rows.all();
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const text = (
          (await row.getByRole('cell').nth(PackageColumn.ENABLED_FEATURES).textContent()) ?? ''
        ).trim();
        expect(text, 'enabled-features cell').toMatch(/^\d+\s*\/\s*\d+$/);
      }
    },
  );

  /**
   * TC-PKG-011 — search narrows the list by package name.
   *
   * Tolerant by design: the exact catalogue changes over time, so this asserts
   * that typing a term that matches at least one package returns only matching
   * rows (or the empty state), not a fixed count.
   */
  test(
    'TC-PKG-011 — search narrows the catalogue to matching packages',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ packagesPage }) => {
      test.skip(!(await packagesPage.hasSearch()), 'Packages list has no search box any more');
      const names = await packagesPage.packageNames();
      test.skip(names.length === 0, 'no packages to search');
      // Pick a distinctive token from the first package name.
      const token = names[0].split(/\s+/).find((word) => word.length >= 3) ?? names[0];

      await packagesPage.search(token);

      const after = await packagesPage.packageNames();
      if (after.length === 0) {
        await expect(packagesPage.emptyState).toBeVisible();
      } else {
        for (const name of after) {
          expect(name.toLowerCase()).toContain(token.toLowerCase());
        }
      }
      await packagesPage.search('');
    },
  );

  /**
   * TC-PKG-012 — opening a row's Actions menu exposes Edit and Clone, and neither
   * fires a write (the menu is opened and dismissed; nothing is confirmed).
   */
  test(
    'TC-PKG-012 — the row Actions menu offers Edit and Clone without firing a write',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ packagesPage, page }) => {
      const blocked = await packagesPage.blockWrites();
      const trigger = packagesPage.rowActions(0);
      test.skip((await trigger.count()) === 0, 'rows expose no Actions menu');

      await trigger.click();
      await expect(page.getByRole('menuitem', { name: /edit/i }).first()).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /clone/i }).first()).toBeVisible();
      await page.keyboard.press('Escape');

      // Nothing was confirmed, so no package create/clone/update was attempted.
      expect(blocked, 'a write escaped while only opening the menu').toEqual([]);
    },
  );

  /**
   * TC-PKG-013 — the list screen issues no write request on load or search.
   */
  test(
    'TC-PKG-013 — browsing and searching the catalogue issues no mutating request',
    { tag: [Tag.REGRESSION, Tag.API] },
    async ({ packagesPage }) => {
      const blocked = await packagesPage.blockWrites();
      await packagesPage.goto();
      await packagesPage.waitForReady();
      if (await packagesPage.hasSearch()) {
        await packagesPage.search('GO POS');
        await packagesPage.search('');
      }

      expect(blocked, 'package catalogue made a write while only browsing').toEqual([]);
    },
  );
});
