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
    // Re-verified 2026-10-20 after the 2026-10-13 design-system refactor:
    // search "Search name, code, phone…", filter chips "Filter by staff
    // status: Active" / "Sort staff: Custom order" (each opens a popover
    // listbox of options), "Add staff" (was "Create"), and the pager is
    // `navigation "Pagination"` with "1–30 of 70" / "1 / 3".
    this.table = new DataTable(page, page.getByRole('table'));
    this.pagination = new Pagination(page, page.getByRole('navigation', { name: 'Pagination' }));
    this.searchInput = page.getByPlaceholder(/search name, code, phone/i);
    this.statusFilter = page.getByRole('button', { name: /filter by staff status/i });
    this.sortFilter = page.getByRole('button', { name: /sort staff/i });
    this.exportButton = page.getByRole('button', { name: /^export$/i });
    this.createButton = page.getByRole('button', { name: /^add staff$/i });
    this.resultsFooter = page.locator('[data-slot="pos-pagination-range"]');
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible({ timeout: Timeouts.NAVIGATION });
    // Wait for the data fetch to resolve so callers don't click/assert on rows
    // that are still skeleton placeholders (hydration/loading race). An empty
    // result replaces rows + pager with the empty state.
    await expect(this.resultsFooter.or(this.emptyState).first()).toBeVisible({
      timeout: Timeouts.NAVIGATION,
    });
    const firstRowOrEmpty = this.table.rows.first().or(this.emptyState);
    await expect(firstRowOrEmpty).toBeVisible();
    // Either a populated first row or the (non-empty) empty state — evaluated
    // as one retrying assertion so a refetch that swaps rows for the empty
    // state mid-wait does not fail on a detached row.
    await expect(firstRowOrEmpty.first()).not.toHaveText('', { timeout: 15_000 });
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    // The search is debounced into the URL (`search=<term>`); wait for it,
    // then for the refreshed list.
    if (term.trim()) {
      await expect(this.page).toHaveURL(/[?&]search=/, { timeout: Timeouts.MEDIUM });
    }
    await this.page.waitForTimeout(400);
    await this.waitForReady();
  }

  /** Pick an option from the status / sort filter popover. */
  async chooseFilterOption(filter: Locator, option: string | RegExp): Promise<void> {
    await filter.click();
    await this.page.getByRole('option', { name: option }).click();
    await this.page.keyboard.press('Escape');
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

  get importButton(): Locator {
    return this.page.getByRole('button', { name: /^import$/i });
  }

  async openImportDialog(): Promise<ImportStaffDialog> {
    await this.importButton.click();
    const dialog = new ImportStaffDialog(this.page);
    await dialog.waitForVisible();
    return dialog;
  }

  async openStaffRow(text: string): Promise<void> {
    await this.openStaff(this.table.rowContaining(text));
  }

  /**
   * Open a staff's detail page. Since the 2026-10-13 refactor clicking the ROW
   * does nothing — the nickname text in the first cell is the link target.
   */
  async openStaff(row: Locator = this.table.rows.first()): Promise<void> {
    const name = row.getByRole('cell').first();
    await expect(name).not.toHaveText('', { timeout: Timeouts.MEDIUM });
    await name.locator('span, a').first().or(name).first().click();
    await expect(this.page).toHaveURL(/\/staffs\/[0-9a-f-]{20,}/, { timeout: Timeouts.MEDIUM });
  }

  get pageIndicator(): Locator {
    return this.page.locator('[data-slot="pos-pagination-page"]');
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
    return this.page.locator('[data-slot="pos-empty-state"]');
  }

  get pageTitle(): Locator {
    // The list header text changed from "Staffs" to "Staff Members" (h1).
    return this.page.getByRole('heading', { level: 1, name: /^staff members$/i });
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

  /**
   * Remove a staff a test created, straight through the data API.
   *
   * This is what unblocks the "create staff" happy path. The Portal surfaces no
   * delete control and its detail-page status toggle is dead (see
   * `deactivateStaffIfPresent`), so UI cleanup is impossible — but the staff is
   * an API-Platform (JSON-LD) resource, and those expose `DELETE /staffs/<id>`
   * by default even when nothing in the UI calls it. `page.request` reuses the
   * signed-in context's cookie jar, so the `token` cookie that authorises every
   * other data call rides along automatically.
   *
   * Order of attempts, each tried cookie-only first then with a bearer lifted
   * off the session cookie (in case the API wants the header, not the cookie):
   *   1. DELETE — a hard delete (204/200), or 404 if it is already gone.
   *   2. merge-patch status→inactive — a soft fallback if DELETE is refused, so
   *      the record at least drops off the default Active list.
   *
   * Returns true only once the record is provably removed or deactivated, so the
   * caller can assert cleanup happened rather than trusting a fire-and-forget
   * request and silently leaking an Active staff into the shared store.
   */
  async removeStaffViaApi(staffApiUrl: string): Promise<boolean> {
    const tryRemove = async (headers: Record<string, string>): Promise<boolean> => {
      const del = await this.page.request.delete(staffApiUrl, { headers, failOnStatusCode: false });
      if (del.ok() || del.status() === 404) return true;

      // API Platform requires this exact content type for a partial update.
      const patch = await this.page.request.patch(staffApiUrl, {
        headers: { ...headers, 'Content-Type': 'application/merge-patch+json' },
        data: { status: 'inactive' },
        failOnStatusCode: false,
      });
      return patch.ok();
    };

    // Cookie auth is carried by page.request for free; only reach for the bearer
    // if cookie-only is rejected, so a malformed header can't break what works.
    if (await tryRemove({})) return true;
    const token = (await this.page.context().cookies()).find((c) => c.name === 'token')?.value;
    if (!token) return false;
    return tryRemove({ Authorization: `Bearer ${token}` });
  }
}

/**
 * "New staff" dialog (was "Create New Staff" before the 2026-10-13 refactor).
 * Fields carry stable ids: #firstName #lastName #nickname #role #status
 * #staffCode #ssn #isAllowBooking #phone #email #address #city #state
 * #postalCode #country.
 */
export class CreateStaffDialog extends BaseModal {
  constructor(page: Page) {
    super(page, page.getByRole('dialog', { name: /^(new staff|create new staff)$/i }));
  }

  get firstNameInput(): Locator {
    return this.root.locator('#firstName');
  }

  get lastNameInput(): Locator {
    return this.root.locator('#lastName');
  }

  get nickNameInput(): Locator {
    return this.root.locator('#nickname');
  }

  get phoneInput(): Locator {
    return this.root.locator('#phone');
  }

  get emailInput(): Locator {
    return this.root.locator('#email');
  }

  get staffCodeInput(): Locator {
    return this.root.locator('#staffCode');
  }

  get staffRoleSelect(): Locator {
    return this.root.getByRole('combobox', { name: /^(staff )?role$/i });
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
    // Not getByLabel(/ssn/): the "Show SSN" reveal button matches it too.
    return this.root.locator('#ssn');
  }

  get streetAddressInput(): Locator {
    return this.root.locator('#address');
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
    return this.root.locator('#city');
  }

  get zipCodeInput(): Locator {
    return this.root.locator('#postalCode');
  }

  get colorPicker(): Locator {
    return this.root.getByRole('radiogroup', { name: 'Color' });
  }

  get uploadPhotoButton(): Locator {
    return this.root.getByRole('button', { name: /^upload( photo)?$/i });
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

/** "Export staff" dialog (was "Export Employee" before the 2026-10-13 refactor). */
export class ExportStaffDialog extends BaseModal {
  constructor(page: Page) {
    super(page, page.getByRole('dialog', { name: /^export (staff|employee)$/i }));
  }

  get excelFormatOption(): Locator {
    return this.root.getByRole('radio', { name: /^excel/i });
  }

  get csvFormatOption(): Locator {
    return this.root.getByRole('radio', { name: /^csv/i });
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
    return this.root.locator('#staff-export-statuses');
  }

  get compensationTypeFilterSelect(): Locator {
    return this.root.locator('#staff-export-compensation-types');
  }

  get roleFilterSelect(): Locator {
    return this.root.locator('#staff-export-roles');
  }

  /** Column checkbox by exact label, e.g. columnCheckbox(/first name/i). */
  columnCheckbox(name: RegExp): Locator {
    return this.root.getByRole('checkbox', { name });
  }

  get basicInfoGroupHeading(): Locator {
    return this.root.getByRole('heading', { name: /^basic info$/i });
  }

  get contactGroupHeading(): Locator {
    return this.root.getByRole('heading', { name: /^contact$/i });
  }

  get workInfoGroupHeading(): Locator {
    return this.root.getByRole('heading', { name: /^work info$/i });
  }

  async submit(): Promise<void> {
    await this.exportButton.click();
  }
}

/** One row of `POST /import/staff` → `ImportResult.errors.member`. */
export interface ImportRowError {
  row: number;
  errors: { key: string; message: string }[];
}

/** Body of `POST /import/staff`. */
export interface ImportResult {
  message: string;
  importedCount: number;
  failedCount: number;
  errors: { member: ImportRowError[] };
}

/**
 * "Import staff" dialog. Choosing a file only previews it client-side ("N rows
 * ready to import"); every real check (duplicate code, phone format) runs on
 * the server when "Confirm import" posts the file to `POST /import/staff`. Rows
 * that fail come back as `ImportResult.errors` and the dialog stays open with a
 * banner and a "Show error in <column>" button on each bad cell.
 */
export class ImportStaffDialog extends BaseModal {
  constructor(page: Page) {
    super(page, page.getByRole('dialog', { name: /import staff/i }));
  }

  get fileInput(): Locator {
    return this.root.locator('input[type="file"]');
  }

  get downloadTemplateButton(): Locator {
    return this.root.getByRole('button', { name: /download template/i });
  }

  get readyText(): Locator {
    return this.root.getByText(/\d+ rows? ready to import/i);
  }

  get confirmImportButton(): Locator {
    return this.root.getByRole('button', { name: /confirm import/i });
  }

  /** "1 of 1 rows have errors — fix them in your file and re-upload". */
  get errorBanner(): Locator {
    return this.root.getByText(/\d+ of \d+ rows? (have|has) errors/i);
  }

  /** The error marker on a cell, by its column header, e.g. `Employee Code (*)`. */
  cellErrorButton(column: string): Locator {
    return this.root.getByRole('button', { name: `Show error in ${column}` });
  }

  get cellErrorButtons(): Locator {
    return this.root.getByRole('button', { name: /^show error in /i });
  }

  async chooseCsv(name: string, csv: string): Promise<void> {
    await this.fileInput.setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await expect(this.readyText).toBeVisible();
  }

  /** Clicks "Confirm import" and returns the server's verdict. */
  async confirmImport(): Promise<ImportResult> {
    const response = this.page.waitForResponse(
      (r) => /\/import\/staff$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
      { timeout: Timeouts.LONG },
    );
    await this.confirmImportButton.click();
    const res = await response;
    expect(res.ok(), `POST /import/staff → ${res.status()}`).toBeTruthy();
    return (await res.json()) as ImportResult;
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

  /** Header "Status" switch. It saves on click (`PUT /staffs/<id>`), there is no Save button. */
  get statusToggle(): Locator {
    return this.page.getByRole('switch', { name: /toggle staff status/i });
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

  /**
   * The Role combobox on the Role & Permissions tab. The permission groups (and
   * their Expand All / Collapse All control) only render once a role is
   * assigned — a staff with no role shows just this combobox reading
   * "Select a role".
   */
  get roleSelect(): Locator {
    return this.page.getByRole('combobox', { name: /^role$/i });
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
