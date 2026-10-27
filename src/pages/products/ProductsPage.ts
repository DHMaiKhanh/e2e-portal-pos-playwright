import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { DataTable } from '@components/table/DataTable';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/** Products / catalog management screen (a.k.a. "Services" — /pos/<id>/services). */
export class ProductsPage extends BasePage {
  protected readonly path = Urls.PRODUCTS;

  readonly table: DataTable;
  readonly searchInput: Locator;
  readonly addButton: Locator;

  // --- Page header ---------------------------------------------------------
  /** H2 "All Services" page title. */
  readonly pageTitle: Locator;
  readonly exportButton: Locator;
  readonly addCategoryButton: Locator;

  // --- Status tabs -----------------------------------------------------------
  readonly activeTab: Locator;
  readonly inactiveTab: Locator;

  // --- Area below the category list ------------------------------------------
  /** Combobox showing the selected status filter (e.g. "Active"). */
  readonly statusFilterCombobox: Locator;
  readonly manageOrderButton: Locator;
  readonly addServiceButton: Locator;

  // --- Category list container -------------------------------------------
  readonly categoryList: Locator;
  /** The "Other" category row — always pinned last, no Edit button. */
  readonly otherCategoryButton: Locator;

  // --- Table & pagination -----------------------------------------------
  readonly tableHeading: Locator;
  readonly paginationFooter: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  /** Page index text, e.g. "1 / 9". */
  readonly pageIndicator: Locator;

  constructor(page: Page) {
    super(page);
    // Locators re-verified against the live DOM on 2026-10-20, after the
    // 2026-10-13 design-system refactor (Linear VP-4569): the page heading is
    // h1 "Services" (the old h2 "All Services" is now a plain caption above
    // the table), "Manage Order" became "Reorder" (dialog "Reorder services"),
    // the status filter is a chip button "Filter by service status: <x>", and
    // the pager is `navigation "Pagination"` with "1–30 of 104" / "1 / 4" /
    // "Previous page" / "Next page".
    this.table = new DataTable(page, page.getByRole('table'));
    this.searchInput = page.getByPlaceholder(/search by name/i);
    this.addButton = page.getByRole('button', { name: /^add service$/i });

    this.pageTitle = page.getByRole('heading', { level: 1, name: /^services$/i });
    this.exportButton = page.getByRole('button', { name: /^export$/i });
    this.addCategoryButton = page.getByRole('button', { name: /^add category$/i });

    this.activeTab = page.getByRole('tab', { name: /^active$/i });
    this.inactiveTab = page.getByRole('tab', { name: /^inactive$/i });

    this.statusFilterCombobox = page.getByRole('button', { name: /filter by service status/i });
    this.manageOrderButton = page.getByRole('button', { name: 'Reorder', exact: true });
    this.addServiceButton = page.getByRole('button', { name: /^add service$/i });

    this.categoryList = page.locator('[data-slot="pos-sortable-item"]').first().locator('..');
    this.otherCategoryButton = page.getByRole('button', { name: 'Other', exact: true });

    this.tableHeading = page.getByRole('table');
    const pager = page.getByRole('navigation', { name: 'Pagination' });
    this.paginationFooter = pager.locator('[data-slot="pos-pagination-range"]');
    this.previousPageButton = pager.getByRole('button', { name: 'Previous page' });
    this.nextPageButton = pager.getByRole('button', { name: 'Next page' });
    this.pageIndicator = pager.locator('[data-slot="pos-pagination-page"]');
  }

  /** Empty state shown in place of rows + pager when nothing matches. */
  get emptyState(): Locator {
    return this.page.locator('[data-slot="pos-empty-state"]');
  }

  /**
   * Parse the pager range "31–60 of 104" into numbers. Returns zeros when the
   * pager is absent (an empty result removes it entirely).
   */
  async footerRange(): Promise<{ from: number; to: number; total: number }> {
    if ((await this.paginationFooter.count()) === 0) return { from: 0, to: 0, total: 0 };
    const text = await this.paginationFooterText();
    const match = text.replace(/,/g, '').match(/(\d+)\s*[–-]\s*(\d+)\s+of\s+(\d+)/);
    expect(match, `Unreadable pager range: "${text}"`).not.toBeNull();
    const [, from, to, total] = match as RegExpMatchArray;
    return { from: Number(from), to: Number(to), total: Number(total) };
  }

