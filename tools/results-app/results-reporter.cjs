/**
 * Playwright reporter feeding the "Portal POS Test Results" desktop app.
 *
 * On every run that executed at least one test it writes, under reports/desktop-app/:
 *   latest.json        the run, normalised for the app (tests, errors, screenshots, steps)
 *   runs/<id>.json     the same, kept for the history tab (last MAX_RUNS)
 *   history.json       one summary row per run
 * and then opens (or focuses) the app window so the results show up right away.
 *
 * Opening the window is skipped on CI (CI / JENKINS_URL set) and when RESULTS_APP_OPEN=0
 * (runs started from inside the app set this).
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { folderLabel } = require('./labels.cjs');

const ROOT = path.resolve(__dirname, '../..');
const DATA = path.join(ROOT, 'reports', 'desktop-app');
const RUNS = path.join(DATA, 'runs');
const MAX_RUNS = 30;
const MAX_STEPS = 40;
const STEP_CATEGORIES = new Set(['test.step', 'pw:api', 'expect']);

const stripAnsi = (s) => String(s ?? '').replace(/\u001b\[[0-9;]*m/g, '');
const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

/** Top-level steps worth showing a non-coder, with a flag on the one that failed. */
function flattenSteps(steps) {
  const out = [];
  const hasError = (s) => Boolean(s.error) || (s.steps ?? []).some(hasError);
  for (const step of steps ?? []) {
    if (!STEP_CATEGORIES.has(step.category)) continue;
    out.push({
      title: stripAnsi(step.title),
      category: step.category,
      duration: Math.round(step.duration),
      failed: hasError(step),
    });
  }
  if (out.length <= MAX_STEPS) return { steps: out, hidden: 0 };
  return { steps: out.slice(-MAX_STEPS), hidden: out.length - MAX_STEPS };
}

function statusOf(test) {
  if (test.results.length === 0) return 'notRun';
  switch (test.outcome()) {
    case 'expected':
      return 'passed';
    case 'flaky':
      return 'flaky';
    case 'skipped':
      return 'skipped';
    default:
      return 'failed';
  }
}

class ResultsAppReporter {
  onBegin(config, suite) {
    this.config = config;
    this.suite = suite;
    this.startTime = new Date();
  }

  onEnd(result) {
    const all = this.suite.allTests();
    if (!all.some((t) => t.results.length > 0)) return; // --list, or nothing executed
    const testDir = this.config.rootDir;
    const tests = all.map((test) => {
      const status = statusOf(test);
      const rel = path.relative(testDir, test.location.file).split(path.sep);
      const screen = rel[0] === 'e2e' && rel.length > 2 ? rel[1] : rel[0].replace(/\..*$/, '');
      const [, project, , ...rest] = test.titlePath();
      // For a flaky test, show the failed attempt; otherwise the last one.
      const shown =
        (status === 'flaky' && test.results.find((r) => r.status !== 'passed')) ||
        test.results[test.results.length - 1];
      const error = shown?.error;
      const { steps, hidden } = flattenSteps(shown?.steps);
      return {
        id: test.id,
        title: test.title,
        describe: rest.slice(0, -1).join(' › '),
        project,
        file: path.relative(ROOT, test.location.file).replace(/\\/g, '/'),
        line: test.location.line,
        screen,
        screenLabel: folderLabel(screen),
        tags: test.tags,
        status,
        duration: Math.round(test.results.reduce((a, r) => a + r.duration, 0)),
        retries: Math.max(0, test.results.length - 1),
        skipReason:
          test.annotations.find((a) => a.type === 'skip' || a.type === 'fixme')?.description ?? '',
        fixme: test.annotations.some((a) => a.type === 'fixme'),
        error: error
          ? {
              message: stripAnsi(error.message).trim(),
              location: error.location
                ? `${path.relative(ROOT, error.location.file).replace(/\\/g, '/')}:${error.location.line}`
                : '',
            }
          : null,
        attachments: (shown?.attachments ?? [])
          .filter((a) => a.path && fs.existsSync(a.path))
          .map((a) => ({ name: a.name, contentType: a.contentType, path: a.path })),
        steps,
        hiddenSteps: hidden,
      };
    });

    const count = (s) => tests.filter((t) => t.status === s).length;
    const stats = {
      total: tests.length,
      passed: count('passed'),
      failed: count('failed'),
      flaky: count('flaky'),
      skipped: count('skipped'),
      notRun: count('notRun'),
    };
    const id = this.startTime.toISOString().replace(/[:.]/g, '-');
    const run = {
      id,
      startTime: this.startTime.toISOString(),
      duration: Math.round(result.duration),
      status: result.status,
      env: process.env.ENV ?? 'local',
      command: ['playwright', ...process.argv.slice(2)].join(' '),
      stats,
      tests,
    };

    fs.mkdirSync(RUNS, { recursive: true });
    fs.writeFileSync(path.join(RUNS, `${id}.json`), JSON.stringify(run));
    const history = readJson(path.join(DATA, 'history.json'), []).filter((h) => h.id !== id);
    history.push({
      id,
      startTime: run.startTime,
      duration: run.duration,
      status: run.status,
      env: run.env,
      stats,
    });
    const kept = history.slice(-MAX_RUNS);
    for (const old of history.slice(0, -MAX_RUNS)) {
      fs.rmSync(path.join(RUNS, `${old.id}.json`), { force: true });
    }
    fs.writeFileSync(path.join(DATA, 'history.json'), JSON.stringify(kept, null, 2));
    // Written last: the app watches this file.
    fs.writeFileSync(path.join(DATA, 'latest.json'), JSON.stringify(run));

    this.openApp();
  }

  openApp() {
    if (process.env.CI || process.env.JENKINS_URL || process.env.RESULTS_APP_OPEN === '0') return;
    let electron;
    try {
      electron = require('electron'); // path to the Electron binary when required from Node
    } catch {
      return; // Electron not installed — results are still on disk
    }
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    spawn(electron, [path.join(__dirname, 'main.cjs'), '--show-latest'], {
      cwd: ROOT,
      env,
      detached: true,
      stdio: 'ignore',
    }).unref();
  }

  printsToStdio() {
    return false;
  }
}

module.exports = ResultsAppReporter;
