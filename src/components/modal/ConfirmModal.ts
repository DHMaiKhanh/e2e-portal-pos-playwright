import { Page } from '@playwright/test';
import { BaseModal } from '@components/modal/BaseModal';

/**
 * Standard "Are you sure?" confirmation dialog. Scoped to the page's single
 * open `role="dialog"`. For multiple concurrent dialogs, pass a more specific root.
 */
export class ConfirmModal extends BaseModal {
  constructor(page: Page) {
    super(page, page.getByRole('dialog'));
  }
}