  /** Total pages, read from the "n / m" indicator (1 when the pager is absent). */
  async totalPages(): Promise<number> {
    if ((await this.pageIndicator.count()) === 0) return 1;
    return Number((await this.pageIndicatorText()).split('/')[1]?.replace(/,/g, '').trim()) || 1;
  }

  /** The screen's own entry in the nav — used to prove the shell survived a failure. */
  get sidebarServicesLink(): Locator {
    return this.page.getByRole('link', { name: 'Services', exact: true }).first();
  }

  /**
   * Same as BasePage.goto but with the 30s navigation budget: the mutating
   * category cases navigate inside their `finally` restore, and the default
   * 15s goto timeout on a loaded shared DEV aborted that restore half-way.
   */
  async goto(): Promise<void> {
    await this.page.goto(this.path, {
      waitUntil: 'domcontentloaded',
      timeout: Timeouts.NAVIGATION,
    });
    await this.waitForReady();
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible({ timeout: Timeouts.NAVIGATION });
    // The search box paints with the shell, well before the catalogue does, so
    // stopping here left callers reading a half-built page: the pagination
    // footer still said "Showing 0 to 0 of 0 results" and row counts came back
    // 0. Wait for the loading skeletons to clear, which is when the real list
    // has landed.
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
      timeout: Timeouts.MEDIUM,
    });
    // A matching result shows the pager; an empty one replaces rows + pager
    // with the empty state.
    await expect(this.paginationFooter.or(this.emptyState).first()).toBeVisible({
      timeout: Timeouts.MEDIUM,
    });
  }

  /**
   * Types a term and submits it, then waits for the refreshed list to land.
   *
   * Submitting used to return the moment Enter was pressed, so callers read the
   * pagination footer while it still showed the PREVIOUS result set — a search
   * for a nonexistent service reported "Showing 1 to 30 of 259 results" instead
   * of "Showing 0 to 0 of 0 results". The list is fetched as
   *   GET /services?status[]=active&name[]=<term>&...
   * so wait for that response. Best-effort/bounded like the Orders filters: an
   * identical query can be served from cache without a new request, and in that
   * case there is nothing to wait for.
   */
  async search(term: string): Promise<void> {
    const responsePromise = this.page
      .waitForResponse(
        (res) =>
          res.url().includes('/services?') &&
          (term === ''
            ? !res.url().includes('name[]=') && !res.url().includes('name%5B%5D=')
            : res.url().includes(encodeURIComponent(term)) || res.url().includes(term)),
        { timeout: 5_000 },
      )
      .catch(() => undefined);

    await this.searchInput.fill(term);
    await this.page.keyboard.press('Enter');
    await responsePromise;
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
      timeout: Timeouts.MEDIUM,
    });
  }

  async hasProduct(name: string): Promise<boolean> {
    return this.table.rowContaining(name).isVisible();
  }

  // --- Category row helpers --------------------------------------------------
  /** The clickable name button for a category row, e.g. "Artificial Nails". */
  categoryButton(name: string | RegExp): Locator {
    return this.page.getByRole('button', { name, exact: typeof name === 'string' });
  }

  // Category action labels are anchored (`^…$`). Unanchored patterns match by
  // substring, and this store has categories whose names contain one another —
  // "Other" vs "Other test" — so `reorder Other` resolved to the wrong row's
  // handle and reported the wrong disabled state.

  /** Drag handle for a category row: "Reorder <name>". */
  categoryReorderHandle(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^reorder ${escapeRegExp(name)}$`, 'i'),
    });
  }

  /**
   * Since the 2026-10-13 refactor a category row's move/edit controls live in
   * an overflow menu: button "Actions for <name>" opens `menu "Actions for
   * <name>"` with menuitems Move to top / Move up / Move down / Move to bottom /
   * Edit (boundary items are aria-disabled). The old inline "Move <name> up"
   * buttons are still in the DOM but CSS-hidden at the category column's width.
   * "Other" has no Actions button at all.
   *
   * The menuitem locators below only resolve while the menu is open — call
   * `openCategoryActions(name)` first.
   */
  categoryActionsButton(name: string): Locator {
    return this.page.getByRole('button', { name: `Actions for ${name}`, exact: true });
  }

  categoryActionsMenu(name: string): Locator {
    return this.page.getByRole('menu', { name: `Actions for ${name}`, exact: true });
  }

  async openCategoryActions(name: string): Promise<void> {
    if (await this.categoryActionsMenu(name).isVisible()) return;
    await this.hoverCategory(name);
    await this.categoryActionsButton(name).click();
    await expect(this.categoryActionsMenu(name)).toBeVisible();
  }

  async closeCategoryActions(name: string): Promise<void> {
    if (await this.categoryActionsMenu(name).isVisible()) {
      await this.page.keyboard.press('Escape');
      await expect(this.categoryActionsMenu(name)).toBeHidden();
    }
  }

  private categoryMenuItem(name: string, item: string): Locator {
    return this.categoryActionsMenu(name).getByRole('menuitem', { name: item, exact: true });
  }

  categoryMoveToFirstButton(name: string): Locator {
    return this.categoryMenuItem(name, 'Move to top');
  }

  categoryMoveUpButton(name: string): Locator {
    return this.categoryMenuItem(name, 'Move up');
  }

  categoryMoveDownButton(name: string): Locator {
    return this.categoryMenuItem(name, 'Move down');
  }

  categoryMoveToLastButton(name: string): Locator {
    return this.categoryMenuItem(name, 'Move to bottom');
  }

  /** Not present for the "Other" category. */
  categoryEditButton(name: string): Locator {
    return this.categoryMenuItem(name, 'Edit');
  }

  /** The disabled drag handle the pinned "Other" row carries instead of "Reorder Other". */
  get otherPinnedHandle(): Locator {
    return this.page.getByRole('button', { name: 'Other is always last' });
  }

  /**
   * A category's own row in the sortable list.
   *
   * The row's per-item controls (move/edit) only accept clicks while the row is
   * hovered — clicking one cold makes Playwright report the row div itself as
   * "intercepts pointer events", which is what an earlier attempt at these
   * cases ran into. Go through `hoverCategory` first.
   */
  categoryRow(name: string): Locator {
    return this.page
      .locator('[data-sortable-id]')
      .filter({ has: this.page.getByRole('button', { name, exact: true }) });
  }

  async hoverCategory(name: string): Promise<void> {
    await this.categoryRow(name).hover();
  }

  /**
   * Block until the category list has finished rendering.
   *
   * "Other" is pinned last by the product, so its presence is the signal that
   * the whole list has landed. Reading the order before that returns a partial
   * list — which is how a reordering test came to record the wrong "original"
   * order and then restore the store to it.
   */
  async waitForCategoryList(): Promise<void> {
    await expect(this.otherCategoryButton).toBeVisible({ timeout: Timeouts.NAVIGATION });
  }

  /** Category names in list order. "Other" is pinned last by the product. */
  async categoryNamesInOrder(): Promise<string[]> {
    await this.waitForCategoryList();
    const rows = this.page.locator('[data-sortable-id]');
    const count = await rows.count();
    const names: string[] = [];
    for (let index = 0; index < count; index++) {
      const label = await rows.nth(index).locator('span.truncate').first().innerText();
      names.push(label.trim());
    }
    return names;
  }

  async categoryIndexOf(name: string): Promise<number> {
    return (await this.categoryNamesInOrder()).indexOf(name);
  }

  /**
   * Step a category to a position, one move at a time.
   *
   * Used to put the list back after a reordering test. A single inverse click is
   * not enough on its own: if the test failed part-way, the category may be
   * anywhere, and an unconditional "move back down" would push it past where it
   * started. This converges from any position instead.
   */
  async moveCategoryToIndex(name: string, targetIndex: number): Promise<void> {
    for (let attempt = 0; attempt < 40; attempt++) {
      const current = await this.categoryIndexOf(name);
      if (current === -1) throw new Error(`Category "${name}" is not in the list`);
      if (current === targetIndex) return;

      const before = await this.categoryNamesInOrder();
      if (current > targetIndex) {
        await this.moveCategoryUp(name);
      } else {
        await this.moveCategoryDown(name);
      }
      // Each click is applied optimistically then persisted; wait for the list
      // to actually change before deciding the next step. On a slow shared DEV
      // the repaint can lag the (already-acknowledged) write, so fall back to a
      // reload rather than abandoning the restore half-way.
      try {
        await expect
          .poll(async () => await this.categoryNamesInOrder(), { timeout: Timeouts.MEDIUM })
          .not.toEqual(before);
      } catch {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.waitForCategoryList();
      }
    }
    throw new Error(`Could not move "${name}" to index ${targetIndex}`);
  }

  /**
   * Run a reordering interaction and wait for the server to accept it.
   *
   * The list repaints optimistically the moment a move button is clicked, so a
   * test that only watches the DOM can navigate away before the write lands and
   * cancel it in flight — the order then "reverts" on reload and looks like a
   * persistence bug in the product. The write goes to `/display_orders` (or `/categories`).
   */
  async withReorderPersisted(action: () => Promise<void>): Promise<void> {
    const persisted = this.page.waitForResponse(
      (response) =>
        /\/(display_orders|categories)\b/.test(response.url()) &&
        response.request().method() !== 'GET' &&
        response.ok(),
      { timeout: Timeouts.MEDIUM },
    );
    await action();
    await persisted;
  }

  /** Click a per-category action from the row's "Actions for <name>" menu. */
  private async clickCategoryAction(name: string, action: Locator): Promise<void> {
    await this.openCategoryActions(name);
    await expect(action).toBeEnabled();
    await action.click();
    await expect(this.categoryActionsMenu(name)).toBeHidden();
  }

  /** A move click, held until the new ordering is persisted. */
  private async moveCategory(name: string, action: Locator): Promise<void> {
    await this.withReorderPersisted(() => this.clickCategoryAction(name, action));
  }

  async moveCategoryUp(name: string): Promise<void> {
    await this.moveCategory(name, this.categoryMoveUpButton(name));
  }

  async moveCategoryDown(name: string): Promise<void> {
    await this.moveCategory(name, this.categoryMoveDownButton(name));
  }

  async moveCategoryToFirst(name: string): Promise<void> {
    await this.moveCategory(name, this.categoryMoveToFirstButton(name));
  }

  async moveCategoryToLast(name: string): Promise<void> {
    await this.moveCategory(name, this.categoryMoveToLastButton(name));
  }

  async openEditCategory(name: string): Promise<void> {
    await this.clickCategoryAction(name, this.categoryEditButton(name));
    await expect(this.categoryDialog).toBeVisible();
  }

  // --- Category create/edit dialog ------------------------------------------
  //
  // Both the "Create New Category" and "Edit Category" dialogs share the same
  // shape: a `#name` input, an `isActive` switch, a colour swatch grid, and
  // Cancel / (Create|Save Changes) / Close.

  get categoryDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  get categoryNameInput(): Locator {
    return this.categoryDialog.locator('#name');
  }

  get categoryDialogCreateButton(): Locator {
    return this.categoryDialog.getByRole('button', { name: /^create( category)?$/i });
  }

  get categoryDialogSaveButton(): Locator {
    return this.categoryDialog.getByRole('button', { name: /save changes/i });
  }

  get categoryDialogCancelButton(): Locator {
    return this.categoryDialog.getByRole('button', { name: /^cancel$/i });
  }

  /**
   * The Active toggle.
   *
   * Radix renders a `role="switch"` button plus a hidden, `aria-hidden`,
   * `tabindex="-1"` checkbox that carries the form value. Clicking the checkbox
   * does nothing ("Clicking the checkbox did not change its state") — the
   * button is the control. Read state off the button's `aria-checked`.
   */
  get categoryActiveSwitch(): Locator {
    return this.categoryDialog.getByRole('switch');
  }

  /** The hidden input Radix keeps in sync with the switch, for reading form state. */
  get categoryActiveInput(): Locator {
    return this.categoryDialog.locator('input[name="isActive"]');
  }

  /**
   * Submit a category dialog and wait for the server to accept it.
   *
   * Retries the click once. The Portal refreshes its access token lazily: if
   * the token has expired, the first submit is swallowed while a
   * `POST /refresh_token` round-trips, and the dialog just sits there with no
   * error and no request. A second press goes through. Without this, these
   * cases fail intermittently for reasons that have nothing to do with the
   * feature under test.
   */
  private async submitCategoryDialog(submit: Locator): Promise<void> {
    // The dialog closing is the success signal. Coupling to the write response
    // instead (POST /categories on create, PUT /categories/<id> on edit) made
    // this brittle: a response arriving just after the wait expired looked like
    // a failure and triggered a duplicate submit.
    for (let attempt = 0; attempt < 3; attempt++) {
      await submit.click();
      try {
        await expect(this.categoryDialog).toBeHidden({ timeout: Timeouts.SHORT });
        return;
      } catch {
        // Still open. Give the lazy token refresh a moment to land and retry:
        // when the access token has expired, the Portal swallows the first
        // submit while `POST /refresh_token` round-trips, showing no error.
        await this.page.waitForTimeout(1_000);
      }
    }
    await expect(this.categoryDialog).toBeHidden({ timeout: Timeouts.MEDIUM });
  }

  /** Submit an already-filled create dialog. */
  async submitCategoryCreate(): Promise<void> {
    await this.submitCategoryDialog(this.categoryDialogCreateButton);
  }

  /** Submit an already-edited edit dialog. */
  async submitCategorySave(): Promise<void> {
    await this.submitCategoryDialog(this.categoryDialogSaveButton);
  }

  /** Fill the create dialog and submit it. */
  async createCategory(name: string): Promise<void> {
    await this.addCategoryButton.click();
    await expect(this.categoryDialog).toBeVisible();
    await this.categoryNameInput.fill(name);
    await this.submitCategoryCreate();
  }

  /** Rename a category and save, waiting for the dialog to close. */
  async renameCategory(from: string, to: string): Promise<void> {
    await this.openEditCategory(from);
    await this.categoryNameInput.fill(to);
    await this.submitCategoryDialog(this.categoryDialogSaveButton);
  }

  /** Flip a category's active flag from its edit dialog. */
  async setCategoryActive(name: string, active: boolean): Promise<void> {
    await this.openEditCategory(name);
    const control = this.categoryActiveSwitch;
    const isOn = (await control.getAttribute('aria-checked')) === 'true';
    if (isOn !== active) {
      await control.click();
      await expect(control).toHaveAttribute('aria-checked', String(active));
    }
    await this.submitCategoryDialog(this.categoryDialogSaveButton);
  }

  // --- Service create/edit dialog -------------------------------------------
  //
  // "Add Service" and a row click open the same form under different titles
  // ("Create Service" / "Edit Service").

  /**
   * Scoped by accessible name on purpose: the form's own comboboxes render as
   * Radix popovers, which also carry `role="dialog"`. An unscoped
   * `getByRole('dialog')` therefore trips strict mode the moment the category
   * picker has been opened.
   */
  get serviceDialog(): Locator {
    return this.page.getByRole('dialog', { name: /^(add|create|edit) service$/i });
  }

  /**
   * A toggle in the service form.
   *
   * These are Radix Checkboxes styled as switches, not Switches — `role` is
   * "checkbox" and there is no `role="switch"` anywhere in the dialog. Each is
   * a visible control plus a hidden `input[name=…]` carrying the form value.
   */
  serviceToggle(
    name: 'status' | 'flexiblePricing' | 'showOnWebBooking' | 'showOnGoCheckin' | 'showOnGoPos',
  ): Locator {
    // Since the 2026-10-13 refactor each visible checkbox carries `id=<name>`.
    return this.serviceDialog.locator(`[role="checkbox"]#${name}`);
  }

  get serviceNameInput(): Locator {
    return this.serviceDialog.locator('#name');
  }

  get servicePriceInput(): Locator {
    return this.serviceDialog.locator('#price');
  }

  get serviceSupplyFeeInput(): Locator {
    return this.serviceDialog.locator('#supplyFee');
  }

  get serviceDescriptionInput(): Locator {
    return this.serviceDialog.locator('#description');
  }

  get serviceCategoryCombobox(): Locator {
    return this.serviceDialog.getByRole('combobox', { name: 'Category' });
  }

  get serviceDialogCreateButton(): Locator {
    return this.serviceDialog.getByRole('button', { name: /^(create|add service)$/i });
  }

  get serviceDialogCancelButton(): Locator {
    return this.serviceDialog.getByRole('button', { name: /^cancel$/i });
  }

  async openAddService(): Promise<void> {
    await this.addServiceButton.click();
    await expect(this.serviceDialog).toBeVisible();
  }

  /** Pick a category in the service form — any real one; the field is required. */
  async selectServiceCategory(name?: string | RegExp): Promise<void> {
    await this.serviceCategoryCombobox.click();
    const option = name
      ? this.page.getByRole('option', { name })
      : this.page.getByRole('option').first();
    await option.click();
    await expect(this.serviceCategoryCombobox).not.toContainText(/select category/i);
  }

  /** Submit an already-filled service form, retrying through a lazy token refresh. */
  async submitServiceCreate(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.serviceDialogCreateButton.click();
      try {
        await expect(this.serviceDialog).toBeHidden({ timeout: Timeouts.SHORT });
        return;
      } catch {
        await this.page.waitForTimeout(1_000);
      }
    }
    await expect(this.serviceDialog).toBeHidden({ timeout: Timeouts.MEDIUM });
  }

  /**
   * Best-effort cleanup for a service a test created.
   *
   * The service form has no delete control either, so this flips it inactive,
   * which takes it off the Active tab. Removing the row outright needs an API
   * delete the Portal does not surface.
   */
  async deactivateServiceIfPresent(name: string): Promise<void> {
    await this.goto();
    await this.search(name);
    const row = this.table.rowContaining(name);
    if ((await row.count()) === 0) return;

    await row.first().click();
    await expect(this.serviceDialog).toBeVisible();
    const statusToggle = this.serviceToggle('status');
    if ((await statusToggle.getAttribute('aria-checked')) === 'true') {
      await statusToggle.click();
    }
    const save = this.serviceDialog.getByRole('button', { name: /save changes/i });
    for (let attempt = 0; attempt < 3; attempt++) {
      await save.click();
      try {
        await expect(this.serviceDialog).toBeHidden({ timeout: Timeouts.SHORT });
        return;
      } catch {
        await this.page.waitForTimeout(1_000);
      }
    }
  }

  // --- Tabs -------------------------------------------------------------------
  async switchToActiveTab(): Promise<void> {
    await this.activeTab.click();
  }

  async switchToInactiveTab(): Promise<void> {
    await this.inactiveTab.click();
  }

  // --- Pagination ---------------------------------------------------------
  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
  }

  async pageIndicatorText(): Promise<string> {
    return (await this.pageIndicator.textContent())?.trim() ?? '';
  }

  async paginationFooterText(): Promise<string> {
    return (await this.paginationFooter.textContent())?.trim() ?? '';
  }

  // --- Table cell helpers (columns: NAME & DESCRIPTION, PRICE, DURATION, SUPPLY FEE, STATUS) ---
  /** Table column header cells in display order. */
  get columnHeaders(): Locator {
    return this.page.getByRole('table').getByRole('columnheader');
  }

  /**
   * 1-based index of a column by its header label. The column set depends on
   * width since the 2026-10-13 refactor: at 1920px there is a separate
   * "Description" column (Name | Description | Price | Duration | Supply fee |
   * Status); narrower viewports fold the description under the name.
   */
  async columnIndex(header: string): Promise<number> {
    const labels = (await this.columnHeaders.allInnerTexts()).map((t) => t.trim().toLowerCase());
    const index = labels.indexOf(header.toLowerCase());
    expect(index, `No "${header}" column in [${labels.join(', ')}]`).toBeGreaterThanOrEqual(0);
    return index + 1;
  }

  /** Trimmed text of every visible row's cell in the given column. */
  async columnTexts(header: string): Promise<string[]> {
    const n = await this.columnIndex(header);
    return (await this.table.rows.locator(`td:nth-child(${n})`).allInnerTexts()).map((t) =>
      t.trim(),
    );
  }

  serviceRow(name: string): Locator {
    return this.table.rowContaining(name);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
