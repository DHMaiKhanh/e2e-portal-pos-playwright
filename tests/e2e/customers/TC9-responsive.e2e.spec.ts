import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Responsive / đa thiết bị — Customers', () => {
  test(
    'TC-CUS-062 — desktop width (1920x1080) has no horizontal overflow',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ customersPage, page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await customersPage.goto();
      await expect(customersPage.columnHeaders).toHaveCount(8);
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(1921);
    },
  );

  test(
    'TC-CUS-063 — sidebar collapses automatically at tablet width (768x1024)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ customersPage, page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await customersPage.goto();
      await expect(customersPage.searchInput).toBeVisible();
      const toggleButton = page.getByRole('button', { name: /toggle sidebar/i });
      await expect(toggleButton).toBeVisible();
    },
  );

  test(
    'TC-CUS-064 — table adapts at mobile portrait width (375x667)',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ customersPage, page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await customersPage.goto();
      await expect(customersPage.searchInput).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(376);
    },
  );

  test(
    'TC-CUS-065 — no horizontal overflow when resizing dynamically across breakpoints',
    { tag: [Tag.REGRESSION, Tag.SLOW] },
    async ({ customersPage, page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await customersPage.goto();

      for (const size of [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1024, height: 768 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 },
      ]) {
        await page.setViewportSize(size);
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(size.width + 1);
      }
    },
  );
});
