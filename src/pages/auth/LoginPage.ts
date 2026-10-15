import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Urls } from '@constants/urls';
import { Timeouts } from '@configs/constants/timeouts';

/** Portal login screen. */
export class LoginPage extends BasePage {
  protected readonly path = Urls.LOGIN;

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  /**
   * The Portal authenticates through federated identity only — there is no
   * credential form to drive. The screen offers two providers: GCI Business (a
   * button, handled in-app) and Google (a plain link out to the SSO host).
   * `npm run auth:stage` / `auth:prod` captures a real session manually; the suite reuses it.
   */
  readonly gciSignInButton: Locator;
  readonly googleSignInLink: Locator;
  readonly signInHeading: Locator;

  constructor(page: Page) {
    super(page);
    // Kept for API compatibility, but the Portal renders neither of these — the
    // "no credential form" test asserts exactly that.
    this.usernameInput = page.getByLabel(/username|email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /sign in|log ?in/i });
    this.errorMessage = page.getByRole('alert');

    this.gciSignInButton = page.getByRole('button', { name: /continue with gci business/i });
    this.googleSignInLink = page.getByRole('link', { name: /continue with google/i });
    this.signInHeading = page.getByText(/^sign in$/i).first();
  }

  async waitForReady(): Promise<void> {
    await expect(this.gciSignInButton).toBeVisible({ timeout: Timeouts.NAVIGATION });
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
