import type { Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Diagnostic-only reporter: attributes wall time to individual steps so we can
 * answer "where does the suite actually spend its time" instead of guessing
 * from per-test totals. Not part of the normal reporter set — enable it for a
 * profiling run via `--reporter=...,./tools/reporters/step-timing-reporter.ts`
 * and point STEP_TIMING_OUT at the file to write.
 *
 * Emits one JSON blob: per-test rows (hook vs body split) plus every step at or
 * above STEP_TIMING_MIN_MS, tagged with the step that failed when the test did.
 */

interface StepRow {
  test: string;
  file: string;
  category: string;
  title: string;
  ms: number;
  failed: boolean;
  /** Depth 0 = a direct child of the test/hook root. */
  depth: number;
}

interface TestRow {
  title: string;
  file: string;
  line: number;
  status: string;
  ms: number;
  hookMs: number;
  /** Title of the deepest step that carried the error, when the test failed. */
  failedAt: string | null;
  failedAtLoc: string | null;
  errorFirstLine: string | null;
}

const MIN_MS = Number(process.env.STEP_TIMING_MIN_MS ?? 100);
const OUT = process.env.STEP_TIMING_OUT ?? path.join(process.cwd(), 'step-timings.json');

export default class StepTimingReporter implements Reporter {
  private steps: StepRow[] = [];
  private tests: TestRow[] = [];
  private startedAt = 0;

  onBegin(): void {
    this.startedAt = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    let hookMs = 0;
    let failedAt: TestStep | null = null;

    const visit = (step: TestStep, depth: number): void => {
      if (depth === 0 && step.category === 'hook') hookMs += step.duration;

      if (step.duration >= MIN_MS && step.category !== 'pw:api:internal') {
        this.steps.push({
          test: test.title,
          file: relative(test.location.file),
          category: step.category,
          title: normalise(step.title),
          ms: step.duration,
          failed: !!step.error,
          depth,
        });
      }

      // Deepest erroring step wins: that is the line that actually blocked.
      if (step.error) failedAt = step;
      for (const child of step.steps) visit(child, depth + 1);
    };

    for (const step of result.steps) visit(step, 0);

    // Every assignment to `failedAt` happens inside the `visit` closure, so TS
    // narrows it to `null` here. The cast restores the type it actually holds.
    const err = failedAt as TestStep | null;

    this.tests.push({
      title: test.title,
      file: relative(test.location.file),
      line: test.location.line,
      status: result.status,
      ms: result.duration,
      hookMs,
      failedAt: err ? normalise(err.title) : null,
      failedAtLoc: err?.location ? `${relative(err.location.file)}:${err.location.line}` : null,
      errorFirstLine: result.error?.message
        ? stripAnsi(result.error.message).split('\n')[0].slice(0, 160)
        : null,
    });
  }

  onEnd(): void {
    const payload = {
      wallMs: Date.now() - this.startedAt,
      workers: process.env.WORKERS ?? '(config default)',
      minStepMs: MIN_MS,
      tests: this.tests,
      steps: this.steps,
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(payload), 'utf8');
    // eslint-disable-next-line no-console
    console.log(
      `\n[step-timing] ${this.tests.length} tests, ${this.steps.length} steps >= ${MIN_MS}ms -> ${OUT}`,
    );
  }
}

/** Collapse the variable bits so steps aggregate into meaningful buckets. */
function normalise(title: string): string {
  return title
    .replace(/https?:\/\/[^\s)]+/g, '<url>')
    .replace(/\b\d{3,}\b/g, '<n>')
    .slice(0, 120);
}

function relative(file: string): string {
  return path.relative(process.cwd(), file).replace(/\\/g, '/');
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\[[0-9;]*m/g, '');
}
