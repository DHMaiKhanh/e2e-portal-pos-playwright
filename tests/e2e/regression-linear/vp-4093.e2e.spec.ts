import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';

/**
 * VP-4093 — Payment & Transactions tab: two fields shared the id "cash", so the "Cash" label of
 * the point value landed on the Cash payment-method switch.
 * https://linear.app/fastboy/issue/VP-4093
 *
 * Read-only: nothing is typed and nothing is saved. Scanned on DEV 2026-10-20: `card`, `cash` and
 * `other` are each used by a switch (Payment Methods) and a text input (point values).
 */
test.describe('VP-4093 — id trên tab Payment & Transactions là duy nhất', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${Urls.SETTINGS}?tab=payment-transactions`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#taxPercentage')).toBeVisible({ timeout: 30_000 });
  });

  test(
    'TC-VP4093-01 — không có id nào bị dùng cho 2 phần tử',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      // Radix generates its own unique ids; only hand-written ids can collide.
      const duplicates = await page.evaluate(() => {
        const seen: Record<string, string[]> = {};
        document.querySelectorAll('[id]').forEach((el) => {
          if (el.id.startsWith('radix-')) return;
          (seen[el.id] ??= []).push(el.getAttribute('role') ?? el.tagName.toLowerCase());
        });
        return Object.fromEntries(Object.entries(seen).filter(([, v]) => v.length > 1));
      });
      expect(duplicates).toEqual({});
    },
  );

  test(
    'TC-VP4093-02 — mỗi label[for] trỏ tới đúng một control',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      const ambiguous = await page.evaluate(() =>
        [...document.querySelectorAll('label[for]')]
          .map((l) => ({
            label: (l as HTMLLabelElement).innerText.trim().split('\n')[0],
            for: (l as HTMLLabelElement).htmlFor,
            targets: document.querySelectorAll(`#${CSS.escape((l as HTMLLabelElement).htmlFor)}`)
              .length,
          }))
          .filter((x) => x.targets !== 1),
      );
      expect(ambiguous).toEqual([]);
    },
  );

  test(
    'TC-VP4093-03 — nhãn "Cash" của Point value gắn với ô nhập, không phải switch Cash',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ page }) => {
      // One "Cash" is the payment-method switch, the other the point-value text box. With the
      // shared id both labels name the switch ("Cash Cash") and the text box has no name at all.
      const cashSwitch = page.getByRole('switch', { name: /^cash\b/i });
      await expect(cashSwitch).toHaveCount(1);
      await expect(cashSwitch).not.toHaveAccessibleName(/cash.*cash/i);
      const pointCash = page.getByRole('textbox', { name: 'Cash', exact: true });
      await expect(pointCash).toHaveCount(1);

      // Clicking the label must focus the text box and leave the switch alone.
      const switchBefore = await cashSwitch.getAttribute('aria-checked');
      const inputId = await pointCash.getAttribute('id');
      await page
        .locator(`label[for="${inputId}"]`)
        .filter({ hasText: /^Cash$/ })
        .last()
        .click();
      await expect(pointCash).toBeFocused();
      await expect(cashSwitch).toHaveAttribute('aria-checked', switchBefore ?? 'false');
    },
  );
});
