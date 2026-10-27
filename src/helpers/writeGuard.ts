/**
 * Mutation guard for the Internal/admin screens.
 *
 * The admin area carries platform-wide, hard-to-reverse actions — publish/pause
 * an app version, toggle a feature flag, save a system setting, send a remote
 * action to a live POS, approve/deactivate a device, select a merchant's plan,
 * create/assign a role. The QA brief forbids firing any of them on the shared
 * DEV environment, yet the suite still needs to prove the controls are present
 * and wired. So every admin page object offers a `blockWrites()` that specs call
 * BEFORE navigating: it lets GET/HEAD/OPTIONS through untouched and aborts every
 * other method, recording each blocked call as `"<METHOD> <url>"`.
 *
 * This is the same shape as `OrderDetailPage.blockOrderMutations()` and
 * `CheckoutSettingPage.mockSettingWrites()`, factored out so the six admin
 * screens don't each re-implement it. Page-scoped (`page.route`), so a handler
 * installed by one test cannot leak into another test's page under the
 * worker-shared BrowserContext.
 */

import type { Page, Route } from '@playwright/test';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Abort every non-GET request (optionally only those whose URL matches
 * `matcher`) and record it. Returns the live recorder array — assert against it
 * to prove an action was *attempted* but never reached the backend.
 *
 * Call before `goto()`. With no `matcher`, every mutating request on the page is
 * blocked, which is the right default for a read-only admin screen.
 */
export const blockMutations = async (
  page: Page,
  matcher?: (url: URL) => boolean,
): Promise<string[]> => {
  const blocked: string[] = [];
  await page.route('**/*', async (route: Route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (SAFE_METHODS.has(method)) {
      await route.fallback();
      return;
    }
    if (matcher && !matcher(new URL(request.url()))) {
      await route.fallback();
      return;
    }
    blocked.push(`${method} ${request.url()}`);
    await route.abort('blockedbyclient');
  });
  return blocked;
};
