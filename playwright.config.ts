import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from './configs/env/loadEnv';

const env = loadEnv();

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  snapshotDir: './tests/visual/__snapshots__',

  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
    toMatchSnapshot: { maxDiffPixelRatio: 0.02 },
  },

  // Portal POS is a multi-user web app; tests are written to be independent.
  // We pin to a single worker so only one browser runs at a time (sequential
  // execution) — raise `workers` again if you want parallel runs.
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/json/results.json' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    [
      'allure-playwright',
      { outputFolder: 'reports/allure-results', detail: true, suiteTitle: true },
    ],
  ],

  use: {
    baseURL: env.BASE_URL,
    headless: env.HEADLESS,
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    // Record everything for triage. For CI cost-sensitivity, set
    // TRACE=retain-on-failure / VIDEO=retain-on-failure to keep only failures.
    trace: (process.env.TRACE ?? 'on') as 'on' | 'retain-on-failure' | 'off',
    screenshot: 'only-on-failure',
    video: (process.env.VIDEO ?? 'retain-on-failure') as 'on' | 'retain-on-failure' | 'off',
    locale: 'en-US',
    timezoneId: process.env.TZ_ID ?? 'Asia/Ho_Chi_Minh',
    launchOptions: {
      slowMo: env.SLOW_MO,
    },
  },

  projects: [
    // Reusable login state is produced here once, then consumed by the UI
    // projects via `storageState`. Delete this project + dependency if the
    // suite logs in per-test instead.
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: '**/tests/api/**',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: env.STORAGE_STATE,
      },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: env.API_URL },
    },
    // Uncomment when cross-browser coverage is needed.
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
  ],
});
