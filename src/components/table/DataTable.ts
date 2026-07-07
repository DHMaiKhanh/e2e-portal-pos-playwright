import { Locator } from '@playwright/test';
import { BaseComponent } from '@components/BaseComponent';

/**
 * Generic data-table component. Scope it to a table root and read rows/cells.
 * Assumes semantic `<table>` markup (role=row / role=cell). Adapt selectors if
 * the Portal uses a div-grid instead.
 */
export class DataTable extends BaseComponent {
  get rows(): Locator {
    return this.root.getByRole('row');
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
