import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect } from '@helpers/security';

/**
 * Devices is a cross-merchant admin screen listing the live POS fleet, so the
 * unauthenticated-access case matters: a signed-out visitor must be bounced to
 * /login with none of the fleet table leaking into the HTML.
 */
test.describe('Bảo mật (Security) — Devices (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-DEV-130 — an unauthenticated visitor is bounced to /login with no rows.
   */
  test(
    'TC-DEV-130 — unauthenticated visitor is redirected to /login with no device data',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.DEVICES, [
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
