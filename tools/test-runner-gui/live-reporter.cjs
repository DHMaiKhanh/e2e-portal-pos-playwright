// Streams per-test progress to the Test Runner GUI server as marker-prefixed
// JSON lines on stdout. The server strips these lines out of the console log
// and turns them into live status updates. Only loaded by the GUI's runs.
const path = require('path');

const MARK = '@@GUI@@';
const testsRoot = path.resolve(__dirname, '../../tests');

const emit = (event) => process.stdout.write(`\n${MARK}${JSON.stringify(event)}\n`);

// The `setup` project only restores the login session; it is not a selectable test.
const isSetup = (test) => test.parent.project()?.name === 'setup';

const keyOf = (test) => {
  const rel = path.relative(testsRoot, test.location.file).split(path.sep).join('/');
  return `${rel}:${test.location.line}:${test.title}`;
};

// Steps worth retelling to a non-technical tester. `test.step(...)` entries are
// the human-written ones; when a spec has none we fall back to the raw actions.
const STEP_CATS = new Set(['test.step', 'pw:api', 'expect']);

class LiveReporter {
  constructor() {
    this.steps = new Map(); // `${key}@${retry}` -> [{title, category, ok, dur, error}]
  }

  onBegin(_config, suite) {
    emit({ type: 'begin', total: suite.allTests().filter((t) => !isSetup(t)).length });
  }

  onTestBegin(test, result) {
    if (isSetup(test)) return;
    this.steps.set(`${keyOf(test)}@${result.retry}`, []);
    emit({ type: 'testBegin', key: keyOf(test), retry: result.retry });
  }

  onStepEnd(test, result, step) {
    if (isSetup(test) || !STEP_CATS.has(step.category)) return;
    const arr = this.steps.get(`${keyOf(test)}@${result.retry}`);
    if (!arr) return;
    arr.push({
      title: step.title,
      category: step.category,
      ok: !step.error,
      dur: Math.round(step.duration),
      error: step.error ? stripAnsi(step.error.message || '').split('\n')[0].slice(0, 200) : null,
    });
  }

  onTestEnd(test, result) {
    if (isSetup(test)) return;
    const outcome = test.outcome(); // expected | unexpected | flaky | skipped
    const stepKey = `${keyOf(test)}@${result.retry}`;
    emit({
      type: 'testEnd',
      key: keyOf(test),
      status: result.status,
      outcome,
      retry: result.retry,
      final: result.retry >= test.retries || result.status === 'passed' || result.status === 'skipped',
      duration: result.duration,
      errors: result.errors.map((e) => stripAnsi(e.message || e.value || '')).slice(0, 3),
      attachments: result.attachments
        .filter((a) => a.path)
        .map((a) => ({ name: a.name, contentType: a.contentType, path: a.path })),
      // Step-by-step replay (feature 6) — only for tests that did not simply pass,
      // so the payload stays small. Prefer the named test.step()s when present.
      steps: result.status === 'passed' ? undefined : pickSteps(this.steps.get(stepKey)),
    });
    this.steps.delete(stepKey);
  }

  onEnd(result) {
    emit({ type: 'end', status: result.status, duration: result.duration });
  }

  printsToStdio() {
    return false;
  }
}

/** Keep the human-written steps if any; otherwise the raw actions. Cap the list. */
function pickSteps(all) {
  if (!all || !all.length) return undefined;
  const named = all.filter((s) => s.category === 'test.step');
  const use = named.length ? named : all;
  return use.slice(-60);
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(new RegExp(String.fromCharCode(27) + "\[[0-9;]*m", "g"), "");
}

module.exports = LiveReporter;
