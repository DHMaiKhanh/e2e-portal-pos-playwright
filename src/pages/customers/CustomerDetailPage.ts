import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Customer detail screen — `/pos/<store>/customers/<uuid>?tab=profile`.
 *
 * The detail cases (TC-CUS-052..055) were written against a modal/drawer that
 * the scan could not confirm, and parked. Clicking a row does not open an
 * overlay at all: it navigates to a full page with its own URL and four tabs.
 * That difference is why "close button" and "Escape dismisses" needed
 * rewriting rather than just un-skipping — there is nothing to dismiss, and the
 * way back is browser history.
 */
export class CustomerDetailPage extends BasePage {
  protected readonly path = Urls.CUSTOMERS;

  /** Editable profile fields. */
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly noteInput: Locator;
  readonly birthdayButton: Locator;

  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.locator('#name');
    this.emailInput = page.locator('#email');
    this.noteInput = page.locator('#note');
    this.birthdayButton = page.getByRole('button', { name: /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/ });
    this.saveChangesButton = page.getByRole('button', { name: /save changes/i });
    this.cancelButton = page.getByRole('button', { name: /^cancel$/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.nameInput).toBeVisible({ timeout: Timeouts.NAVIGATION });
    await expect(this.saveChangesButton).toBeVisible({ timeout: Timeouts.MEDIUM });
  }

  tab(name: RegExp): Locator {
    return this.page.getByRole('tab', { name });
  }

  /** Tab labels, in doc order: Profile, Orders History, Points History, Cashback History. */
  get tabs(): Locator {
    return this.page.getByRole('tab');
  }

  get heading(): Locator {
    // The customer's name is rendered above the tab strip.
    return this.page.locator('[data-slot="tabs-list"]').first();
  }

  /**
   * A read-only stat rendered as a label with its value in the following block
   * (Total Visits, Current Points, Reward Balance, Created At).
   */
  statValue(label: RegExp): Locator {
    return this.page.locator('div').filter({ hasText: label }).last();
  }

  /** The uuid segment of the current detail URL. */
  customerId(): string {
    return new URL(this.page.url()).pathname.split('/').pop() ?? '';
  }
}
