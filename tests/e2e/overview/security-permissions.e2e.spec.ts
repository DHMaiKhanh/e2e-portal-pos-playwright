import { test, expect } from '@fixtures/index';
import { Tag } from '@/types/testTags';
import { env } from '@configs/env/loadEnv';

/**
 * Overview screen — "Security & Permissions" area (lean core).
 *
 * The one deterministic, non-destructive security check: an unauthenticated deep
 * link to the store Overview must bounce to /login. It runs in a throwaway
 * context created WITHOUT storageState, so it can never affect the shared
 * authenticated session other specs reuse. (Expired/tampered tokens, cross-store
 * IDOR, and admin-vs-non-admin role checks need session/role setup the single
 * reused session can't reproduce and are out of the lean core.)
 */
test.describe('Security & Permissions — Overview', () => {
  test(
    'TC-OVW-235 — redirects an unauthenticated deep link to /login',
    { tag: [Tag.REGRESSION, Tag.AUTH] },
    async ({ browser }) => {
      // Fresh, unauthenticated context (no storageState) with the configured baseURL.
      const context = await browser.newContext({ storageState: undefined, baseURL: env.BASE_URL });
      const page = await context.newPage();
      try {
        await page.goto(`/pos/${env.STORE_ID}/overview`, { waitUntil: 'domcontentloaded' });
        // Bounced to the login screen...
        await expect(page).toHaveURL(/\/login/);
        // ...and no authenticated Overview affordance leaked before the redirect.
        await expect(page.getByRole('button', { name: /generate token/i })).toHaveCount(0);
      } finally {
        await context.close();
      }
    },
  );
});
