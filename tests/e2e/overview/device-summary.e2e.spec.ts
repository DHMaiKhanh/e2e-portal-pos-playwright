import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Overview screen — "Device Summary" area (lean core).
 *
 * The Total Devices / offline counts, the POS device cards ("Open POS #n
 * details" buttons), and the device-detail modal. Counts and ids are dynamic, so
 * assertions match FORMAT/presence and modal behavior.
 */
test.describe('Device Summary — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-095 — displays the "Total Devices" count as a non-negative integer',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.totalDevicesCount).toBeVisible();
      await expect(dashboardPage.totalDevicesCount).toHaveText(/\d[\d,]*\s*Total Devices/);
    },
  );

  test(
    'TC-OVW-096 — shows the offline warning badge as an "N offline" count',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.offlineBadge).toBeVisible();
      await expect(dashboardPage.offlineBadge).toHaveText(/\d[\d,]*\s*offline/);
    },
  );

  test(
    'TC-OVW-099 — a device card exposes its fields and an "Open POS #1 details" button',
    { tag: [Tag.REGRESSION] },
    async ({ dashboardPage, page }) => {
      await expect(dashboardPage.deviceCard(1)).toBeVisible();
      // The labelled fields render (values dynamic — assert the labels, not values).
      await expect(page.getByText(/Device ID:/i).first()).toBeVisible();
      await expect(page.getByText(/OS:/i).first()).toBeVisible();
      await expect(page.getByText(/App Version:/i).first()).toBeVisible();
    },
  );

  test(
    'TC-OVW-105 — "Open POS #1 details" opens the device detail modal',
    { tag: [Tag.REGRESSION] },
    async ({ dashboardPage }) => {
      await dashboardPage.openDeviceDetails(1);
      await expect(dashboardPage.deviceDetailDialog).toBeVisible();
      await expect(dashboardPage.deviceDetailCloseButton).toBeVisible();
    },
  );
});
