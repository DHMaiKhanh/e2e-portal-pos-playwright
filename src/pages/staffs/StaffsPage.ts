import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Pagination } from '@components/Pagination';
import { BaseModal } from '@components/modal/BaseModal';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Timeouts } from '@configs/constants/timeouts';
import { Urls } from '@constants/urls';

/** Staffs (Nhân viên) list screen. */
export class StaffsPage extends BasePage {
  protected readonly path = Urls.STAFFS;

  readonly sidebar: Sidebar;
  readonly table: DataTable;
  readonly pagination: Pagination;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly sortFilter: Locator;
  readonly exportButton: Locator;
  readonly createButton: Locator;
  readonly resultsFooter: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.table = new DataTable(page, page.getByRole('table'));
    this.pagination = new Pagination(page);
    this.searchInput = page.getByPlaceholder(/search by nick name, staff code, phone/i);
    this.statusFilter = page.getByRole('combobox').filter({ hasText: /^active$|^inactive$/i });
    this.sortFilter = page.getByRole('combobox').filter({ hasText: /newest first|oldest first/i });
    this.exportButton = page.getByRole('button', { name: /^export$/i });
    this.createButton = page.getByRole('button', { name: /^create$/i });
    this.resultsFooter = page.getByText(/showing \d+ to \d+ of \d+ results/i);
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    // Wait for the data fetch to resolve so callers don't click/assert on rows
    // that are still skeleton placeholders (hydration/loading race).
    await expect(this.resultsFooter).toBeVisible();
    const firstRowOrEmpty = this.table.rows.first().or(this.emptyState);
    await expect(firstRowOrEmpty).toBeVisible();
    if (await this.table.rows.first().isVisible()) {
      await expect(this.table.rows.first()).not.toHaveText('', { timeout: 15_000 });
    }
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(400);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
    await this.page.waitForTimeout(400);
  }

  async openCreateDialog(): Promise<CreateStaffDialog> {
    await this.createButton.click();
    const dialog = new CreateStaffDialog(this.page);
    await dialog.waitForVisible();
    return dialog;
  }

  async openExportDialog(): Promise<ExportStaffDialog> {
    await this.exportButton.click();
    const dialog = new ExportStaffDialog(this.page);
    await dialog.waitForVisible();
    return dialog;
  }

  async openStaffRow(text: string): Promise<void> {
    await this.table.rowContaining(text).click();
  }

  get pageIndicator(): Locator {
    return this.page.getByText(/^\d+\s*\/\s*\d+$/);
  }

  /** Column headers, in doc order: STAFF, PHONE, EMAIL, CODE, JOINED AT, STATUS. */
  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  columnHeader(name: RegExp): Locator {
    return this.page.getByRole('table').getByRole('columnheader', { name });
  }

  /** Empty-state text shown when the table has zero matching rows. */
  get emptyState(): Locator {
    return this.page.locator('[data-slot="empty"]');
  }

  get pageTitle(): Locator {
    return this.page.locator('[data-slot="page-title"]').getByText(/^staffs$/i);
  }

  /**
   * Best-effort cleanup for a staff record a test created.
   *
   * The Portal has no delete-staff control, so this flips the record to
   * Inactive on its detail page, which takes it off the default Active list.
   * Removing the row outright needs a backend delete the UI does not surface.
   *
   * Status lives on a switch labelled "Toggle staff status", not on a
   * combobox — the detail page's only comboboxes are country, state and role.
   */
  async deactivateStaffIfPresent(nickName: string): Promise<void> {
    await this.goto();
    await this.search(nickName);
    await this.waitForReady();
    const row = this.table.rowContaining(nickName);
    if ((await row.count()) === 0) return;

    await row.first().click();
    const statusToggle = this.page.getByRole('switch', { name: /toggle staff status/i });
    await expect(statusToggle).toBeVisible({ timeout: 15_000 });
    if ((await statusToggle.getAttribute('aria-checked')) === 'true') {
      await statusToggle.click();
    }

    const save = this.page.getByRole('button', { name: /save changes/i });
    for (let attempt = 0; attempt < 3 && (await save.count()) > 0; attempt++) {
      await save.first().click();
      await this.page.waitForTimeout(2_000);
      if ((await statusToggle.getAttribute('aria-checked')) === 'false') break;
    }
  }
}

/** "Create New Staff" dialog. */
export class CreateStaffDialog extends BaseModal {
  constructor(page: Page) {
    super(page, page.getByRole('dialog', { name: /create new staff/i }));
  }

  get firstNameInput(): Locator {
    return this.root.getByLabel(/first name/i);
  }

  get lastNameInput(): Locator {
    return this.root.getByLabel(/last name/i);
  }

  get nickNameInput(): Locator {
    return this.root.getByLabel(/nick name/i);
  }

  get phoneInput(): Locator {
    return this.root.getByLabel(/phone/i);
  }

  get emailInput(): Locator {
    return this.root.getByLabel(/email/i);
  }

