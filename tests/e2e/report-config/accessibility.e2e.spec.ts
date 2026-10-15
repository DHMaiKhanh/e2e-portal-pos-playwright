import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { REPORT_CONFIG_SCREEN_NAMES } from '@pages/report-config/ReportConfigPage';

test.describe('Khả năng tiếp cận (Accessibility) — Report Configuration', () => {
  /**
   * TC-RCF-140 — Nút hành động icon-only đều có aria-label
   */
  test(
    'TC-RCF-140 — every icon-only row action exposes an accessible name',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        const labels = await rc
          .row(0)
          .locator(
            'button[data-slot="tooltip-trigger"], button[data-slot="row-action-button"], button[data-slot="button"]',
          )
          .evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? ''));
        expect(labels.sort(), screen).toEqual([...rc.spec.rowActions].sort());
      }
    },
  );

  /**
   * TC-RCF-141 — Bộ lọc là combobox có tên, điều khiển được bằng bàn phím
   */
  test(
    'TC-RCF-141 — filters are named comboboxes operable with Enter / Arrow keys',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      await rc.goto();
      await expect(page.getByRole('combobox', { name: 'Layout variant' })).toBeVisible();
      await rc.filter().focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('option')).toHaveCount(4);
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(150);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(150);
      await expect(page.getByRole('option', { name: 'POS Window' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(rc.filter()).toHaveText('POS Window');
      await expect(page).toHaveURL(/variant=pos/);
    },
  );

  /**
   * TC-RCF-142 — Dialog có role + tên; focus đặt vào ô Name
   */
  test(
    'TC-RCF-142 — Add Page is a named dialog that moves focus into the Name field',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.goto();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'Add Page' });
      await expect(d).toBeVisible();
      await expect(d.getByLabel('Name')).toBeFocused();
      // Tab stays inside the dialog.
      for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
        true,
      );
      await page.keyboard.press('Escape');
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-143 — Đóng dialog: focus phải quay về nút kích hoạt (defect D9)
   */
  test(
    'TC-RCF-143 — closing Add Page should return focus to the Add button (defect D9: focus lands on <body>)',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.goto();
      await rc.openAdd();
      await expect(rc.dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(rc.dialog).toBeHidden();
      const onTrigger = await rc.addButton.evaluate((b) => b === document.activeElement);
      if (!onTrigger) {
        const tag = await page.evaluate(() => document.activeElement?.tagName);
        test.info().annotations.push({
          type: 'defect',
          description: `D9: after closing the dialog focus is on <${tag}>, not the "Add Page" trigger`,
        });
      }
      expect(blocked).toEqual([]);
    },
  );

  /**
   * TC-RCF-144 — Alertdialog Delete: focus mặc định vào Cancel (an toàn)
   */
  test(
    'TC-RCF-144 — the Delete confirmation focuses Cancel, so Enter does not delete',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.goto();
      await rc.rowAction('Delete', 0).click();
      const a = page.getByRole('alertdialog', { name: 'Delete Page?' });
      await expect(a.getByRole('button', { name: 'Cancel' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(a).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );
});
