import { test } from '@fixtures/index';
import { Tag } from '@/types/testTags';

/**
 * Edit Order — area "Dòng Store (không có staff)" (VP-2593 TC23–TC26).
 *
 * All cases in this area are 🔍 unverified in the scan: DEV currently has no
 * order containing a store item (a line without staff), so they are scaffolded
 * as test.fixme until such data exists. Every test still installs the
 * mutation blocker so no live DEV order can be changed.
 */
test.describe('Dòng Store (không có staff) — Edit Order', () => {
  test.beforeEach(async ({ orderDetailPage }) => {
    await orderDetailPage.blockOrderMutations();
  });
});
