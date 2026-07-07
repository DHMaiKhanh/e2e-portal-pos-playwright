import { Locator } from '@playwright/test';
import { BaseComponent } from '@components/BaseComponent';

/**
 * Base dialog/modal component. Subclass per-modal, passing the dialog root.
 * Defaults assume a `role="dialog"` container with accessible confirm/cancel buttons.
 */
export class BaseModal extends BaseComponent {
  get confirmButton(): Locator {
    return this.root.getByRole('button', { name: /confirm|ok|yes|save/i });
  }

  get cancelButton(): Locator {
    return this.root.getByRole('button', { name: /cancel|close|no/i });
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
    await this.waitForHidden();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.waitForHidden();
  }
}
