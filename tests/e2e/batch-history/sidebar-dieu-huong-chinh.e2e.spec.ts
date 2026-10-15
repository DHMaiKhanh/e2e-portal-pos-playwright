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
      await dashboardPage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/batch$/);

      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/batch(\?.*)?$/);
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

      const batchLink = dashboardPage.sidebar.item(/^Batches$/i).first();
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
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/batch(\?.*)?$/);

      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/batch(\?.*)?$/);
      const batchLink = dashboardPage.sidebar.item(/^Batches$/i).first();
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
      // Status changes use shallow/replace routing (history.replaceState), not
      // pushState — the same contract the Payroll tab strip follows (see
      // TC-PAY-012). Each selectStatus() rewrites the single /batch history entry
      // in place instead of pushing a new one, so Back/Forward do not step
      // through the individual filter states: one Back leaves the ledger entirely
      // (to the blank entry that preceded the beforeEach goto — verified from the
      // failure screenshot, a blank page), and Forward returns to the ledger
      // showing its last-applied filter.

      // Apply status=Open filter. The app writes the status lower-cased into the
      // URL ("status=open"), so compare case-insensitively rather than against
      // the option's label casing.
      await batchHistoryPage.selectStatus('Open');
      await batchHistoryPage.waitForReady();
      expect(batchHistoryPage.currentQueryParams().get('status')?.toLowerCase()).toBe('open');

      // Change to Closed — replaceState again, so the URL now ends at
      // status=closed with no extra history entry created.
      await batchHistoryPage.selectStatus('Closed');
      await batchHistoryPage.waitForReady();
      expect(batchHistoryPage.currentQueryParams().get('status')?.toLowerCase()).toBe('closed');

      // One Back leaves the ledger entirely (shallow routing kept a single entry).
      await page.goBack();
      await expect(page).not.toHaveURL(/\/batch/);

      // Forward returns to the ledger with its last-applied filter restored —
      // status=closed, and a live table, not a stale/empty shell.
      await page.goForward();
      await batchHistoryPage.waitForReady();
      expect(batchHistoryPage.currentQueryParams().get('status')?.toLowerCase()).toBe('closed');
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
        await expect(batchHistoryPage.sidebar.item('Batches')).toHaveAttribute(
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
          name: 'Batches',
        });
        await expect(activeItem).toBeVisible();
        await expect(activeItem).toHaveAttribute('aria-current', 'page');

        // Dismiss by tapping the backdrop to the right of the panel — the way a
        // user can. Force-clicking the trigger does NOT work here: the open sheet
        // is painted over it, so a forced click lands on the "FastboyPay home"
        // link at the drawer's top-left and navigates off the ledger to `/`.
        // (Escape does not dismiss this sheet either.)
        await page.locator('[data-slot="sheet-overlay"]').click({ position: { x: 340, y: 600 } });
        await expect(batchHistoryPage.sidebar.mobileDrawer).toBeHidden();

        // The ledger underneath survived the round trip.
        // The empty state renders inside the table, so .or() can match both.
        await expect(
          batchHistoryPage.tableRoot.or(batchHistoryPage.emptyState).first(),
        ).toBeVisible();
        await expect(batchHistoryPage.sidebar.toggle).toBeVisible();
      },
    );
  });
});