  get staffCodeInput(): Locator {
    return this.root.getByLabel(/staff code/i);
  }

  get staffRoleSelect(): Locator {
    return this.root.getByRole('combobox', { name: /staff role/i });
  }

  get statusSelect(): Locator {
    return this.root.getByRole('combobox', { name: /^status$/i });
  }

  get createStaffButton(): Locator {
    return this.root.getByRole('button', { name: /^create staff$/i });
  }

  /** Any validation/error message rendered inside the dialog. */
  message(pattern: RegExp): Locator {
    return this.root.getByText(pattern);
  }

  get closeIcon(): Locator {
    return this.root.getByRole('button', { name: /close/i });
  }

  get allowBookingToggle(): Locator {
    return this.root.getByRole('switch', { name: /allow booking/i });
  }

  get ssnInput(): Locator {
    return this.root.getByLabel(/ssn/i);
  }

  get streetAddressInput(): Locator {
    return this.root.getByLabel(/street address/i);
  }

  get countrySelect(): Locator {
    return this.root
      .getByRole('combobox', { name: /country/i })
      .or(this.root.getByText(/select country/i));
  }

  get stateSelect(): Locator {
    return this.root
      .getByRole('combobox', { name: /^state$/i })
      .or(this.root.getByText(/select state/i));
  }

  /**
   * The country/state triggers by id.
   *
   * `countrySelect`/`stateSelect` above are `.or()` unions kept for the
   * field-presence assertions; `.first()` on them can resolve to the
   * placeholder *text* rather than the button, and clicking text opens nothing.
   * These are the controls to drive. Both open a command-palette listbox of
   * `role="option"` entries — 250 countries — not a plain select.
   */
  get countryCombobox(): Locator {
    return this.root.locator('#country');
  }

  get stateCombobox(): Locator {
    return this.root.locator('#state');
  }

  get cityInput(): Locator {
    return this.root.getByLabel(/^city$/i);
  }

  get zipCodeInput(): Locator {
    return this.root.getByLabel(/postal\/zip code|zip code/i);
  }

  get colorPicker(): Locator {
    return this.root
      .locator('[data-slot="field"]')
      .filter({ hasText: /^color$/i })
      .locator('[data-slot="field-content"]');
  }

  get uploadPhotoButton(): Locator {
    return this.root.getByRole('button', { name: /^upload$/i });
  }

  /**
   * "Upload" does not open a file chooser directly — it is a `dialog-trigger`
   * that opens a nested "Change Profile Photo" dialog holding the dropzone,
   * a "Browse Files" button and the only `input[type=file]` on the page. So the
   * upload cases have to step through that dialog rather than setting files on
   * the create form.
   */
  get photoDialog(): Locator {
    return this.page.getByRole('dialog', { name: /change profile photo/i });
  }

  get photoFileInput(): Locator {
    return this.photoDialog.locator('input[type="file"]');
  }

  get photoDoneButton(): Locator {
    return this.photoDialog.getByRole('button', { name: /^done$/i });
  }

  /** Open the photo dialog and attach an in-memory file to it. */
  async uploadFile(file: { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
    await this.uploadPhotoButton.click();
    await expect(this.photoDialog).toBeVisible();
    await this.photoFileInput.setInputFiles(file);
  }

  /** The rendered avatar once an image has been accepted (replaces the initial). */
  get avatarPreview(): Locator {
    return this.photoDialog
      .locator('img[src^="blob:"], img[src^="data:"], img[src^="http"]')
      .first();
  }

  /**
   * Submit, retrying through the Portal's lazy token refresh.
   *
   * Measured on the live form: with an expired access token the first press is
   * swallowed while `POST /refresh_token` round-trips — no request, no error,
   * the dialog just sits there. The second press posts and gets a 201. Without
   * the retry this case fails intermittently for a reason unrelated to it.
   */
  async submitWithRetry(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.createStaffButton.click();
      try {
        await expect(this.firstNameInput).toBeHidden({ timeout: 8_000 });
        return;
      } catch {
        await this.page.waitForTimeout(1_000);
      }
    }
    await expect(this.firstNameInput).toBeHidden({ timeout: 15_000 });
  }

  get cancelDialogButton(): Locator {
    return this.root.getByRole('button', { name: /^cancel$/i });
  }

  async submit(): Promise<void> {
    await this.createStaffButton.click();
  }
}

/** "Export Employee" dialog. */
export class ExportStaffDialog extends BaseModal {
  constructor(page: Page) {
    super(page, page.getByRole('dialog', { name: /export employee/i }));
  }

  get excelFormatOption(): Locator {
    return this.root.getByText(/excel \(\.xlsx\)/i);
  }

  get csvFormatOption(): Locator {
    return this.root.getByText(/csv \(\.csv\)/i);
  }

  get exportButton(): Locator {
    return this.root.getByRole('button', { name: /^export$/i });
  }

  get closeIcon(): Locator {
    return this.root.getByRole('button', { name: /close/i });
  }

