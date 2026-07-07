import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { Urls } from '@constants/urls';
import { parseMoney } from '@utils/stringUtils';

/** Reports / analytics screen with a date-range filter. */
export class ReportsPage extends BasePage {
  protected readonly path = Urls.REPORTS;

  readonly heading: Locator;
  readonly fromDate: Locator;
  readonly toDate: Locator;
  readonly applyButton: Locator;
  readonly totalRevenue: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: /reports?/i });
    this.fromDate = page.getByLabel(/from|start date/i);
    this.toDate = page.getByLabel(/to|end date/i);
    this.applyButton = page.getByRole('button', { name: /apply|run/i });
    this.totalRevenue = page.getByTestId('total-revenue');
  }

  async waitForReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /** Set the date range (YYYY-MM-DD) and apply. */
  async setDateRange(from: string, to: string): Promise<void> {
    await this.fromDate.fill(from);
    await this.toDate.fill(to);
    await this.applyButton.click();
  }

  async getTotalRevenue(): Promise<number> {
    return parseMoney((await this.totalRevenue.textContent()) ?? '');
  }
}
