import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect } from '@helpers/security';

/**
 * All Orders is a cross-merchant admin list, so the unauthenticated-access case
 * matters: a signed-out visitor must be bounced to /login with none of the order
 * data (and no table rows) leaking into the HTML.
 */
test.describe('Bảo mật (Security) — All Orders (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-AOR-130 — an unauthenticated visitor is bounced to /login with no data.
   */
  test(
    'TC-AOR-130 — unauthenticated visitor is redirected to /login with no order data',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.ALL_ORDERS, [
        page.getByRole('table'),
        page.locator('tbody tr'),
      ]);

      await expect(
        page
          .getByRole('button', { name: /continue with/i })
          .or(page.getByRole('link', { name: /continue with/i }))
          .first(),
      ).toBeVisible();
    },
  );
});
