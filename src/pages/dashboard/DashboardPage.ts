import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';

/** The six metric tiles rendered in the "Today's Summary" section, by label. */
export type MetricLabel =
  'Total Order' | 'Sale' | 'Appointments' | 'Total Tip' | 'Total Payment' | 'Gross Sale';

/**
 * Portal landing page after login — the store "Overview" (`/pos/<id>/overview`).
 *
 * The Portal renders NO semantic page headings (the DOM scan reported
 * `headings: []`), so section "headers" are matched as text nodes, and metric /
 * merchant field values are matched by their exact labels or by a format regex.
 * Values that are store- and time-scoped (currency, counts, dates, UUIDs) are
 * matched by pattern, never by a fixed live number.
 */
export class DashboardPage extends BasePage {
  protected readonly path = Urls.DASHBOARD;

  readonly sidebar: Sidebar;
  /**
   * The Portal renders no page <h1>. The sidebar "Overview" entry is the stable
   * "app shell loaded & authenticated" signal, so we treat it as the heading.
   */
  readonly heading: Locator;
  readonly userMenu: Locator;

  // App switcher rail (left icon rail — the `complementary` landmark)
  /** The left icon rail landmark holding the logo, app-switcher buttons + avatar. */
  readonly appRail: Locator;
  /** 'FastboyPay home' anchor (href '/') wrapping the FastboyPay logo image. */
  readonly logoHomeLink: Locator;
  readonly posAppButton: Locator;
  readonly portalAppButton: Locator;
  readonly businessAppButton: Locator;
  readonly giftCardAppButton: Locator;

  // Top bar / store context
  /**
   * Store switcher button in the top bar. Its accessible name is the current
   * store name + id (dynamic, e.g. "Volt POS 14 Dev - Update #14"), so we match
   * the trailing "#<id>" rather than a hardcoded store id or name.
   */
  readonly storeSwitcherButton: Locator;
  readonly toggleSidebarButton: Locator;
  /** The store "Active"/"Inactive" status badge next to the store name in the header. */
  readonly storeStatusBadge: Locator;
  readonly generateTokenButton: Locator;

  // Today's Summary
  readonly todaysSummarySection: Locator;
  /** "View All" in Today's Summary → /pos/<id>/income (distinct from batch's). */
  readonly summaryViewAllLink: Locator;

  // Merchant Information
  readonly merchantInfoSection: Locator;
  /** Merchant email, e.g. "test@email.cc". Value dynamic. */
  readonly merchantEmail: Locator;
  /** Merchant street address line. Value dynamic. */
  readonly merchantAddress: Locator;
  readonly merchantTimezone: Locator;
  readonly merchantWhmcs: Locator;
  readonly merchantPackage: Locator;
  readonly merchantActiveSince: Locator;
  /** The store phone rendered as US "(NNN) NNN-NNNN". Value dynamic. */
  readonly merchantPhone: Locator;
  /** The encryption key rendered as a canonical UUID. Value dynamic. */
  readonly encryptionKey: Locator;
  readonly copyEncryptionKeyButton: Locator;

  // Device Summary
  readonly deviceSummarySection: Locator;
  /** "<n> Total Devices" — fleet size (integer, dynamic). */
  readonly totalDevicesCount: Locator;
  /** "<n> offline" warning badge (integer, dynamic). */
  readonly offlineBadge: Locator;

  // Device Detail modal (opened from a device card)
  /** The device-detail dialog (heading "Device Detail"). role=dialog. */
  readonly deviceDetailDialog: Locator;
  readonly deviceDetailCloseButton: Locator;
  /** The "Connection Status (Last 7 days)" table inside the device-detail modal. */
  readonly connectionStatusTable: Locator;

  // Batch History
  readonly batchHistorySection: Locator;
  /**
   * The Batch History table, scoped by its "BATCH #" column header so it is never
   * confused with the device-detail connection table (DATE/UPTIME/STATUS).
   */
  readonly batchHistoryTable: Locator;
  readonly batchEmptyState: Locator;
  /** "View All" in Batch History → /pos/<id>/batch (distinct from summary's). */
  readonly batchViewAllLink: Locator;

