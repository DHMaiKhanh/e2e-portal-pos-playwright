/**
 * Route-interception helpers.
 *
 * A batch of test cases ("shows a loading skeleton", "renders an error state
 * when the list API fails", "recovers from a timeout") were parked as
 * `test.fixme` with the note that no route-mocking helper was wired up. These
 * are those helpers. They are page-scoped (`page.route`), so they are safe
 * under the worker-shared BrowserContext — a handler installed by one test
 * cannot leak into another test's page.
 */

import { expect, type Page, type Route } from '@playwright/test';
import { Timeouts } from '@configs/constants/timeouts';

/**
 * Requests the Portal makes to fetch screen data.
 *
 * Two things make this narrower than it looks. The Portal is a Next.js app that
 * server-renders the *first* paint, so a full `page.goto()` gets its data
 * server-side where `page.route()` cannot reach it. Only client-side
 * navigations (clicking a sidebar link, changing a filter) fetch over XHR from
 * the browser — and those go to a separate data host, e.g.
 * `https://volt-pos.v2.dev-fastboypay.com/customers`, not to a `/api/` path on
 * the app origin.
 *
 * So: these helpers only bite on client-side navigation, and the matcher keys
 * off the data host. Specs must reach a screen by clicking, not by `goto`, for
 * an injected failure to be observed.
 */
const DATA_HOST = /(^|\/\/)(volt-pos|sys)\./;

const isDataRequest = (url: string): boolean => DATA_HOST.test(url) || /\/api\//.test(url);

type Matcher = (url: string) => boolean;

const resolveMatcher = (match?: string | RegExp | Matcher): Matcher => {
  if (!match) return isDataRequest;
  if (typeof match === 'function') return match;
  if (match instanceof RegExp) return (url) => match.test(url);
  return (url) => url.includes(match);
};

/**
 * Delay matching data responses by `ms` so a loading state stays on screen long
 * enough to assert against. The request still completes, so the screen settles
 * normally afterwards and the test can assert the loaded state too.
 */
export const delayDataResponses = async (
  page: Page,
  ms: number,
  match?: string | RegExp | Matcher,
): Promise<void> => {
  const matcher = resolveMatcher(match);
  await page.route('**/*', async (route: Route) => {
    if (!matcher(route.request().url())) return route.fallback();
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.fallback();
  });
};

/** Fail matching data requests with an HTTP status, to exercise the error UI. */
export const failDataResponses = async (
  page: Page,
  status = 500,
  match?: string | RegExp | Matcher,
): Promise<void> => {
  const matcher = resolveMatcher(match);
  await page.route('**/*', async (route: Route) => {
    if (!matcher(route.request().url())) return route.fallback();
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Injected ${status} for E2E error-state test` }),
    });
  });
};

/** Abort matching data requests outright — models a dropped connection. */
export const abortDataResponses = async (
  page: Page,
  match?: string | RegExp | Matcher,
): Promise<void> => {
  const matcher = resolveMatcher(match);
  await page.route('**/*', async (route: Route) => {
    if (!matcher(route.request().url())) return route.fallback();
    await route.abort('failed');
  });
};

/**
 * Serve matching data requests with a 401 so the app sees its session expire
 * mid-flow. Used by the "expired session redirects to login" cases, which
 * cannot invalidate the real token without breaking the shared session.
 */
export const expireSessionResponses = async (
  page: Page,
  match?: string | RegExp | Matcher,
): Promise<void> => {
  const matcher = resolveMatcher(match);
  await page.route('**/*', async (route: Route) => {
    if (!matcher(route.request().url())) return route.fallback();
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    });
  });
};

/** Remove every handler installed above, letting traffic hit the real backend. */
export const restoreNetwork = async (page: Page): Promise<void> => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
};

/**
 * Land on a screen and wait until the SPA shell is interactive.
 *
 * The pairing for `clientSideNavigate`: a later sidebar click only stays inside
 * the SPA once the shell has hydrated, and `domcontentloaded` alone does not
 * guarantee that. Gate on the sidebar's own menu buttons rather than
 * `networkidle`, which this project's lint config rules out as a wait
 * condition, and which the Portal's background polling would defeat anyway.
 */
export const landOnShell = async (page: Page, path: string): Promise<void> => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Under a full-suite run (8 workers hitting the same remote Portal) the shell
  // regularly needs more than the default 10s expect timeout to hydrate; the
  // default makes session-expiry cases flaky on first attempt. Give it the same
  // congestion margin the list screens use.
  await expect(page.locator('[data-sidebar="menu-button"]').first()).toBeVisible({
    timeout: Timeouts.MEDIUM,
  });
};

/**
 * Reach a screen by clicking its sidebar link rather than `page.goto()`.
 *
 * This is the part that makes the helpers above work: a `goto` is a fresh
 * document request that Next.js answers with server-rendered data, so an
 * injected failure never reaches the browser. Clicking keeps the SPA alive and
 * the screen fetches over XHR, where `page.route()` applies.
 *
 * The click is allowed to be interrupted: an injected 401 can bounce the app to
 * /login while the click is still in flight, and that redirect is usually the
 * very thing the caller is asserting.
 */
export const clientSideNavigate = async (page: Page, linkName: RegExp): Promise<void> => {
  await page
    .getByRole('link', { name: linkName })
    .first()
    .click({ noWaitAfter: true })
    .catch(() => {});
};

/**
 * The Portal's loading placeholders, shared by every list screen.
 *
 * Scoped to `:visible` deliberately: once a table has loaded it keeps ~50
 * *hidden* skeleton nodes mounted for good, so an unscoped count never returns
 * to 0 and any "loading has finished" wait would burn its whole timeout. The
 * page objects scope the same way (see CustomersPage.waitForReady).
 */
export const skeletons = (page: Page) => page.locator('[data-slot="skeleton"]:visible');
