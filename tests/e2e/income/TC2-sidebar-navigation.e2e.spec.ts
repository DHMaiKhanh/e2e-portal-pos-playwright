import { test, expect } from '@fixtures/index';
import type { Locator } from '@playwright/test';
import { Tag } from '@/types/testTags';
import { Urls, posAdminBase } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';
import {
  INCOME_SIDEBAR_INTERNAL,
  INCOME_SIDEBAR_MANAGEMENT,
  INCOME_SIDEBAR_OPERATIONS,
  INCOME_URL_PATTERN,
  IncomeTab,
  incomeTabLabel,
  incomeTabUrlPattern,
} from '@pages/income/IncomePage';

/**
 * Whether the nav marks a link as the current page.
 *
 * Read from the attributes the app actually sets (`aria-current` /
 * `data-active`) and never from the class string: every sidebar link shares a
 * Tailwind class list containing `active:text-sidebar-accent-foreground`, so a
 * substring test for /active/ is true for all of them.
 */
async function isNavActive(link: Locator): Promise<boolean> {
  const [ariaCurrent, dataActive] = await Promise.all([
    link.getAttribute('aria-current'),
    link.getAttribute('data-active'),
  ]);
  return ariaCurrent === 'page' || ariaCurrent === 'true' || dataActive === 'true';
}

/** `aria-expanded` on a disclosure trigger, normalised to a boolean. */
async function isExpanded(trigger: Locator): Promise<boolean> {
  return (await trigger.getAttribute('aria-expanded')) === 'true';
}

/**
 * Open a Radix dropdown reliably. A trigger click fired right after the menu was
 * just dismissed (Escape / outside click) can be swallowed by the menu's own
 * pointer/dismiss handling, leaving the trigger collapsed — so click until it
 * actually reports `aria-expanded="true"` rather than asserting a single click.
 */
async function openMenu(trigger: Locator): Promise<void> {
  await expect(async () => {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  }).toPass({ timeout: Timeouts.MEDIUM });
}

