import { test as base, type BrowserContext, type Page, type ViewportSize } from '@playwright/test';
import { env } from '@configs/env/loadEnv';

/**
 * One BrowserContext per worker, one fresh Page per test.
 *
 * Playwright's default is a brand-new context per test, which means a cold HTTP
 * cache every time: each test re-downloads the ~75 hashed bundle assets before
 * the app can start hydrating. Measured on the Customers screen:
 *
 *   new context per test (default) : nav ~0.9s + data ~3.4s = ~4.3s
 *   shared context, new page       : nav ~0.4s + data ~1.4s = ~1.8s
 *
 * Each test still gets its own Page, so it starts on a clean DOM with a fresh
 * JS heap and the project's default viewport — what leaks between tests is only
 * the context-level state: the HTTP cache (the point), cookies and localStorage.
 * That is acceptable here because every UI test already shares one signed-in
 * admin session via `storageState`; there is no per-test identity to protect.
 *
 * Specs that need a *different* session (signed-out / another role) or a
 * different viewport opt out declaratively:
 *
 *   test.use({ storageState: { cookies: [], origins: [] } });   // signed out
 *   test.use({ viewport: { width: 375, height: 812 } });        // mobile
 *
 * The `context` fixture below compares the resolved options against the project
 * defaults and builds a dedicated, per-test context whenever they differ. Before
 * that check existed this fixture passed a hardcoded `contextOptions` to
 * `browser.newContext()`, so `test.use()` overrides were silently ignored — a
 * signed-out spec still ran signed in, and a 375px spec still ran at 1920px.
 * That silent failure is why a batch of auth/responsive test cases were parked
 * as `test.fixme` with "the fixture setup does not support it".
 *
 * Specs that build a context by hand from the `browser` fixture still work and
 * are unaffected by the sharing either way.
 *
 * Artifacts, and the one thing this costs:
 *   - trace   — still per test. Playwright instruments contexts built from the
 *               `browser` fixture, so `trace` from playwright.config.ts applies.
 *   - screenshot-on-failure — reproduced below, since that is wired to
 *               Playwright's own `page` fixture, which this overrides.
 *   - video   — LOST. `recordVideo` is a context-level option, so per-test video
 *               only exists if each test owns a context. Verified: stock
 *               fixtures emit video.webm, a shared context cannot. Trace already
 *               carries screenshots + DOM snapshots + the full action log, which
 *               is strictly more useful for triage, so this is an accepted cost.
 *
 * Blast radius — the other real cost, observed on 2026-08-12: because the
 * context (and the browser behind it) is worker-scoped, a browser crash does not
 * cost one test, it costs every remaining test on that worker. A full-suite run
 * lost 6 consecutive Customers tests to a single crash, all reporting
 * "Target page, context or browser has been closed" / "browser.newContext:
 * Error setting storage state" rather than anything about themselves. The same
 * folder run on its own was green. So when a cluster of same-folder tests fails
 * with browser-lifecycle errors, suspect a crash, not the tests — and re-run
 * that folder alone to confirm before touching anything.
 *
 * Escape hatch: REUSE_CONTEXT=0 falls through to stock Playwright fixtures —
 * a context per test, and video back with it.
 */

const reuseEnabled = process.env.REUSE_CONTEXT !== '0';

/** The project defaults a shared context is allowed to represent. */
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };

/** Mirrors the `use` block in playwright.config.ts — a hand-built context gets no project options. */
const contextOptions = {
  baseURL: env.BASE_URL,
  storageState: env.STORAGE_STATE,
  viewport: DEFAULT_VIEWPORT,
  ignoreHTTPSErrors: true,
  locale: 'en-US',
  timezoneId: process.env.TZ_ID ?? 'Asia/Ho_Chi_Minh',
};

/**
 * The shared context is baked with the signed-in admin session at the desktop
 * viewport. A test that asks for anything else cannot be served from it, so it
 * gets a context of its own.
 */
const needsOwnContext = (
  storageState: string | { cookies: unknown[]; origins: unknown[] } | undefined,
  viewport: ViewportSize | null | undefined,
): boolean => {
  if (storageState !== env.STORAGE_STATE) return true;
  if (!viewport) return true;
  return viewport.width !== DEFAULT_VIEWPORT.width || viewport.height !== DEFAULT_VIEWPORT.height;
};

/**
 * An authenticated page in a context of its own, torn down with the test.
 *
 * For tests whose side effects must not reach the worker-shared context: faking
 * a 401 to prove the app bounces to /login (the app may clear the session on the
 * way out), or switching the active merchant (which the Portal remembers). Both
 * would otherwise strand every later test on that worker signed out or pointed
 * at the wrong store.
 *
 * Use the plain `page` fixture for everything else — this one pays the cold-cache
 * cost the shared context exists to avoid.
 */
type IsolatedFixtures = { isolatedPage: Page };

const sharedContextTest = base.extend<IsolatedFixtures, { sharedContext: BrowserContext }>({
  isolatedPage: async ({ browser }, use) => {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  sharedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext(contextOptions);
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  context: async ({ sharedContext, browser, storageState, viewport }, use) => {
    if (!needsOwnContext(storageState, viewport)) {
      await use(sharedContext);
      return;
    }

    const ownContext = await browser.newContext({
      ...contextOptions,
      storageState,
      viewport: viewport ?? DEFAULT_VIEWPORT,
    });
    await use(ownContext);
    await ownContext.close();
  },

  page: async ({ context }, use, testInfo) => {
    const page = await context.newPage();
    await use(page);

    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      await page
        .screenshot({ path: testInfo.outputPath('test-failed-1.png'), fullPage: true })
        .then((body) => testInfo.attach('screenshot', { body, contentType: 'image/png' }))
        .catch(() => {});
    }

    await page.close();
  },
});

/**
 * With REUSE_CONTEXT=0 nothing is shared: Playwright's own context/page fixtures
 * (and video) apply unchanged. `isolatedPage` still has to exist, or every spec
 * that uses it fails to resolve its fixtures under the escape hatch — but with a
 * context per test already, it is just the normal page.
 */
const stockContextTest = base.extend<IsolatedFixtures>({
  isolatedPage: async ({ page }, use) => {
    await use(page);
  },
});

export const reuseContextFixture = reuseEnabled ? sharedContextTest : stockContextTest;
