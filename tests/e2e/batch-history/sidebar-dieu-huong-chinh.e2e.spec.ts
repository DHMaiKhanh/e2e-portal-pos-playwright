import { test, expect } from '@fixtures/index';
import type { Locator } from '@playwright/test';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';

test.describe('Sidebar / điều hướng chính — Batch History', () => {
  test.beforeEach(async ({ batchHistoryPage }) => {
    await batchHistoryPage.goto();
  });

  test(
    'TC-BH-006 — link "Batch History" trên sidebar điều hướng đúng và highlight active',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ dashboardPage, batchHistoryPage, page }) => {
      // Start from a different screen, then navigate to Batch History via sidebar.
      await dashboardPage.goto();
      await dashboardPage.sidebar.navigateToHref(/\/pos\/\d+\/batch$/);

      await expect(page).toHaveURL(/\/pos\/\d+\/batch(\?.*)?$/);
      await expect(batchHistoryPage.heading).toBeVisible();

      // Read the highlight from the attributes the app actually sets:
      // aria-current="page" plus data-active. The old check also sniffed the
      // class string for /active|selected|current/, which matched EVERY sidebar
      // link — the shared Tailwind class list contains
      // "active:text-sidebar-accent-foreground", so the substring test was true
      // even for inactive items. That made the "others are inactive" assertion
      // below impossible to satisfy while telling us nothing about the real
      // state.
      const isHighlighted = async (link: Locator): Promise<boolean> => {
        const [ariaCurrent, dataActive] = await Promise.all([
          link.getAttribute('aria-current'),
          link.getAttribute('data-active'),
        ]);
        return ariaCurrent === 'page' || ariaCurrent === 'true' || dataActive === 'true';
      };

      const batchLink = dashboardPage.sidebar.item(/Batch History/i).first();
      await expect(batchLink).toBeVisible();
      expect(
        await isHighlighted(batchLink),
        'Batch History sidebar link should show an active/highlight state',
      ).toBeTruthy();

      const overviewLink = dashboardPage.sidebar.item('Overview').first();
      expect(
        await isHighlighted(overviewLink),
        'Other sidebar items (e.g. Overview) should be inactive while on Batch History',
      ).toBeFalsy();
    },
  );

  test(
    'TC-BH-007 — trạng thái active vẫn giữ nguyên sau khi reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ dashboardPage, page }) => {
      await expect(page).toHaveURL(/\/pos\/\d+\/batch(\?.*)?$/);

      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/pos\/\d+\/batch(\?.*)?$/);
      const batchLink = dashboardPage.sidebar.item(/Batch History/i).first();
      await expect(batchLink).toBeVisible();
      // Same attribute-based check as TC-BH-006. The old class-substring test
      // passed for any link at all (Tailwind's "active:" variant is in every
      // sidebar item's class list), so it could never have caught a regression.
      const [ariaCurrent, dataActive] = await Promise.all([
        batchLink.getAttribute('aria-current'),
        batchLink.getAttribute('data-active'),
      ]);
      expect(
        ariaCurrent === 'page' || ariaCurrent === 'true' || dataActive === 'true',
        'Batch History sidebar link should remain highlighted after reload',
      ).toBeTruthy();
    },
  );

  test(
    'TC-BH-008 — nút Back/Forward của trình duyệt khôi phục đúng trạng thái filter',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage, page }) => {
      // Apply status=Open filter.
      await batchHistoryPage.selectStatus('Open');
      await batchHistoryPage.waitForReady();
      const paramsAfterOpen = batchHistoryPage.currentQueryParams();
      // The app writes the status lower-cased into the URL ("status=open"), so
      // compare case-insensitively rather than against the option's label casing.
      expect(paramsAfterOpen.get('status')?.toLowerCase()).toBe('open');

      // Change to Closed to create a second history entry with different params.
      await batchHistoryPage.selectStatus('Closed');
      await batchHistoryPage.waitForReady();
      const paramsAfterClosed = batchHistoryPage.currentQueryParams();
      expect(paramsAfterClosed.get('status')?.toLowerCase()).toBe('closed');

      // Back should restore the Open state.
      await page.goBack();
      await batchHistoryPage.waitForReady();
      const paramsAfterBack = batchHistoryPage.currentQueryParams();
      expect(paramsAfterBack.get('status')?.toLowerCase()).toBe('open');

      // Forward should re-apply the Closed state — not a stale/empty table.
      await page.goForward();
      await batchHistoryPage.waitForReady();
      const paramsAfterForward = batchHistoryPage.currentQueryParams();
      expect(paramsAfterForward.get('status')?.toLowerCase()).toBe('closed');
      await expect(batchHistoryPage.tableRoot).toBeVisible();
    },
  );

  /**
   * Steps:
   * 1. Ở Batch History, bấm nút thu gọn sidebar.
   * Expected:
   * Sidebar thu gọn về dạng chỉ icon; nội dung chính reflow lại; bấm lần nữa
   * khôi phục về trạng thái mở rộng, "Batch History" vẫn được highlight.
   */
  /**
   * Live verification changed what this case can assert. There is no desktop
   * collapse button: from 768px up the nav is a permanent 218px column with the
   * trigger present but hidden. The collapse affordance only exists at mobile
   * widths, where the column is replaced by a drawer the trigger opens.
   *
   * So the case now covers both halves of that contract on this screen.
   */
  test(
    'TC-BH-009 — thu gọn/mở sidebar hoạt động đúng trên màn hình này',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ batchHistoryPage }) => {
      await test.step('Desktop: the nav is permanently expanded, with no collapse control', async () => {
        await batchHistoryPage.waitForReady();
        await expect(batchHistoryPage.sidebar.panel).toBeVisible();
        await expect(batchHistoryPage.sidebar.toggle).toBeHidden();
        await expect(batchHistoryPage.sidebar.item('Batch History')).toHaveAttribute(
          'aria-current',
          'page',
        );
      });
    },
  );

  test.describe('mobile width', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test(
      'TC-BH-009b — ở mobile, nút thu gọn mở/đóng sidebar và giữ highlight Batch History',
      { tag: [Tag.REGRESSION, Tag.UI] },
      async ({ batchHistoryPage, page }) => {
        // Not batchHistoryPage.goto(): its readiness check waits on the page
        // heading, which the mobile layout does not render.
        await page.goto(Urls.BATCH_HISTORY, { waitUntil: 'domcontentloaded' });

        // The permanent column is gone; the nav lives behind the trigger.
        await expect(batchHistoryPage.sidebar.toggle).toBeVisible();
        await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0);

        await batchHistoryPage.sidebar.toggle.click();
        await expect(batchHistoryPage.sidebar.mobileDrawer).toBeVisible();
        const activeItem = batchHistoryPage.sidebar.mobileDrawer.getByRole('link', {
          name: 'Batch History',
        });
        await expect(activeItem).toBeVisible();
        await expect(activeItem).toHaveAttribute('aria-current', 'page');

        // Pressing the trigger again is the documented way back — Escape does
        // not dismiss this drawer (observed live; noted rather than asserted so
        // this case does not lock in that behaviour either way).
        await batchHistoryPage.sidebar.toggle.click({ force: true });
        await expect(batchHistoryPage.sidebar.mobileDrawer).toBeHidden();

        // The ledger underneath survived the round trip.
        await expect(batchHistoryPage.tableRoot.or(batchHistoryPage.emptyState)).toBeVisible();
        await expect(batchHistoryPage.sidebar.toggle).toBeVisible();
      },
    );
  });
});
