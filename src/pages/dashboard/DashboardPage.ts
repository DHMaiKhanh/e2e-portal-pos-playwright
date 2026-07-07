import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Sidebar } from '@components/sidebar/Sidebar';
import { Urls } from '@constants/urls';

/** Portal landing page after login. */
export class DashboardPage extends BasePage {
  protected readonly path = Urls.DASHBOARD;

  readonly sidebar: Sidebar;
  readonly heading: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.heading = page.getByRole('heading', { name: /dashboard/i });
    this.userMenu = page.getByRole('button', { name: /account|profile|user menu/i });
  }

  async waitForReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.page.getByRole('menuitem', { name: /log ?out|sign out/i }).click();
    await this.page.waitForURL(/\/login/);
  }
}
