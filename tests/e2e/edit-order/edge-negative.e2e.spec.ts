import { test } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Edit Order (VP-2591 / VP-2593) — "Edge case / Negative / Phi chức năng".
 * Source: docs/test-cases/edit-order.md
 *
 * Both cases in this area need a real 'Confirm update' (persistence + error handling on
 * the save API), which is forbidden on live DEV data, so they are scaffolded as
 * test.fixme. Every test still installs blockOrderMutations() so no non-GET request to
 * /orders, /customers or split_tip can reach the live DEV Portal.
 */
test.describe('Edge case / Negative / Phi chức năng — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });
});
