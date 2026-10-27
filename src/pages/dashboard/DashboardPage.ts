import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Store "Overview" (`/pos/<seg>/<id>/overview`).
 *
 * Re-mapped to the 2026-10-13 design-system refactor (Linear VP-4569), verified
 * live on 2026-10-20 against stores 100004, 3, 12, 30 and 2502:
 *  - page header: `h1` = merchant name, an Active/Inactive status pill, and a
 *    meta line "Today: <n> orders · $<amount>" with a "View report" link
 *    (→ report-pages/income-summary). The old five-tile "Today's Summary"
 *    section (Total Order / Sale / Appointments / Total Tip / Total Payment) is
 *    gone;
 *  - three `pos-card`s: "Merchant information", "Device summary" ("<n> devices",
 *    a Registration status radiogroup Active/Inactive/All, device rows),
 *    "Batch history (last 7 days)" (table Date / Batch # / Amount / Status or the
 *    "No batches yet" empty state, plus "View all" → /batch);
 *  - removed from the Overview entirely: the "Generate Token" button + token
 *    modal, the merchant encryption key + its copy button, the left icon rail
 *    with the FastboyPay home logo and per-app buttons. App switching now lives
 *    in the sidebar "Switch app" menu; the store switcher is the sidebar button
 *    "<name> #<id>" opening a "Merchant" combobox popover.
 */
export class DashboardPage extends BasePage {
  protected readonly path = Urls.DASHBOARD;

  readonly sidebar: Sidebar;
  /** Page `h1` — the current merchant's name. */
  readonly heading: Locator;
  readonly userMenu: Locator;

  // App switcher (sidebar "Switch app" menu)
  /** The sidebar column (`aside "Sidebar"`) that now hosts the app/store switchers. */
  readonly appRail: Locator;
  readonly appSwitcherButton: Locator;
  readonly appSwitcherMenu: Locator;

  // Store context
  /** Sidebar store switcher button; accessible name "<store name> #<id>". */
  readonly storeSwitcherButton: Locator;
  /** The store "Active"/"Inactive" status pill next to the h1. */
  readonly storeStatusBadge: Locator;

  // Today (header meta line)
  /** "Today: <n> orders · $<amount>" meta line in the page header. */
  readonly todayMeta: Locator;
  /** Alias kept for callers: the old "Today's Summary" is now the header meta line. */
  readonly todaysSummarySection: Locator;
  readonly todayOrders: Locator;
  readonly todaySales: Locator;
  /** "View report" link → /report-pages/income-summary. */
  readonly summaryViewAllLink: Locator;

  // Merchant information
  readonly merchantInfoSection: Locator;
  readonly merchantEmail: Locator;
  readonly merchantAddress: Locator;
  readonly merchantTimezone: Locator;
  readonly merchantWhmcs: Locator;
  readonly merchantPackage: Locator;
  readonly merchantActiveSince: Locator;
  /** The store phone rendered as US "(NNN) NNN-NNNN". */
  readonly merchantPhone: Locator;

  // Device summary
  readonly deviceSummarySection: Locator;
  /** "<n> devices" count in the Device summary card header. */
  readonly totalDevicesCount: Locator;
  readonly registrationStatusGroup: Locator;

  // Device detail dialog
  readonly deviceDetailDialog: Locator;
  readonly deviceDetailCloseButton: Locator;

  // Batch history
  readonly batchHistorySection: Locator;
  readonly batchHistoryTable: Locator;
  readonly batchEmptyState: Locator;
  readonly batchViewAllLink: Locator;

  readonly notificationsRegion: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.userMenu = page.getByRole('button', { name: /open user menu/i });

    this.appRail = page.locator('aside[aria-label="Sidebar"]');
    this.appSwitcherButton = page.getByRole('button', { name: /switch app/i });
    this.appSwitcherMenu = page.getByRole('menu', { name: /switch app/i });

