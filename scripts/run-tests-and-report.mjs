// One command to run the whole suite and open a self-contained HTML dashboard
// with pass/fail counts, failure reasons and per-test screenshots — regardless
// of whether the test run itself passed or failed.
//
//   ENV=stage npm run test:report       # run + build dashboard + open
//   NO_OPEN=1 npm run test:report       # CI: skip opening a browser
//
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const ENV = process.env.ENV || 'stage';

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  return result.status ?? 1;
}

console.log('=== 1/3: Running Playwright test suite ===');
const testExitCode = run('npx', ['cross-env', `ENV=${ENV}`, 'playwright', 'test']);
if (testExitCode !== 0) {
  console.log(
    `\nTest run finished with failures (exit code ${testExitCode}). Building dashboard anyway...`,
  );
}

console.log('\n=== 2/3: Building dashboard from results ===');
const buildCode = run('node', ['scripts/build-dashboard.mjs']);
if (buildCode !== 0) process.exit(buildCode);

const indexHtml = path.join(ROOT, 'reports', 'dashboard', 'index.html');
if (process.env.NO_OPEN === '1') {
  console.log('\n=== 3/3: Skipping browser open (NO_OPEN=1) ===');
} else {
  console.log('\n=== 3/3: Opening dashboard ===');
  const openCmd =
    process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  run(openCmd, [process.platform === 'win32' ? '""' : '', `"${indexHtml}"`]);
}

console.log(`\nDashboard: ${indexHtml}`);
process.exit(testExitCode);
