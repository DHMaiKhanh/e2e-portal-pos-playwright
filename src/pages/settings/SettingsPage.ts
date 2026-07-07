import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Urls } from '@constants/urls';

/** Settings screen with tabbed sections (business info, users, …). */
export class SettingsPage extends BasePage {
  protected readonly path = Urls.SETTINGS;

  readonly heading: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /settings/i });
    this.saveButton = page.getByRole('button', { name: /save/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  tab(name: string | RegExp): Locator {
    return this.page.getByRole('tab', { name });
  }

  async openTab(name: string | RegExp): Promise<void> {
    await this.tab(name).click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
