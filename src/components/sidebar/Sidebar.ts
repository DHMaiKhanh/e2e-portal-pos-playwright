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

  /**
   * The collapse/expand control.
   *
   * Present in the DOM at every width but only *visible* below the tablet
   * breakpoint. Verified across 1920 / 1280 / 1024 / 900 / 768 / 375 on
   * 2026-08-12: from 768px up the nav is a permanent 218px column with no
   * user-facing collapse affordance, and at 375px the column is gone and this
   * trigger opens the nav as an overlay drawer instead. Tests that expect a
   * desktop collapse button are testing something the Portal does not have.
   */
  get toggle(): Locator {
    return this.page.locator('[data-slot="sidebar-trigger"]').first();
  }

  /** The persistent nav column. Absent (count 0) at mobile widths. */
  get panel(): Locator {
    return this.page.locator('[data-slot="sidebar"]').first();
  }

  /**
   * The overlay drawer the mobile toggle opens.
   *
   * The sheet *is* the sidebar element (`<div data-slot="sidebar" role="dialog">`)
   * rather than a wrapper around one, so this matches the element itself — a
   * `filter({ has: … })` looking for a nested sidebar finds nothing.
   */
  get mobileDrawer(): Locator {
    return this.page.locator('[data-slot="sidebar"][role="dialog"]');
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
