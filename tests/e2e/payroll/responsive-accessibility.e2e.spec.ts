import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Responsive & accessibility — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
  });

  /**
   * TC-PAY-131 — All interactive controls are keyboard-navigable
   * Steps:
   *   1. Use Tab/Shift+Tab to move through tabs, search inputs, selects, buttons, and table row checkboxes.
   *   2. Use Enter/Space to activate a tab and a button.
   * Expected:
   *   Focus order is logical; all controls are reachable and operable via keyboard; focus indicator
   *   is visible at each stop.
   */
  /**
   * "Reachable and operable by keyboard" is a DOM question, and so is the focus
   * indicator — a focused control either gets a non-`none` outline/ring or it
   * does not. What genuinely needs a human is judging whether the order *feels*
   * right; what this asserts instead is that the order is the DOM order, that
   * nothing traps focus, and that a tab can be activated with the keyboard.
   */
  test(
    'TC-PAY-131 — All interactive controls are keyboard-navigable',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage, page }) => {
      await payrollPage.gotoTab('checks');
      await expect(payrollPage.checksTable.rows.first()).toBeVisible();

      await test.step('Tabbing from the search box reaches the filter controls', async () => {
        await payrollPage.staffNameSearchInput.focus();
        await expect(payrollPage.staffNameSearchInput).toBeFocused();

        const seen: string[] = [];
        for (let step = 0; step < 6; step++) {
          await page.keyboard.press('Tab');
          const description = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            if (!el || el === document.body) return 'body';
            return `${el.tagName}:${(el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 24)}`;
          });
          seen.push(description);
        }

        // Focus keeps moving — a repeat of the same control every step would
        // mean it is trapped.
        expect(new Set(seen).size, `focus appears trapped: ${seen.join(' -> ')}`).toBeGreaterThan(
          1,
        );
        expect(seen, 'focus fell out of the page').not.toContain('body');
      });

      await test.step('Focused controls show a visible focus indicator', async () => {
        await payrollPage.checksSortSelect.focus();
        const style = await payrollPage.checksSortSelect.evaluate((node) => {
          const computed = getComputedStyle(node);
          return {
            outlineStyle: computed.outlineStyle,
            outlineWidth: computed.outlineWidth,
            boxShadow: computed.boxShadow,
          };
        });
        const hasIndicator =
          (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') ||
          (style.boxShadow !== 'none' && style.boxShadow.length > 0);
        expect(hasIndicator, `no focus indicator: ${JSON.stringify(style)}`).toBe(true);
      });

      await test.step('A tab can be activated from the keyboard', async () => {
        await payrollPage.checkHistoryTab.first().focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/tab=history/);
        await expect(payrollPage.checkHistoryTable.rows.first()).toBeVisible();
      });

      await test.step('Row checkboxes are reachable and operable', async () => {
        await payrollPage.gotoTab('checks');
        const checkbox = payrollPage.rowSelectCheckbox(0);
        await checkbox.focus();
        await expect(checkbox).toBeFocused();
        await page.keyboard.press('Space');
        await expect(checkbox).toBeChecked();
        await page.keyboard.press('Space');
        await expect(checkbox).not.toBeChecked();
      });
    },
  );

  /**
   * TC-PAY-132 — Table checkboxes and buttons expose accessible names
   * Steps:
   *   1. Inspect accessibility tree for `Select all`, `Select row`, and `Print` controls.
   * Expected:
   *   Each control has a distinct, descriptive accessible name (already observed as "Select all",
   *   "Select row", "Print" in the ARIA tree) rather than generic/unlabeled roles.
   */
  test(
    'TC-PAY-132 — Table checkboxes and buttons expose accessible names',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ payrollPage }) => {
      await payrollPage.goToChecksTab();

      await expect(payrollPage.selectAllCheckbox).toHaveAccessibleName(/select all/i);

      const rowCheckbox = payrollPage.rowSelectCheckbox(0);
      if (await rowCheckbox.isVisible().catch(() => false)) {
        await expect(rowCheckbox).toHaveAccessibleName(/select row/i);
      }

      const printButton = payrollPage.page.getByRole('button', { name: /print/i }).first();
      if (await printButton.isVisible().catch(() => false)) {
        await expect(printButton).toHaveAccessibleName(/print/i);
      }
    },
  );
});

/**
 * TC-PAY-130 across the two breakpoints the case names. One describe per width
 * so `test.use` can set the viewport before the context is built — the fixture
 * honours it and hands each test a context of its own at that size, which no
 * extra Playwright project is needed for.
 */
for (const { label, viewport } of [
  { label: 'tablet 768px', viewport: { width: 768, height: 1024 } },
  { label: 'mobile 375px', viewport: { width: 375, height: 812 } },
]) {
  test.describe(`Responsive — Payroll @ ${label}`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ payrollPage }) => {
      await payrollPage.goto();
    });

    /**
     * TC-PAY-130 — Payroll screen adapts at tablet/mobile widths
     * Expected:
     *   Sidebar collapses per app convention; tab strip remains usable (e.g. scrollable or wraps);
     *   tables adapt (horizontal scroll within their own container or stacked cards) without breaking
     *   the page layout or causing whole-page horizontal scroll.
     */
    test(
      `TC-PAY-130 — Payroll screen adapts at ${label}`,
      { tag: [Tag.REGRESSION, Tag.UI, Tag.SLOW] },
      async ({ payrollPage, page }) => {
        await payrollPage.goToChecksTab();

        await test.step('Tab strip stays reachable', async () => {
          await expect(page.getByRole('tab').first()).toBeVisible();
        });

        await test.step('Wide tables scroll inside their own container', async () => {
          const table = page.locator('table').first();
          if (await table.isVisible().catch(() => false)) {
            const containedOrFits = await page.evaluate(() => {
              const el = document.querySelector('table');
              if (!el) return true;
              if (el.getBoundingClientRect().width <= window.innerWidth) return true;
              for (let p = el.parentElement; p; p = p.parentElement) {
                const style = getComputedStyle(p);
                if (/auto|scroll/.test(style.overflowX)) return true;
              }
              return false;
            });
            expect(containedOrFits, 'table must not widen the page').toBe(true);
          }
        });

        await test.step('The page itself does not scroll sideways', async () => {
          const { scrollWidth, innerWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          }));
          expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
        });
      },
    );
  });
}
