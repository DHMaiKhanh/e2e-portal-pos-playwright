import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@components/BaseComponent';

/** Portal navigation sidebar. Clicks a top-level nav item by its visible label. */
export class Sidebar extends BaseComponent {
  constructor(page: Page) {
    super(page, page.getByRole('navigation'));
  }

  item(name: string | RegExp): Locator {
    return this.root.getByRole('link', { name });
  }

  async navigateTo(name: string | RegExp): Promise<void> {
    await this.item(name).click();
  }
}
