import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@components/BaseComponent';

/** Table pagination control. Scope to the pagination container. */
export class Pagination extends BaseComponent {
  constructor(page: Page, root: string | Locator = page.getByRole('navigation', { name: /pagination/i })) {
    super(page, root);
  }

  get nextButton(): Locator {
    return this.root.getByRole('button', { name: /next/i });
  }

  get prevButton(): Locator {
    return this.root.getByRole('button', { name: /prev/i });
  }

  async next(): Promise<void> {
    await this.nextButton.click();
  }

  async prev(): Promise<void> {
    await this.prevButton.click();
  }

  async gotoPage(n: number): Promise<void> {
    await this.root.getByRole('button', { name: String(n), exact: true }).click();
  }
}
