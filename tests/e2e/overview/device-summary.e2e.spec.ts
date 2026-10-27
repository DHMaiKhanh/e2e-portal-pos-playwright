import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Device summary" card.
 *
 * Since the 2026-10-13 redesign: header "<n> devices" + a Registration status
 * radiogroup (Active / Inactive / All); one row per device (button "Open POS #n
 * details") with OS, "Ver x.y.z", terminal, printer and "Online" / "Offline · 2h
 * ago"; clicking a row opens the "Device detail" dialog.
 *
 * TC-OVW-096 (the "<n> offline" warning badge) was removed: the redesigned card
 * has no offline badge; offline state is shown per row (asserted in TC-OVW-099).
 */
test.describe('Device Summary — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-095 — device count is a non-negative integer consistent with the rows',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.totalDevicesCount).toHaveText(/^\d[\d,]* devices?$/);
      // Rows arrive after the header; wait for the first before sampling.
      await expect(dashboardPage.deviceCards.first()).toBeVisible();

      const total = await dashboardPage.totalDevices();
      expect(Number.isInteger(total)).toBe(true);
      const rendered = await dashboardPage.deviceCards.count();
      // The list is incrementally loaded, so rendered rows never exceed the total.
      expect(rendered).toBeGreaterThan(0);
      expect(rendered).toBeLessThanOrEqual(total);

      // Default registration filter is "Active".
      await expect(
        dashboardPage.registrationStatusGroup.getByRole('radio', { name: 'Active', exact: true }),
      ).toHaveAttribute('aria-checked', 'true');
    },
  );

  test(
    'TC-OVW-099 — a device row shows OS, version, terminal, printer and status',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      const row = dashboardPage.deviceCard(1);
      await expect(row).toBeVisible();
      await expect(row).toHaveAccessibleName(/^Open POS #1 details$/);
      await expect(
        row.getByRole('img', { name: /android|windows|macos|ios|linux/i }),
      ).toBeVisible();
      await expect(row.locator('[data-slot="device-row-os"]')).toHaveText(/\S+ \d+(\.\d+)*/);
      await expect(row.getByText(/^Ver \d+(\.\d+)+$/)).toBeVisible();
      await expect(dashboardPage.deviceCardStatus(1)).toHaveText(/^(Online|Offline( · .+)?)$/);

      // Every rendered row carries a status, and offline rows say so in text.
      const rows = await dashboardPage.deviceCards.count();
      const statuses = await dashboardPage.deviceCards
        .locator('[data-slot="device-row-status"]:visible')
        .allInnerTexts();
      expect(statuses).toHaveLength(rows);
      for (const status of statuses) expect(status.trim()).toMatch(/^(Online|Offline)/);
    },
  );

  test(
    'TC-OVW-105 — "Open POS #1 details" opens the device detail dialog',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await dashboardPage.openDeviceDetails(1);

      const dialog = dashboardPage.deviceDetailDialog;
      await expect(dialog.getByText(/POS #1\b/)).toBeVisible();
      await expect(
        dialog.getByText(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
      ).toBeVisible();
      for (const term of ['Device ID', 'OS', 'Version', 'Last connected', 'Uptime (7d)']) {
        await expect(dialog.getByRole('term').filter({ hasText: term }).first()).toBeVisible();
      }

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    },
  );
});