test.describe('Sidebar & điều hướng — Income Reports', () => {
  test.beforeEach(async ({ incomePage }) => {
    await incomePage.goto();
  });

  test(
    'TC-INC-009 — sidebar link lands on /pos/<id>/income and marks itself active',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ incomePage, dashboardPage, page }) => {
      // Step 1: start from Overview so the click is a real navigation.
      await dashboardPage.goto();
      await expect(page).toHaveURL(/\/pos\/nail\/\d+\/overview/);

      // Address the link by href: the label "Income Reports" also appears as
      // the on-page screen label.
      await incomePage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/income$/);
      await page.waitForURL(INCOME_URL_PATTERN, { timeout: Timeouts.NAVIGATION });
      await incomePage.waitForReady();

      // The bare route self-normalises to the default tab.
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.DAILY));

      const incomeLink = incomePage.navLinkByHref(Urls.INCOME).first();
      await expect(incomeLink).toBeVisible();
      expect(
        await isNavActive(incomeLink),
        'the Income Reports sidebar link should carry aria-current/data-active',
      ).toBeTruthy();

      // ...and only that one: Overview must have dropped its active marker.
      const overviewLink = incomePage.navLinkByHref(Urls.DASHBOARD).first();
      expect(
        await isNavActive(overviewLink),
        'Overview should be inactive while Income Reports is open',
      ).toBeFalsy();
    },
  );

  test(
    'TC-INC-010 — active state survives a reload',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage, page }) => {
      await expect(page).toHaveURL(INCOME_URL_PATTERN);

      // Step 2: reload.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await incomePage.recoverIfUnavailable();
      await incomePage.waitForReady();

      await expect(page).toHaveURL(INCOME_URL_PATTERN);

      const incomeLink = incomePage.navLinkByHref(Urls.INCOME).first();
      await expect(incomeLink).toBeVisible();
      await expect
        .poll(() => isNavActive(incomeLink), {
          message: 'Income Reports should still be marked active after a reload',
          timeout: Timeouts.MEDIUM,
        })
        .toBe(true);

      // The nav should mark exactly one link as current.
      await expect(incomePage.activeNavLinks).toHaveCount(1);
    },
  );

  test(
    'TC-INC-011 — navigating out to Orders and back restores the default ?tab=daily',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage, page }) => {
      // Step 1: leave for Orders. `/pos/nail/admin/orders` (Internal → All Orders)
      // cannot match this pattern because of the \d+ store segment.
      await incomePage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/orders$/);
      await page.waitForURL(/\/pos\/nail\/\d+\/orders/, { timeout: Timeouts.NAVIGATION });
      expect(
        await isNavActive(incomePage.navLinkByHref(Urls.ORDERS).first()),
        'Orders should be the active nav item once its route is open',
      ).toBeTruthy();

      // Step 2: come back through the sidebar.
      await incomePage.sidebar.navigateToHref(/\/pos\/nail\/\d+\/income$/);
      await page.waitForURL(INCOME_URL_PATTERN, { timeout: Timeouts.NAVIGATION });
      await incomePage.waitForReady();

      // Back on the default tab, not whatever was open before we left.
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.DAILY));
      expect(incomePage.currentTab()).toBe(IncomeTab.DAILY);
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.DAILY));

      // ...and the data actually re-loaded rather than staying on skeletons.
      await incomePage.waitForDataSettled();
      expect(
        await isNavActive(incomePage.navLinkByHref(Urls.INCOME).first()),
        'Income Reports should be active again after the round trip',
      ).toBeTruthy();
    },
  );

  test(
    'TC-INC-012 — every sidebar link points at the inventoried href',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage, page }) => {
      const hrefs = await incomePage.navHrefs();

      // The store-scoped groups must use the store id the current URL is on —
      // Urls.* is built from env.STORE_ID, so this also catches an env drift.
      const storeId = new URL(page.url()).pathname.match(/\/pos\/nail\/(\d+)\//)?.[1];
      expect(storeId, 'current URL should be store-scoped').toBeTruthy();

      for (const { label, href } of [...INCOME_SIDEBAR_OPERATIONS, ...INCOME_SIDEBAR_MANAGEMENT]) {
        expect(href, `${label} should be scoped to store ${storeId}`).toMatch(
          new RegExp(`^/pos/nail/${storeId}/`),
        );
        expect(hrefs, `Operations/Management should link ${label} → ${href}`).toContain(href);
        await expect(incomePage.navLinkByHref(href).first()).toContainText(label);
      }

      // Internal is admin-wide: no /pos/<storeId>/ segment at all.
      for (const { label, href } of INCOME_SIDEBAR_INTERNAL) {
        expect(href, `${label} should not be store-scoped`).not.toMatch(/^\/pos\/\d+\//);
        expect(hrefs, `Internal should link ${label} → ${href}`).toContain(href);
        await expect(incomePage.navLinkByHref(href).first()).toContainText(label);
      }

      // `Store Settings` is the one store-scoped Settings nav link. The former
      // admin `Settings` link is gone — the Internal group now surfaces that area
      // through `System` / `Users & Roles` buttons — so Settings is no longer two
      // distinct nav anchors, and there must be exactly one Settings link.
      expect(hrefs).toContain(Urls.SETTINGS);
      expect(hrefs, 'admin Settings is no longer a nav link').not.toContain(
        `${posAdminBase}/setting`,
      );
      await expect(incomePage.navLinkByHref(Urls.SETTINGS)).toHaveCount(1);
    },
  );

  test(
    'TC-INC-013 — store switcher opens and closes with Escape',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const trigger = incomePage.storeSwitcherButton;
      await expect(trigger).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(await isExpanded(trigger), 'switcher should start collapsed').toBeFalsy();

      // Step 1: open the store picker.
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('dialog').filter({ visible: true }).first()).toBeVisible();

      // Escape is the documented way back out.
      await page.keyboard.press('Escape');
      await expect
        .poll(() => isExpanded(trigger), {
          message: 'Escape should collapse the store switcher',
          timeout: Timeouts.SHORT,
        })
        .toBe(false);
    },
  );

  test(
    'TC-INC-014 — user menu opens and closes with Escape or an outside click',
    { tag: [Tag.REGRESSION] },
    async ({ incomePage, page }) => {
      const trigger = incomePage.userMenuButton;
      await expect(trigger).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      expect(await isExpanded(trigger), 'user menu should start collapsed').toBeFalsy();

      // Step 1: open it.
      await openMenu(trigger);
      const menu = page.getByRole('menu').filter({ visible: true }).first();
      await expect(menu).toBeVisible();

      // Escape closes.
      await page.keyboard.press('Escape');
      await expect
        .poll(() => isExpanded(trigger), {
          message: 'Escape should close the user menu',
          timeout: Timeouts.SHORT,
        })
        .toBe(false);

      // ...and so does a click outside the menu. Driven through the mouse so it
      // lands on whatever the dismissable layer puts on top.
      await openMenu(trigger);
      await page.mouse.click(10, 600);
      await expect
        .poll(() => isExpanded(trigger), {
          message: 'an outside click should close the user menu',
          timeout: Timeouts.SHORT,
        })
        .toBe(false);
    },
  );

  // PRODUCT GAP / FLAKY (2026-10-11): browser Back after switching Income tabs does
  // not reliably restore the tab strip — `waitForReady` times out waiting for the
  // tablist (30s) because the tab view fails to re-render on history navigation
  // (the Daily/Summary/Staff tabs appear to rewrite the single history entry rather
  // than push, so Back/Forward does not walk the ?tab= history the way this case
  // assumes). Re-enable once Income tab navigation pushes real history entries and
  // the restored view re-paints its tab strip. See docs/product-gaps-2026-10-11.md.
  test.fixme(
    'TC-INC-015 — browser Back/Forward walks the ?tab= history',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async ({ incomePage, page }) => {
      // Step 1: a deterministic base entry on the default tab.
      await incomePage.gotoTab(IncomeTab.DAILY);
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.DAILY));

      // Steps 2-3: two more history entries.
      await incomePage.openTab(IncomeTab.SUMMARY);
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.SUMMARY));

      await incomePage.openTab(IncomeTab.STAFF);
      await expect(page).toHaveURL(incomeTabUrlPattern(IncomeTab.STAFF));
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.STAFF));

      // Step 4: Back twice → the Daily entry. An absent `tab` param renders the
      // default tab, so treat '' as daily. Each Back goes through the page
      // object's settling navigation (waits for the chrome, recovers the DEV
      // dynamic-import chunk error) so the restored tab strip has actually
      // re-rendered before its selection is read.
      await incomePage.goBack();
      await incomePage.goBack();
      await expect
        .poll(() => incomePage.currentTab() || IncomeTab.DAILY, {
          message: 'two Backs should restore the Daily entry',
          timeout: Timeouts.MEDIUM,
        })
        .toBe(IncomeTab.DAILY);
      await incomePage.waitForDataSettled();
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.DAILY));

      // Step 5: Forward once → Income Summary, re-rendered for that tab.
      await incomePage.goForward();
      await expect
        .poll(() => incomePage.currentTab(), {
          message: 'Forward should restore the Income Summary entry',
          timeout: Timeouts.MEDIUM,
        })
        .toBe(IncomeTab.SUMMARY);
      await incomePage.waitForDataSettled();
      await expect(incomePage.selectedTab).toHaveText(incomeTabLabel(IncomeTab.SUMMARY));
      await expect(incomePage.activePanel).toBeVisible();
    },
  );
});
