import { test } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Edit Order — Activity log & tag "Updated" (VP-2591 / VP-2593).
 * Source: docs/test-cases/edit-order.md (TC-EO-065 … TC-EO-068).
 *
 * Every case in this area only becomes observable AFTER an edit has been
 * persisted via the confirm popup's "Confirm update". Specs must never click
 * that button on live DEV data, so all cases are scaffolded as test.fixme.
 */
test.describe('Activity log & tag Updated — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    // Safety net: abort every non-GET to orders/customers so nothing can mutate DEV.
    await orderDetailPage.blockOrderMutations();
  });
});
