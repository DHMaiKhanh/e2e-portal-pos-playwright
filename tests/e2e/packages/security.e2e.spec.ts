import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect } from '@helpers/security';

/**
 * Packages is a cross-merchant admin catalogue, so the unauthenticated-access
 * case matters: a signed-out visitor must be bounced to /login with none of the
 * catalogue leaking into the HTML.
 */
test.describe('Bảo mật (Security) — Packages (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-PKG-130 — an unauthenticated visitor is bounced to /login with no data.
   */
  test(
    'TC-PKG-130 — unauthenticated visitor is redirected to /login with no package data',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.PACKAGES, [
        page.getByRole('table'),
        page.locator('tbody tr'),
      ]);

      await expect(
        page
          .getByRole('button', { name: /continue with/i })
          .or(page.getByRole('link', { name: /continue with/i }))
          .first(),
      ).toBeVisible();

      // Package names must not be server-rendered into the signed-out HTML.
      const html = await page.content();
      expect(html).not.toMatch(/GO POS (BASIC|DELUXE|PREMIUM)/i);
    },
  );
});
