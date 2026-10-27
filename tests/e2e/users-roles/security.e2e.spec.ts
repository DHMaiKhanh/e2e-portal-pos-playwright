import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';
import { expectUnauthenticatedRedirect } from '@helpers/security';

/**
 * Users & Roles is a platform-wide RBAC admin screen, so the unauthenticated
 * deep-link case matters: a signed-out visitor must be bounced to /login with
 * none of the user list — and no user email — leaking into the HTML.
 */
test.describe('Bảo mật (Security) — Users & Roles (chưa đăng nhập)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * TC-USR-130 — an unauthenticated visitor is bounced to /login with no data.
   */
  test(
    'TC-USR-130 — unauthenticated visitor is redirected to /login with no user data',
    { tag: [Tag.REGRESSION, Tag.UI, Tag.SMOKE] },
    async ({ page }) => {
      await expectUnauthenticatedRedirect(page, Urls.USERS, [
        page.getByRole('table'),
        page.locator('tbody tr'),
      ]);

      await expect(
        page
          .getByRole('button', { name: /continue with/i })
          .or(page.getByRole('link', { name: /continue with/i }))
          .first(),
      ).toBeVisible();

      // No user email may be server-rendered into the signed-out HTML.
      const html = await page.content();
      expect(html).not.toMatch(/@fastboy\.net/i);
    },
  );
});
