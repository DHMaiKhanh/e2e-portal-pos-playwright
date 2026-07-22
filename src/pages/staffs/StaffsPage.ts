import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Pagination } from '@components/Pagination';
import { BaseModal } from '@components/modal/BaseModal';
import { Sidebar } from '@components/sidebar/Sidebar';
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
    return this.page
      .getByRole('switch', { name: /appointment staff/i })
      .or(this.page.getByText(/appointment staff/i));
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
