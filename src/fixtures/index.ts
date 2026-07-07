import { mergeTests, expect } from '@playwright/test';
import { pagesFixture } from './pages.fixture';
import { apiFixture } from './api.fixture';

/**
 * Single entry point for tests:
 *
 *   import { test, expect } from '@fixtures/index';
 *
 *   test('...', async ({ loginPage, dashboardPage, apiClient }) => { ... });
 */
export const test = mergeTests(pagesFixture, apiFixture);
export { expect };
