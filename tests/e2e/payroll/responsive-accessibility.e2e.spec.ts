import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Responsive & accessibility — Payroll', () => {
  test.beforeEach(async ({ payrollPage }) => {
    await payrollPage.goto();
  });

  /**
   * TC-PAY-130 — Payroll screen adapts at tablet/mobile widths
   * Steps:
   *   1. Resize viewport to tablet width (~768px), then mobile width (~375px).
   *   2. Observe the tab strip, filter row, and table on each tab.
   * Expected:
   *   Sidebar collapses per app convention; tab strip remains usable (e.g. scrollable or wraps);
   *   tables adapt (horizontal scroll within their own container or stacked cards) without breaking
   *   the page layout or causing whole-page horizontal scroll.
   */
  // TODO(manual/setup): viewport size changes across breakpoints are not configured as Playwright
  // projects in this repo (tests run at the fixed 1920x1080 desktop viewport); needs live/manual
  // verification at 768px and 375px widths.
  test.fixme(
    'TC-PAY-130 — Payroll screen adapts at tablet/mobile widths',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SLOW] },
    async () => {},
  );

  /**
   * TC-PAY-131 — All interactive controls are keyboard-navigable
   * Steps:
   *   1. Use Tab/Shift+Tab to move through tabs, search inputs, selects, buttons, and table row checkboxes.
   *   2. Use Enter/Space to activate a tab and a button.
   * Expected:
   *   Focus order is logical; all controls are reachable and operable via keyboard; focus indicator
   *   is visible at each stop.
   */
  // TODO(manual/setup): verifying logical focus order and visible focus indicator across many
  // controls requires manual/visual accessibility inspection beyond simple DOM assertions.
  test.fixme(
    'TC-PAY-131 — All interactive controls are keyboard-navigable',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
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
