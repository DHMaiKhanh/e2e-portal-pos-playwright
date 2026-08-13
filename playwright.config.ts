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

  // Portal POS is a multi-user web app; tests are written to be independent, so
  // they parallelise safely (pass/fail counts were identical at 4/8/16/24
  // workers). The suite is network-bound — it drives a *remote* Portal, so the
  // ceiling is the server, not local cores. Measured on the customers folder:
  //
  //   workers   wall    avg passing test   p99
  //     4      105.8s        5.51s         7.3s
  //     8       63.8s        6.16s         8.5s   <- chosen
  //    16       62.0s       11.06s        18.1s
  //    24       69.6s       14.48s        28.0s   <- slower overall
  //
  // Wall time is flat from 8 onwards, but per-test latency doubles as requests
  // queue server-side, pushing tests toward their timeouts for no gain. 8 buys
  // the same wall clock with ~2x the headroom. Override with WORKERS=n.
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : 8,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/json/results.json' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    [
      'allure-playwright',
      { outputFolder: 'reports/allure-results', detail: true, suiteTitle: true },
    ],
    // Opt-in profiling: STEP_TIMING_OUT=<file> attributes wall time to
    // individual steps, which per-test totals cannot show. Off by default.
    ...(process.env.STEP_TIMING_OUT
      ? [['./tools/reporters/step-timing-reporter.ts', {}] as [string, object]]
      : []),
  ],

  use: {
    baseURL: env.BASE_URL,
    headless: env.HEADLESS,
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    // Tracing is OFF by default because it is not free, and `retain-on-failure`
    // is not the cheap setting it looks like: it records a trace for *every*
    // test and only discards the passing ones afterwards, so the recording cost
    // is paid on all ~400 tests to keep artefacts for a handful. Measured on
    // tests/e2e/payroll (33 tests, all passing, 8 workers, 2 reps each):
    //
    //   trace: retain-on-failure   39.4s / 37.7s   -> 38.5s
    //   trace: off                 29.0s / 28.7s   -> 28.8s   (-25%)
    //
    // Failures still produce a screenshot, error-context.md and the full call
    // log, which is enough to localise most breakages. When that is not enough,
    // re-run just the failures with tracing on — seconds, not a full suite:
    //
    //   TRACE=retain-on-failure npx playwright test --last-failed
    //
    trace: (process.env.TRACE ?? 'off') as 'on' | 'retain-on-failure' | 'off',
    screenshot: 'only-on-failure',
    // NOTE: tests share one BrowserContext per worker (src/fixtures/
    // reuseContext.fixture.ts) and `recordVideo` is a context-level option, so
    // this setting has no effect by default — trace covers triage instead.
    // Run with REUSE_CONTEXT=0 to get per-test contexts and video back.
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