  get cancelDialogButton(): Locator {
    return this.root.getByRole('button', { name: /^cancel$/i });
  }

  get statusFilterSelect(): Locator {
    return this.root.locator('#export-statuses');
  }

  get compensationTypeFilterSelect(): Locator {
    return this.root.locator('#export-compensation-types');
  }

  get roleFilterSelect(): Locator {
    return this.root.locator('#export-roles');
  }

  /** Column checkbox by exact label, e.g. columnCheckbox(/first name/i). */
  columnCheckbox(name: RegExp): Locator {
    return this.root.getByRole('checkbox', { name });
  }

  get basicInfoGroupHeading(): Locator {
    return this.root.getByText(/basic info/i);
  }

  get contactGroupHeading(): Locator {
    return this.root.getByText(/^contact$/i);
  }

  get workInfoGroupHeading(): Locator {
    return this.root.getByText(/work info/i);
  }

  async submit(): Promise<void> {
    await this.exportButton.click();
  }
}

/** Staff detail page (`?tab=profile|role|compensation|skills|hours`). */
export class StaffDetailPage extends BasePage {
  protected readonly path = Urls.STAFFS;

  readonly sidebar: Sidebar;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
  }

  async waitForReady(): Promise<void> {
    await expect(this.profileTab).toBeVisible();
  }

  /** Header nick name — value is dynamic per staff record, matched loosely. */
  get nickNameHeading(): Locator {
    return this.page.getByRole('heading').first();
  }

  get statusBadge(): Locator {
    return this.page.getByText(/^(active|inactive)$/i).first();
  }

  get appointmentStaffToggle(): Locator {
    // The switch is labelled "Toggle appointment booking" in the accessibility
    // tree, not "Appointment Staff" (that is the visible caption), so match
    // either — and take the switch, never the caption text.
    return this.page
      .getByRole('switch', { name: /appointment/i })
      .or(this.page.getByRole('switch', { name: /toggle appointment booking/i }))
      .first();
  }

  /** The Profile tab's editable fields. */
  get firstNameInput(): Locator {
    return this.page.locator('#firstName');
  }

  get lastNameInput(): Locator {
    return this.page.locator('#lastName');
  }

  get nickNameInput(): Locator {
    return this.page.locator('#nickname');
  }

  get phoneInput(): Locator {
    return this.page.locator('#phone');
  }

  /**
   * Save and wait for the write to land.
   *
   * Waits on the `/staffs/<id>` write rather than on the button going
   * disabled: the button also disables when the form resets, so a swallowed
   * submit looked exactly like a successful one and the change silently never
   * persisted. Retries because, as everywhere else in this Portal, an expired
   * access token eats the first press while `POST /refresh_token` round-trips.
   */
  async saveChanges(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.saveChangesButton.isDisabled().catch(() => true)) {
        await this.page.waitForTimeout(750);
        continue;
      }

      const saved = this.page
        .waitForResponse(
          (response) =>
            /\/staffs\/[0-9a-f-]{10,}/i.test(response.url()) &&
            ['PUT', 'PATCH', 'POST'].includes(response.request().method()) &&
            response.ok(),
          { timeout: Timeouts.SHORT },
        )
        .catch(() => null);

      await this.saveChangesButton.click();
      if (await saved) return;
      await this.page.waitForTimeout(1_000);
    }
    throw new Error('Save Changes never produced a successful staff write');
  }

  /** Save only if the form actually offers it (some controls autosave). */
  async saveChangesIfEnabled(): Promise<void> {
    if ((await this.saveChangesButton.count()) === 0) return;
    if (await this.saveChangesButton.isDisabled().catch(() => true)) return;
    await this.saveChanges();
  }

  get profileTab(): Locator {
    return this.page.getByRole('tab', { name: /^profile$/i });
  }

  get rolePermissionsTab(): Locator {
    return this.page.getByRole('tab', { name: /role\s*&\s*permissions/i });
  }

  get compensationTab(): Locator {
    return this.page.getByRole('tab', { name: /^compensation$/i });
  }

  get serviceSkillsTab(): Locator {
    return this.page.getByRole('tab', { name: /service skills/i });
  }

  get workHoursTab(): Locator {
    return this.page.getByRole('tab', { name: /work hours/i });
  }

  get profileInformationHeading(): Locator {
    return this.page.getByText(/profile information/i);
  }

  get changePhotoButton(): Locator {
    return this.page.getByRole('button', { name: /^change$/i });
  }

  /** Toggles between "Expand All" and "Collapse All" depending on current state. */
  get expandAllButton(): Locator {
    return this.page.getByRole('button', { name: /expand all|collapse all/i });
  }

  get saveChangesButton(): Locator {
    return this.page.getByRole('button', { name: /save changes/i });
  }

  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: /^cancel$/i });
  }

  async gotoTab(uuid: string, tab: string): Promise<void> {
    await this.page.goto(`${Urls.STAFFS}/${uuid}?tab=${tab}`, { waitUntil: 'domcontentloaded' });
  }
}
