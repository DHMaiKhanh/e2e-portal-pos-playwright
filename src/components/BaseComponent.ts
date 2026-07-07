import { Locator, Page } from '@playwright/test';

/**
 * Base for reusable UI components that may appear on many pages
 * (modals, tables, sidebars, toasts, etc.).
 * Each component is scoped to a root Locator so multiple instances can co-exist.
 */
export abstract class BaseComponent {
  protected readonly root: Locator;

  constructor(
    protected readonly page: Page,
    rootSelector: string | Locator,
  ) {
    this.root = typeof rootSelector === 'string' ? page.locator(rootSelector) : rootSelector;
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  async waitForVisible(timeout = 10_000): Promise<void> {
    await this.root.waitFor({ state: 'visible', timeout });
  }

  async waitForHidden(timeout = 10_000): Promise<void> {
    await this.root.waitFor({ state: 'hidden', timeout });
  }
}
