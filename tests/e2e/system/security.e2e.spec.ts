import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect } from '@helpers/security';

/**
 * System is an Internal/admin feature, so the signed-out deep link matters: an
 * unauthenticated visitor hitting the App Versions route must be bounced to
 * /login with none of the build catalogue leaking into the HTML.
 */
test.describe('Bảo mật (Security) — System (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-SYS-130 — an unauthenticated visitor is redirected to /login with no data.
   */
  test(
    'TC-SYS-130 — unauthenticated visitor is redirected to /login with no version data',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.VERSIONS, [
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
