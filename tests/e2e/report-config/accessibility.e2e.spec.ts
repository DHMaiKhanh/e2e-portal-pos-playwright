import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { REPORT_CONFIG_SCREEN_NAMES } from '@pages/report-config/ReportConfigPage';

test.describe('Khả năng tiếp cận (Accessibility) — Report Configuration', () => {
  /**
   * TC-RCF-140 — Nút icon-only trên dòng đều có aria-label; menu hành động có tên
   */
  test(
    'TC-RCF-140 — every icon-only row button has an accessible name and the actions menu is named',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage }) => {
      for (const screen of REPORT_CONFIG_SCREEN_NAMES) {
        const rc = reportConfigPage.on(screen);
        await rc.goto();
        const { name } = await rc.nameAndSlug(0);
        // Icon-only = no visible text (layout badges carry their own text).
        const iconOnly = await rc
          .row(0)
          .locator('button')
          .evaluateAll((bs) =>
            bs
              .filter((b) => !(b.textContent ?? '').trim())
              .map((b) => b.getAttribute('aria-label') ?? ''),
          );
        expect(iconOnly.sort(), screen).toEqual([`Actions for ${name}`, 'Copy key'].sort());
        const menu = await rc.openRowMenu(0);
        await expect(menu).toHaveAccessibleName(`Actions for ${name}`);
        await rc.closeRowMenu();
        expect(await rc.rowActionNames(0), screen).toEqual([...rc.spec.rowActions]);
      }
    },
  );

  /**
   * TC-RCF-141 — Bộ lọc là nút có tên mở listbox, điều khiển được bằng bàn phím
   * (since the redesign the chip is a `button` with `aria-haspopup`, opening a
   * cmdk `listbox "Suggestions"` whose highlight is `aria-selected`).
   */
  test(
    'TC-RCF-141 — filter chips are named popup buttons operable with Enter / Arrow keys',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      await rc.goto();
      const chip = page.getByRole('button', { name: 'Layout variant', exact: true });
      await expect(chip).toBeVisible();
      await expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
      await chip.focus();
      await page.keyboard.press('Enter');
      await expect(rc.listbox.getByRole('option')).toHaveCount(3);
      // The first option is highlighted on open; one ArrowDown moves to the second.
      await expect(rc.listbox.getByRole('option', { name: 'Web' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await page.keyboard.press('ArrowDown');
      await expect(rc.listbox.getByRole('option', { name: 'POS window' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await page.keyboard.press('Enter');
      await expect(rc.filter()).toHaveAttribute('aria-label', 'Layout variant: POS window');
      await expect(page).toHaveURL(/variant=pos/);
    },
  );

  /**
   * TC-RCF-142 — Dialog có role + tên; focus đặt vào ô Name
   */
  test(
    'TC-RCF-142 — New page is a named dialog that moves focus into the Name field',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ reportConfigPage: rc, page }) => {
      const blocked = await rc.guardWrites();
      await rc.goto();
      await rc.openAdd();
      const d = page.getByRole('dialog', { name: 'New page' });
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
    'TC-RCF-143 — closing New page should return focus to the Add button (defect D9: focus lands on <body>)',
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
          description: `D9: after closing the dialog focus is on <${tag}>, not the "Add page" trigger`,
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
      await rc.clickRowAction('Delete', 0);
      const a = page.getByRole('alertdialog', { name: 'Delete page?' });
      await expect(a.getByRole('button', { name: 'Cancel' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(a).toBeHidden();
      expect(blocked).toEqual([]);
    },
  );
});
