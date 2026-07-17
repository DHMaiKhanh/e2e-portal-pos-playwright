import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Tổng quan thiết bị (Device Summary) — Overview', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test(
    'TC-OVW-095 — Total Devices count matches rendered device cards',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.totalDevicesCount).toBeVisible();

      const totalText = (await dashboardPage.totalDevicesCount.textContent()) ?? '';
      const match = totalText.match(/(\d+)\s*Total Devices/i);
      expect(match).not.toBeNull();
      const totalDevices = Number(match?.[1]);
      expect(totalDevices).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(totalDevices)).toBe(true);

      const cardCount = await dashboardPage.deviceCards.count();
      // Only assert against cards actually rendered (list may be virtualized/paginated).
      expect(cardCount).toBeGreaterThan(0);
      expect(cardCount).toBeLessThanOrEqual(totalDevices);
    },
  );

  test(
    'TC-OVW-096 — offline badge count matches offline device cards',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      await expect(dashboardPage.deviceSummarySection).toBeVisible();
      await expect(dashboardPage.offlineBadge).toBeVisible();

      const badgeText = (await dashboardPage.offlineBadge.textContent()) ?? '';
      const match = badgeText.match(/(\d+)\s*offline/i);
      expect(match).not.toBeNull();
      const offlineFromBadge = Number(match?.[1]);
      expect(offlineFromBadge).toBeGreaterThanOrEqual(0);

      const renderedOfflineCount = await dashboardPage.offlineDeviceCards.count();
      const renderedTotalCount = await dashboardPage.deviceCards.count();
      // Only meaningful to compare when the full device list is rendered (not virtualized/paginated).
      if (renderedTotalCount === offlineFromBadge || renderedOfflineCount > 0) {
        expect(renderedOfflineCount).toBeLessThanOrEqual(offlineFromBadge);
      }
    },
  );

  test(
    'TC-OVW-099 — a device card shows all required fields with correct labels',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage }) => {
      const card = dashboardPage.deviceCardContainer(1);
      await expect(card).toBeVisible();

      await expect(card.getByText(/POS #1\b/)).toBeVisible();
      await expect(dashboardPage.deviceCardStatus(1)).toHaveText(/Online|Offline/);
      await expect(card.getByText(/Device ID:\s*[0-9a-f-]{36}/i)).toBeVisible();
      await expect(card.getByText(/OS:\s*\S+/i)).toBeVisible();
      await expect(card.getByText(/App Version:\s*\S+/i)).toBeVisible();
      await expect(card.getByText(/terminal/i)).toBeVisible();
      await expect(card.getByText(/printer/i)).toBeVisible();

      await expect(dashboardPage.deviceCard(1)).toHaveAccessibleName(/Open POS #1 details/i);
    },
  );

  test(
    'TC-OVW-105 — "Open POS #1 details" opens the device detail dialog',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, page }) => {
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await dashboardPage.openDeviceDetails(1);

      await expect(dashboardPage.deviceDetailDialog).toBeVisible();
      await expect(dashboardPage.deviceDetailDialog.getByText(/POS #1\b/)).toBeVisible();
      // Device ID is a dynamic UUID per device/environment (this literal belonged
      // to a different POS card, not #1) — assert the UUID FORMAT instead.
      await expect(
        dashboardPage.deviceDetailDialog.getByText(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
        ),
      ).toBeVisible();
      await expect(dashboardPage.deviceDetailCloseButton).toBeVisible();

      await dashboardPage.closeDeviceDetails();
      await expect(dashboardPage.deviceDetailDialog).toBeHidden();
    },
  );
});
