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

class LiveReporter {
  onBegin(_config, suite) {
    emit({ type: 'begin', total: suite.allTests().filter((t) => !isSetup(t)).length });
  }

  onTestBegin(test, result) {
    if (isSetup(test)) return;
    emit({ type: 'testBegin', key: keyOf(test), retry: result.retry });
  }

  onTestEnd(test, result) {
    if (isSetup(test)) return;
    const outcome = test.outcome(); // expected | unexpected | flaky | skipped
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
    });
  }

  onEnd(result) {
    emit({ type: 'end', status: result.status, duration: result.duration });
  }

  printsToStdio() {
    return false;
  }
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u001b\[[0-9;]*m/g, '');
}

module.exports = LiveReporter;
