import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Urls } from '@constants/urls';

/** Portal login screen. */
export class LoginPage extends BasePage {
  protected readonly path = Urls.LOGIN;

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    // Adapt these selectors to the real Portal POS DOM.
    this.usernameInput = page.getByLabel(/username|email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /sign in|log ?in/i });
    this.errorMessage = page.getByRole('alert');
  }

  async waitForReady(): Promise<void> {
    await expect(this.usernameInput).toBeVisible();
  }

  /** Fill credentials and submit. Does NOT assert success — caller decides. */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** Login and wait until the app navigates away from /login. */
  async loginAndWait(username: string, password: string): Promise<void> {
    await this.login(username, password);
    await this.page.waitForURL((url) => !url.pathname.includes('/login'));
  }

  async getError(): Promise<string> {
    return (await this.errorMessage.textContent())?.trim() ?? '';
  }
}
