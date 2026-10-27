import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { DevicesTab } from '@pages/devices/DevicesPage';

/**
 * Content of each Devices sub-tab. Everything here is read-only — writes are
 * blocked before navigating — and every assertion is tolerant of the shared DEV
 * fleet's live data: tabs may hold rows or be empty on any given day, so the
 * specs assert the empty state OR rows rather than a fixed count.
 *
 * Screen facts (docs 18-devices.md): Pending registrations shows
 * "No pending registrations." when empty; Device history is an assignment log
 * (~618 rows); the Devices tab exposes a Status filter among Status / Version /
 * Connection.
 */
test.describe('Nội dung các tab (Tabs content) — Devices', () => {
  test.beforeEach(async ({ devicesPage }) => {
    await devicesPage.blockWrites();
  });

  /**
   * TC-DEV-010 — Pending registrations shows its empty text OR a pending table.
   */
  test(
    'TC-DEV-010 — open(PENDING) shows "No pending registrations." or a pending table',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ devicesPage }) => {
      await devicesPage.open(DevicesTab.PENDING);

      const emptyVisible = await devicesPage.pendingEmpty.isVisible().catch(() => false);
      const rowCount = await devicesPage.table.rows.count();
      expect(emptyVisible || rowCount > 0, 'pending tab shows empty text or rows').toBe(true);
    },
  );

  /**
   * TC-DEV-011 — Device history shows an assignment table with rows, or empty.
   */
  test(
    'TC-DEV-011 — open(HISTORY) shows the assignment table with rows or empty',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ devicesPage }) => {
      await devicesPage.open(DevicesTab.HISTORY);

      await expect(devicesPage.rowOrEmpty).toBeVisible();
    },
  );

  /**
   * TC-DEV-012 — the Devices tab exposes the Status filter.
   */
  test(
    'TC-DEV-012 — open(DEVICES) exposes the Status filter',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ devicesPage }) => {
      await devicesPage.open(DevicesTab.DEVICES);

      await expect(devicesPage.statusFilter).toBeVisible();
      await expect(devicesPage.statusFilter).toBeEnabled();
    },
  );

  /**
   * TC-DEV-013 — the results footer reports a non-negative total when rows exist.
   *
   * Skipped when the tab has no rows (nothing to total) or when the footer is
   * absent (single page, no pagination range to parse).
   */
  test(
    'TC-DEV-013 — totalResults() returns a number ≥ 0 when rows exist',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ devicesPage }) => {
      await devicesPage.open(DevicesTab.DEVICES);

      const rowCount = await devicesPage.table.rows.count();
      test.skip(rowCount === 0, 'no device rows to total');

      const total = await devicesPage.totalResults();
      test.skip(Number.isNaN(total), 'no results footer to read a total from');
      expect(total).toBeGreaterThanOrEqual(0);
    },
  );
});
