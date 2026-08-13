import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { Urls } from '@constants/urls';

// This suite tests the login flow itself, so it must start signed OUT —
// override the project-level storageState.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * These two cases were parked as `test.skip` describing a username/password
 * form. The Portal has never had one: sign-in is federated (GCI Business or
 * Google), which is why `npm run auth` captures a session by hand. Asserting
 * against a form that does not exist is not coverage, so the cases now pin the
 * behaviour the screen actually has — the provider choices it offers, and the
 * fact that a deep link survives the bounce through /login.
 */
test.describe(`Auth — login ${Tag.SMOKE} ${Tag.AUTH}`, () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.waitForReady();
  });

  test(
    'offers federated sign-in only — no credential form is rendered',
    { tag: [Tag.SMOKE, Tag.AUTH] },
    async ({ loginPage, page }) => {
      await test.step('Both identity providers are offered', async () => {
        await expect(loginPage.signInHeading).toBeVisible();
        await expect(loginPage.gciSignInButton).toBeEnabled();
        await expect(loginPage.googleSignInLink).toBeVisible();
      });

      await test.step('Google hands off to the SSO host with a return URL', async () => {
        await expect(loginPage.googleSignInLink).toHaveAttribute('href', /.+/);
        const href = (await loginPage.googleSignInLink.getAttribute('href')) as string;
        const target = new URL(href);
        expect(target.pathname).toContain('/sso/google_oauth');
        // The Portal must ask to be sent back to itself, or a completed sign-in
        // strands the user on the identity host.
        expect(target.searchParams.get('redirectUri')).toContain('/login');
      });

      await test.step('No password field exists to submit', async () => {
        await expect(page.locator('input[type="password"]')).toHaveCount(0);
        await expect(loginPage.passwordInput).toHaveCount(0);
      });
    },
  );

  test(
    'deep link while signed out bounces to /login and preserves the target',
    { tag: [Tag.SMOKE, Tag.AUTH] },
    async ({ page }) => {
      await page.goto(Urls.CUSTOMERS, { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveURL(/\/login/);

      // Without the redirect param the user lands on the store overview after
      // signing in and has to navigate back by hand, so it is part of the
      // contract rather than an implementation detail.
      const url = new URL(page.url());
      expect(url.searchParams.get('redirect')).toBe(Urls.CUSTOMERS);

      // Nothing from the protected screen may render on the way through.
      await expect(page.locator('table tbody tr')).toHaveCount(0);
    },
  );
});
