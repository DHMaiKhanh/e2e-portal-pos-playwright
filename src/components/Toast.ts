import { Locator, Page, expect } from '@playwright/test';
import { BaseComponent } from '@components/BaseComponent';

/**
 * Transient toast / snackbar notification. Defaults to `role="status"` (and
 * `role="alert"` for errors). Adapt the root to the Portal's toast container.
 */
export class Toast extends BaseComponent {
  constructor(page: Page) {
    super(page, page.getByRole('status'));
  }

  get message(): Locator {
    return this.root;
  }

  async expectMessage(text: string | RegExp): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.root).toContainText(text);
  }
}
