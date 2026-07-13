// One command to run the whole suite and open the React dashboard with
// pass/fail counts, failure reasons and per-test screenshots — regardless
// of whether the test run itself passed or failed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DASHBOARD_APP = path.join(ROOT, 'reports/dashboard-app');

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  return result.status ?? 1;
}

console.log('=== 1/3: Running Playwright test suite ===');
const testExitCode = run('npx', ['cross-env', 'ENV=local', 'playwright', 'test']);
if (testExitCode !== 0) {
  console.log(`\nTest run finished with failures (exit code ${testExitCode}). Building dashboard anyway...`);
}

console.log('\n=== 2/3: Building React dashboard from results ===');
if (!fs.existsSync(path.join(DASHBOARD_APP, 'node_modules'))) {
  const installCode = run('npm', ['install'], { cwd: DASHBOARD_APP });
  if (installCode !== 0) process.exit(installCode);
}
const buildCode = run('npm', ['run', 'build'], { cwd: DASHBOARD_APP });
if (buildCode !== 0) process.exit(buildCode);

console.log('\n=== 3/3: Opening dashboard ===');
const indexHtml = path.join(DASHBOARD_APP, 'dist', 'index.html');
const openCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
run(openCmd, [process.platform === 'win32' ? '""' : '', `"${indexHtml}"`]);

console.log(`\nDashboard: ${indexHtml}`);
process.exit(testExitCode);
