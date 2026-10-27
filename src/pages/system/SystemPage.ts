import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';
import { blockMutations } from '@helpers/writeGuard';

/** The three System sub-screens (feature 19), each its own admin route. */
export const SystemSection = {
  VERSIONS: Urls.VERSIONS,
  SETTINGS: Urls.SYSTEM_SETTINGS,
  FEATURES: Urls.FEATURE_FLAGS,
} as const;

export type SystemSectionValue = (typeof SystemSection)[keyof typeof SystemSection];

/** `?tab=` platforms on the App Versions screen. */
export const VersionPlatform = {
  WINDOWS: 'windows',
  ANDROID: 'android',
} as const;

export type VersionPlatformValue = (typeof VersionPlatform)[keyof typeof VersionPlatform];

/**
 * System (Internal) — App Versions / Settings / Feature Flags.
 *
 * Feature 19 is three routes that share the admin table shell:
 *  - `/admin/versions`  — Windows / Android tabs; each version row has one
 *    primary action + a "⋯" menu (Pause / Download / View change history /
 *    Deprecate). Android builds show "Waiting for KPP" with an Upload KPP action.
 *  - `/admin/setting`   — global sys_setting rows (Setting / key / Value / App /
 *    Last updated); complex ones open a detail page `/admin/setting/<id>`.
 *  - `/admin/features`  — feature flags (Enabled/Disabled, Version, Scope).
 *
 * SAFETY: publishing/pausing/deprecating a version, saving a system setting and
 * toggling a feature flag are all platform-wide writes. Call {@link blockWrites}
 * before `open()`.
 */
export class SystemPage extends BasePage {
  // Default path is Versions; `open()` switches section.
  protected readonly path = Urls.VERSIONS;

  readonly sidebar: Sidebar;
  readonly table: DataTable;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
  }

  async waitForReady(): Promise<void> {
    await expect(this.pageHeader.first()).toBeVisible();
    await expect(
      this.table.rows
        .first()
        .or(this.page.locator('[data-slot="pos-data-table-empty"]'))
        .or(this.page.locator('[data-slot="empty"]:visible')),
    ).toBeVisible({ timeout: 30_000 });
  }

  /** Open one of the three System sub-screens. */
  async open(section: SystemSectionValue, platform?: VersionPlatformValue): Promise<void> {
    const url = platform ? `${section}?tab=${platform}` : section;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  get pageHeader(): Locator {
    return this.page.locator('[data-slot="pos-page-header"]');
  }

  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  // --- Versions -------------------------------------------------------------

  get tabs(): Locator {
    return this.page.getByRole('tab');
  }

  tab(name: string | RegExp): Locator {
    return this.page.getByRole('tab', { name });
  }

  get fetchVersionsButton(): Locator {
    return this.page.getByRole('button', { name: /fetch versions/i });
  }

  /** Android "Upload KPP" action on a waiting build. */
  get uploadKppButton(): Locator {
    return this.page.getByRole('button', { name: /upload kpp/i });
  }

  /** Row-level "⋯" more-menu trigger (defaults to first row). */
  rowMenu(rowIndex = 0): Locator {
    return this.table.rows.nth(rowIndex).getByRole('button', { name: /actions|more|open menu/i });
  }

  // --- Settings -------------------------------------------------------------

  /** A settings row by its visible setting name / key. */
  settingRow(nameOrKey: string | RegExp): Locator {
    return this.table.rows.filter({ hasText: nameOrKey }).first();
  }

  // --- Feature Flags --------------------------------------------------------

  /**
   * A feature-flag row's state control. The 2026-10 redesign replaced the inline
   * `role="switch"` with an "Enabled"/"Disabled" status; the flag is changed from
   * the row's Actions (⋯) menu (see {@link rowMenu}).
   */
  featureToggle(rowIndex = 0): Locator {
    return this.table.rows.nth(rowIndex).getByText(/^(Enabled|Disabled)$/);
  }

  /** Scope label of a feature-flag / setting row ("Global" / "By merchant"). */
  scopeLabel(rowIndex = 0): Locator {
    return this.table.rows
      .nth(rowIndex)
      .getByText(/global|by merchant|merchant/i)
      .first();
  }

  // --- Safety ---------------------------------------------------------------

  /** Abort version/setting/feature writes. Call BEFORE `open()`. */
  async blockWrites(): Promise<string[]> {
    return blockMutations(this.page, (url) =>
      /\/(versions?|sys_settings?|setting|features?|sys_features?|publish|pause|deprecate)(\/|\?|$)/i.test(
        url.pathname + url.search,
      ),
    );
  }
}
