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
    this.table = new DataTable(page, page.getByRole('table'));
    this.searchInput = page.getByPlaceholder(/search by name/i);
    this.addButton = page.getByRole('button', { name: /add product|create/i });

    this.pageTitle = page.getByRole('heading', { name: /all services/i });
    this.exportButton = page.getByRole('button', { name: /^export$/i });
    this.addCategoryButton = page.getByRole('button', { name: /add category/i });

    this.activeTab = page.getByRole('tab', { name: /^active$/i });
    this.inactiveTab = page.getByRole('tab', { name: /^inactive$/i });

    this.statusFilterCombobox = page.getByRole('combobox', { name: /active|inactive/i });
    this.manageOrderButton = page.getByRole('button', { name: /manage order/i });
    this.addServiceButton = page.getByRole('button', { name: /add service/i });

    this.categoryList = page
      .getByRole('list', { name: /categor/i })
      .or(page.locator('[data-category-list]'));
    this.otherCategoryButton = page.getByRole('button', { name: /^other$/i });

    this.tableHeading = page
      .getByRole('table', { name: /all services/i })
      .or(page.getByRole('table'));
    this.paginationFooter = page.getByText(/showing \d+ to \d+ of \d+ results/i);
    this.previousPageButton = page.getByRole('button', { name: /^previous$/i });
    this.nextPageButton = page.getByRole('button', { name: /^next$/i });
    this.pageIndicator = page.getByText(/^\d+\s*\/\s*\d+$/);
  }

  /** The screen's own entry in the nav — used to prove the shell survived a failure. */
  get sidebarServicesLink(): Locator {
    return this.page.getByRole('link', { name: 'Services', exact: true }).first();
  }

  async waitForReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    // The search box paints with the shell, well before the catalogue does, so
    // stopping here left callers reading a half-built page: the pagination
    // footer still said "Showing 0 to 0 of 0 results" and row counts came back
    // 0. Wait for the loading skeletons to clear, which is when the real list
    // has landed.
    await expect(this.page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0, {
      timeout: Timeouts.MEDIUM,
    });
    await expect(this.paginationFooter.first()).toBeVisible({ timeout: Timeouts.MEDIUM });
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

  categoryMoveToFirstButton(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^move ${escapeRegExp(name)} to first$`, 'i'),
    });
  }

  categoryMoveUpButton(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^move ${escapeRegExp(name)} up$`, 'i'),
    });
  }

  categoryMoveDownButton(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^move ${escapeRegExp(name)} down$`, 'i'),
    });
  }

  categoryMoveToLastButton(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^move ${escapeRegExp(name)} to last$`, 'i'),
    });
  }

  /** Not present for the "Other" category. */
  categoryEditButton(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^edit ${escapeRegExp(name)}$`, 'i') });
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
      // to actually change before deciding the next step.
      await expect.poll(async () => await this.categoryNamesInOrder()).not.toEqual(before);
    }
    throw new Error(`Could not move "${name}" to index ${targetIndex}`);
  }

  /**
   * Run a reordering interaction and wait for the server to accept it.
   *
   * The list repaints optimistically the moment a move button is clicked, so a
   * test that only watches the DOM can navigate away before the write lands and
   * cancel it in flight — the order then "reverts" on reload and looks like a
   * persistence bug in the product. The write is `PUT /display_orders/<id>`.
   */
  async withReorderPersisted(action: () => Promise<void>): Promise<void> {
    const persisted = this.page.waitForResponse(
      (response) =>
        /\/display_orders\//.test(response.url()) &&
        response.request().method() === 'PUT' &&
        response.ok(),
      { timeout: Timeouts.MEDIUM },
    );
    await action();
    await persisted;
  }

  /** Click a per-category action, revealing it by hover first. */
  private async clickCategoryAction(name: string, action: Locator): Promise<void> {
    await this.hoverCategory(name);
    await expect(action).toBeEnabled();
    await action.click();
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
    return this.categoryDialog.getByRole('button', { name: /^create$/i });
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
    return this.page.getByRole('dialog', { name: /create service|edit service/i });
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
    return this.serviceDialog
      .locator(`input[name="${name}"]`)
      .locator('xpath=preceding-sibling::*[@role="checkbox"][1]');
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
    return this.serviceDialog.locator('#category');
  }

  get serviceDialogCreateButton(): Locator {
    return this.serviceDialog.getByRole('button', { name: /^create$/i });
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

  serviceRow(name: string): Locator {
    return this.table.rowContaining(name);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