  // Token modal + notifications
  /** The token dialog opened by "Generate Token". role=dialog. */
  readonly tokenDialog: Locator;
  readonly copyTokenButton: Locator;
  /** The polite live region ("Notifications alt+T") that hosts copy/token toasts. */
  readonly notificationsRegion: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.heading = this.sidebar.item('Overview');
    this.userMenu = page.getByRole('button', { name: /open user menu/i });

    // App switcher rail
    this.appRail = page.getByRole('complementary');
    this.logoHomeLink = page.getByRole('link', { name: /fastboypay home/i });
    this.posAppButton = page.getByRole('button', { name: 'POS', exact: true });
    this.portalAppButton = page.getByRole('button', { name: 'Portal', exact: true });
    this.businessAppButton = page.getByRole('button', { name: 'Business', exact: true });
    this.giftCardAppButton = page.getByRole('button', { name: 'Gift Card', exact: true });

    // Top bar / store context
    this.storeSwitcherButton = page.getByRole('button', { name: /#\d+$/ });
    this.toggleSidebarButton = page.getByRole('button', { name: /toggle sidebar/i });
    this.storeStatusBadge = page.getByText(/^(Active|Inactive)$/);
    this.generateTokenButton = page.getByRole('button', { name: /generate token/i });

    // Today's Summary
    this.todaysSummarySection = page.getByText(/Today's Summary/);
    this.summaryViewAllLink = page
      .getByRole('link', { name: /^view all$/i })
      .and(page.locator('a[href$="/income"]'));

    // Merchant Information
    this.merchantInfoSection = page.getByText(/Merchant Information/);
    this.merchantEmail = page.getByText(/^\S+@\S+\.\S+$/);
    this.merchantAddress = page.getByText(/,\s*[A-Z]{2},?\s*\d{5}/);
    this.merchantTimezone = page.getByText(/Timezone:\s*\S+/);
    this.merchantWhmcs = page.getByText(/WHMCS:\s*\d+/);
    this.merchantPackage = page.getByText(/Package:\s*\S/);
    this.merchantActiveSince = page.getByText(/Active since\s+\w+\s+\d{1,2},\s*\d{4}/);
    this.merchantPhone = page.getByText(/\(\d{3}\)\s*\d{3}-\d{4}/);
    // Anchored full-text match so this resolves ONLY to the merchant key span
    // (a bare UUID) — not the device cards' "Device ID: <uuid>" spans, which
    // would otherwise trigger a strict-mode violation once cards render.
    this.encryptionKey = page.getByText(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    this.copyEncryptionKeyButton = page.getByRole('button', { name: /copy encryption key/i });

    // Device Summary
    this.deviceSummarySection = page.getByText(/Device Summary/);
    this.totalDevicesCount = page.getByText(/[\d,]+\s*Total Devices/);
    this.offlineBadge = page.getByText(/[\d,]+\s*offline/);

    // Device Detail modal
    this.deviceDetailDialog = page.getByRole('dialog').filter({ hasText: /Device Detail/i });
    this.deviceDetailCloseButton = this.deviceDetailDialog.getByRole('button', { name: /close/i });
    this.connectionStatusTable = this.deviceDetailDialog.getByRole('table');

    // Batch History
    this.batchHistorySection = page.getByText(/Batch History \(Last 7 days\)/);
    this.batchHistoryTable = page
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'BATCH #' }) });
    this.batchEmptyState = page.getByText(/No batches in the last 7 days\./);
    this.batchViewAllLink = page
      .getByRole('link', { name: /^view all$/i })
      .and(page.locator('a[href$="/batch"]'));