    this.storeSwitcherButton = page.getByRole('button', { name: /#\d+$/ });
    this.storeStatusBadge = page
      .locator('[data-slot="pos-page-status"] [data-slot="pos-status-pill"]')
      .first();

    this.todayMeta = page.locator('[data-slot="pos-page-meta"]');
    this.todaysSummarySection = this.todayMeta;
    this.todayOrders = this.todayMeta.getByText(/^\d[\d,]* orders?$/);
    this.todaySales = this.todayMeta.locator('[data-slot="pos-money"]');
    this.summaryViewAllLink = this.todayMeta.getByRole('link', { name: /view report/i });

    this.merchantInfoSection = this.card(/^merchant information$/i);
    this.merchantEmail = this.merchantInfoSection.getByText(/^\S+@\S+\.\S+$/);
    // A comma-separated address ending in "<postal>, <country>".
    this.merchantAddress = this.merchantInfoSection.getByText(
      /^(?:[^,$\n]+,\s*){2,}\d{4,6},\s*[A-Za-z]{2,4}$/,
    );
    this.merchantTimezone = this.merchantInfoSection.getByText(/^Timezone:\s*\S+/);
    this.merchantWhmcs = this.merchantInfoSection.getByText(/^WHMCS:\s*\d+/);
    this.merchantPackage = this.merchantInfoSection.getByText(/^Package:/);
    this.merchantActiveSince = this.merchantInfoSection.getByText(
      /^Active since\s+\w+\s+\d{1,2},\s*\d{4}/,
    );
    this.merchantPhone = this.merchantInfoSection.locator('[data-slot="pos-masked-phone"]');

    this.deviceSummarySection = this.card(/^device summary$/i);
    this.totalDevicesCount = this.deviceSummarySection.locator(
      '[data-slot="pos-card-description"]',
    );
    this.registrationStatusGroup = page.getByRole('radiogroup', { name: /registration status/i });

    this.deviceDetailDialog = page.getByRole('dialog', { name: /device detail/i });
    this.deviceDetailCloseButton = this.deviceDetailDialog.getByRole('button', {
      name: /^close$/i,
    });

    this.batchHistorySection = this.card(/^batch history \(last 7 days\)$/i);
    this.batchHistoryTable = this.batchHistorySection.getByRole('table');
    this.batchEmptyState = this.batchHistorySection.getByText(/^no batches yet$/i);
    this.batchViewAllLink = this.batchHistorySection.getByRole('link', { name: /^view all$/i });

    this.notificationsRegion = page.getByRole('region', { name: /notifications/i });
  }

  /** A `pos-card` on the page, found by its title. */
  card(title: RegExp): Locator {
    return this.page.locator('[data-slot="pos-card"]').filter({
      has: this.page.locator('[data-slot="pos-card-title"]', { hasText: title }),
    });
  }

  async waitForReady(): Promise<void> {
    // The Overview paints its h1 only after store context + the device fleet
    // load, which on shared DEV regularly takes >10s; use the navigation budget.
    // The h1 can paint empty before the merchant lands, and the sidebar nav
    // hydrates separately — gate on both being populated.
    await expect(this.heading).toHaveText(/\S/, { timeout: Timeouts.NAVIGATION });
    await expect(
      this.page.getByRole('navigation', { name: 'Main' }).getByRole('link').first(),
    ).toBeVisible({ timeout: Timeouts.NAVIGATION });
  }

  /** Parse "309 devices" → 309. */
  async totalDevices(): Promise<number> {
    const text = (await this.totalDevicesCount.innerText()).trim();
    return Number(text.match(/^([\d,]+)\s+devices?$/i)?.[1].replace(/,/g, '') ?? NaN);
  }

  // Store switcher / user menu

  async openStoreSwitcher(): Promise<void> {
    await this.storeSwitcherButton.click();
  }

  /** A store entry inside the open store-switcher popover, by (dynamic) name. */
  storeOption(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  async openUserMenu(): Promise<void> {
    await this.userMenu.first().click();
  }

  get logoutMenuItem(): Locator {
    return this.page.getByRole('menuitem', { name: /log ?out|sign out/i });
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.logoutMenuItem.click();
    await this.page.waitForURL(/\/login/);
  }

  // Device summary helpers

  /** All rendered device rows (buttons "Open POS #<n> details"). */
  get deviceCards(): Locator {
    return this.page.getByRole('button', { name: /^Open POS #\d+ details$/ });
  }

  deviceCard(posNumber: number): Locator {
    return this.page.getByRole('button', { name: `Open POS #${posNumber} details` });
  }

  deviceCardContainer(posNumber: number): Locator {
    return this.deviceCard(posNumber);
  }

  /** The visible "Online" / "Offline · 2h ago" status of a device row. */
  deviceCardStatus(posNumber: number): Locator {
    return this.deviceCard(posNumber).locator('[data-slot="device-row-status"]:visible');
  }

  get offlineDeviceCards(): Locator {
    return this.deviceCards.filter({ hasText: /Offline/ });
  }

  async openDeviceDetails(posNumber: number): Promise<void> {
    await this.deviceCard(posNumber).click();
    await expect(this.deviceDetailDialog).toBeVisible();
  }

  async closeDeviceDetails(): Promise<void> {
    await this.deviceDetailCloseButton.click();
  }

  deviceDetailField(label: string | RegExp): Locator {
    return this.deviceDetailDialog.getByRole('term').filter({ hasText: label });
  }

  // Batch history helpers

  get batchRows(): Locator {
    return this.batchHistoryTable.locator('tbody tr');
  }

  batchColumnHeader(name: string | RegExp): Locator {
    return this.batchHistoryTable.getByRole('columnheader', { name });
  }
}
