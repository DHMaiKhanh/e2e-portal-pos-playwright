/**
 * Shared assertions for the "unauthenticated deep link" security cases.
 *
 * Several screens carry the same test case — hit the store-scoped route with no
 * session, expect a bounce to /login and no data on the way through. They were
 * all parked as `test.fixme` because the shared-context fixture ignored
 * `test.use({ storageState })`. It no longer does (see
 * src/fixtures/reuseContext.fixture.ts), so the specs opt out of the signed-in
 * session declaratively and call the helper below.
 */

import { expect, type Page } from '@playwright/test';

/**
 * Navigate to `path` with whatever session the calling test declared (these
 * call sites declare none) and assert the app refuses to render the screen.
 *
 * `dataLocators` are screen-specific affordances that must never appear for a
 * signed-out visitor — passing the table/heading of the screen under test is
 * what makes this an assertion about *that* screen rather than a generic
 * redirect check.
 */
export const expectUnauthenticatedRedirect = async (
  page: Page,
  path: string,
  dataLocators: Array<ReturnType<Page['locator']>> = [],
): Promise<void> => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login/);

  for (const locator of dataLocators) {
    await expect(locator).toHaveCount(0);
  }
};

/**
 * A store id outside the signed-in account's merchant list. Verified against the
 * DEV portal: the account's merchant switcher lists ids in the 3–100004 range,
 * and 99999 is absent, so it exercises the "not one of yours" path rather than
 * the "no such store" path. Deliberately not 0/-1, which would be caught by
 * route param validation instead of the authorisation check.
 */
export const UNAUTHORISED_STORE_ID = '99999';

/**
 * Assert a store-scoped route refuses to serve a store the account cannot see.
 *
 * Observed behaviour on the DEV portal: the app keeps its chrome, replaces the
 * screen body with "This merchant is not available." plus a switcher listing the
 * merchants the account *does* have, and renders no table. The important half is
 * the negative one — no rows of another merchant's data reach the DOM.
 */
export const expectCrossStoreBlocked = async (
  page: Page,
  pathForStore: (storeId: string) => string,
): Promise<void> => {
  await page.goto(pathForStore(UNAUTHORISED_STORE_ID), { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/this merchant is not available/i)).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);
};
