import { Locator } from '@playwright/test';
import { BaseComponent } from '@components/BaseComponent';

/**
 * Generic data-table component. Scope it to a table root and read rows/cells.
 * Assumes semantic `<table>` markup (role=row / role=cell). Adapt selectors if
 * the Portal uses a div-grid instead.
 */
export class DataTable extends BaseComponent {
  get rows(): Locator {
    // Excludes the single placeholder row the app renders (`data-slot="empty"`)
    // when there is no data — otherwise `rowCount()` can never report 0. Also
    // excludes loading-skeleton rows (`data-slot="skeleton"` cells), which use
    // the same row/cell roles as real data rows but with empty text.
    return this.root
      .locator('tbody')
      .getByRole('row')
      .filter({ hasNot: this.page.locator('[data-slot="empty"]') })
      .filter({ hasNot: this.page.locator('[data-slot="skeleton"]') });
  }

  async rowCount(): Promise<number> {
    return this.rows.count();
  }

  /** First row whose text contains `text`. */
  rowContaining(text: string): Locator {
    return this.rows.filter({ hasText: text }).first();
  }

  async cellText(rowText: string, columnIndex: number): Promise<string> {
    const cell = this.rowContaining(rowText).getByRole('cell').nth(columnIndex);
    return (await cell.textContent())?.trim() ?? '';
  }
}
