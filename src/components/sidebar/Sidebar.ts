import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@components/BaseComponent';

/**
 * Portal navigation sidebar. The main nav links don't live in a landmark we can
 * cleanly scope to (the only <aside> is the icon rail), but the labels and hrefs
 * are unique across the page, so we scope to the document and match on those.
 */
export class Sidebar extends BaseComponent {
  constructor(page: Page) {
    super(page, page.locator('body'));
  }

  item(name: string | RegExp): Locator {
    return this.root.getByRole('link', { name });
  }

  /** Click a top-level nav item by its visible label. */
  async navigateTo(name: string | RegExp): Promise<void> {
    await this.item(name).first().click();
  }

  /**
   * Click the nav link whose href matches `pattern`. Use this when labels repeat
   * (e.g. the store "Orders" — /pos/<id>/orders — vs the admin "Orders").
   */
  async navigateToHref(pattern: RegExp): Promise<void> {
    const links = this.root.locator('a[href]');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href && pattern.test(href)) {
        await links.nth(i).click();
        return;
      }
    }
    throw new Error(`No sidebar link matching ${pattern}`);
  }
}
