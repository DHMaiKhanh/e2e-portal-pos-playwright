import { Page, Locator, expect } from '@playwright/test';
import { Timeouts } from '@configs/constants/timeouts';
import { Logger } from '@utils/logger';

/**
 * Base Page Object — all page objects should extend this.
 * Encapsulates common patterns: navigation, waiting, locator factories.
 */
export abstract class BasePage {
  protected readonly logger = Logger.child({ module: this.constructor.name });

  constructor(public readonly page: Page) {}

  /** Subclasses must declare the URL path. baseURL is set in playwright.config. */
  protected abstract readonly path: string;

  async goto(): Promise<void> {
    this.logger.info(`Navigate to ${this.path}`);
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  /**
   * Override per page with a specific signal (e.g. a header locator becoming
   * visible). Prefer locator-based waits over the bare `load` event.
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('load', { timeout: Timeouts.NAVIGATION });
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  async url(): Promise<string> {
    return this.page.url();
  }

  async screenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  async expectUrlContains(part: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(part), { timeout: Timeouts.MEDIUM });
  }

  protected byTestId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  protected byRole(role: Parameters<Page['getByRole']>[0], options?: { name?: string | RegExp }) {
    return this.page.getByRole(role, options);
  }

  protected byText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  protected byLabel(label: string | RegExp): Locator {
    return this.page.getByLabel(label);
  }
}
