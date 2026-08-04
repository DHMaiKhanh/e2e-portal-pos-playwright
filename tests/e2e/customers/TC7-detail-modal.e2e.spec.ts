import { test } from '@fixtures/index';
import { Tag } from '@/types/testTags';

test.describe('Chi tiết khách hàng / Modal (Detail-modals-drawers) — Customers', () => {
  test.beforeEach(async ({ customersPage }) => {
    await customersPage.goto();
  });

  /**
   * TC-CUS-052 — Click vào một dòng khách hàng có mở modal/drawer chi tiết hay không.
   * Steps: click a table row; observe response.
   * Expected: detail modal/drawer opens, or (if unimplemented) the row stays put with no error.
   */
  // TODO(manual/setup): scanner could not confirm whether row-click opens a detail
  // modal/drawer — needs live verification before asserting concrete behavior.
  test.fixme(
    'TC-CUS-052 — row click opens (or safely no-ops on) detail',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-CUS-053 — Detail modal/drawer content matches the row's data exactly.
   */
  // TODO(manual/setup): depends on TC-CUS-052 confirming the detail view exists.
  test.fixme(
    'TC-CUS-053 — detail content matches row data exactly',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-CUS-054 — Closing the detail modal/drawer via an explicit close control.
   */
  // TODO(manual/setup): depends on TC-CUS-052 confirming the detail view exists.
  test.fixme(
    'TC-CUS-054 — close button dismisses detail and restores table state',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );

  /**
   * TC-CUS-055 — Closing the detail modal via the Escape key.
   */
  // TODO(manual/setup): depends on TC-CUS-052 confirming the detail view exists.
  test.fixme(
    'TC-CUS-055 — Escape key dismisses detail modal',
    { tag: [Tag.REGRESSION, Tag.UI] },
    async () => {},
  );
});