    // Token modal + notifications
    this.tokenDialog = page.getByRole('dialog').filter({ hasNotText: /Device Detail/i });
    this.copyTokenButton = this.tokenDialog.getByRole('button', { name: /copy/i });
    this.notificationsRegion = page.getByRole('region', { name: /notifications/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  // Today's Summary helpers

  /**
   * The label element of a Today's Summary metric tile, matched by exact text
   * (so "Sale" does not also match "Gross Sale"). The tile's value and % delta
   * render adjacent to this label within the same card container.
   */
  metric(label: MetricLabel): Locator {
    return this.page.getByText(label, { exact: true });
  }

  // Store switcher / user menu / sidebar toggle

  async openStoreSwitcher(): Promise<void> {
    await this.storeSwitcherButton.click();
  }

  /**
   * The store switcher button matched against a specific dynamic label, e.g.
   * "Volt POS 14 Dev - Update #14". Use over `storeSwitcherButton` when the
   * exact current-store name needs to be asserted.
   */
  storeSwitcherLabelled(name: string | RegExp): Locator {
    return this.page.getByRole('button', { name });
  }

  /** Merchant business name text, e.g. "Volt POS 14 Dev - Update". Value dynamic. */
  merchantName(name: string | RegExp): Locator {
    return this.page.getByText(name, { exact: false });
  }

  /** A store entry inside the open store-switcher dropdown, by (dynamic) name. */
  storeOption(name: string | RegExp): Locator {
    return this.page.getByRole('menuitem', { name }).or(this.page.getByRole('option', { name }));
  }

  async openUserMenu(): Promise<void> {
    await this.userMenu.first().click();
  }

  /** The logout entry inside the open user menu. */
  get logoutMenuItem(): Locator {
    return this.page.getByRole('menuitem', { name: /log ?out|sign out/i });
  }

  async logout(): Promise<void> {
    await this.userMenu.first().click();
    await this.logoutMenuItem.click();
    await this.page.waitForURL(/\/login/);
  }

  async toggleSidebar(): Promise<void> {
    await this.toggleSidebarButton.click();
  }

  // Device Summary helpers

  /** All rendered device cards (buttons "Open POS #<n> details"). */
  get deviceCards(): Locator {
    return this.page.getByRole('button', { name: /^Open POS #\d+ details$/ });
  }

  /** A single device card button, e.g. deviceCard(1) → "Open POS #1 details". */
  deviceCard(posNumber: number): Locator {
    return this.page.getByRole('button', { name: `Open POS #${posNumber} details` });
  }

  /**
   * The container element for a single device card. The "Open POS #<n>
   * details" button IS the card — all of its fields (status, Device ID, OS,
   * App Version, terminal/printer) render as descendants of the button
   * itself, not of some ancestor wrapper. Walking up to the nearest
   * li/div ancestor overshoots to the shared grid wrapping ALL cards, which
   * causes status/field lookups to strict-mode-violate across every card.
   */
  deviceCardContainer(posNumber: number): Locator {
    return this.deviceCard(posNumber);
  }

  /** The "Online"/"Offline" status text rendered on a specific device card. */
  deviceCardStatus(posNumber: number): Locator {
    return this.deviceCardContainer(posNumber).getByText(/^(Online|Offline)$/);
  }

  /** All device cards currently rendered with an "Offline" status. */
  get offlineDeviceCards(): Locator {
    return this.deviceCards.filter({ hasText: /Offline/ });
  }

  /** Open a device's detail modal by clicking its card. */
  async openDeviceDetails(posNumber: number): Promise<void> {
    await this.deviceCard(posNumber).click();
    await expect(this.deviceDetailDialog).toBeVisible();
  }

  async closeDeviceDetails(): Promise<void> {
    await this.deviceDetailCloseButton.click();
  }

  /**
   * A labelled field inside the device-detail modal (e.g. "OS", "App Version",
   * "Terminal Serial", "Last Connected", "Uptime (7d)"). Matches the label text
   * within the dialog; the value renders adjacent to it.
   */
  deviceDetailField(label: string | RegExp): Locator {
    return this.deviceDetailDialog.getByText(label);
  }

  // Batch History helpers

  /** Data rows of the Batch History table (excludes the header rowgroup). */
  get batchRows(): Locator {
    return this.batchHistoryTable.locator('tbody tr');
  }

  batchColumnHeader(name: string | RegExp): Locator {
    return this.batchHistoryTable.getByRole('columnheader', { name });
  }

  // Generate Token / copy helpers

  async clickGenerateToken(): Promise<void> {
    await this.generateTokenButton.click();
  }

  async copyEncryptionKey(): Promise<void> {
    await this.copyEncryptionKeyButton.click();
  }
}
