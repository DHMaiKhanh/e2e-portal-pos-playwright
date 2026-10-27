import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect } from '@helpers/security';

/**
 * Monitoring (Remote Actions + Change Logs) are cross-merchant admin screens, so
 * the unauthenticated-access case matters: a signed-out visitor must be bounced
 * to /login with none of the feed leaking into the HTML. Both routes carry the
 * same case, so each is asserted independently below.
 */
test.describe('Bảo mật (Security) — Monitoring (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-MON-130 — unauthenticated visitor to Remote Actions is bounced to /login
   * with no data.
   */
  test(
    'TC-MON-130 — unauthenticated Remote Actions visit redirects to /login with no data',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.REMOTE_ACTIONS, [
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

  /**
   * TC-MON-131 — unauthenticated visitor to Change Logs is bounced to /login with
   * no data.
   */
  test(
    'TC-MON-131 — unauthenticated Change Logs visit redirects to /login with no data',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.CHANGE_LOGS, [
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
