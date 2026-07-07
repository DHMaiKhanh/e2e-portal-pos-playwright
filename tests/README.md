# Tests

| Folder        | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `e2e/`        | End-to-end user journeys through the UI, grouped by feature subfolder.   |
| `api/`        | API-level tests (runs under the `api` project — no browser).            |
| `smoke/`      | Fast, critical-path checks. Tag with `@smoke`.                          |
| `regression/` | Broad coverage suite. Tag with `@regression`.                           |
| `visual/`     | Screenshot/visual-diff tests; snapshots live in `visual/__snapshots__`. |

## Conventions

- One feature per subfolder; file name describes the flow (`login.e2e.spec.ts`).
- Import the merged fixtures: `import { test, expect } from '@fixtures/index';`.
- Drive the UI through Page Objects (`src/pages`), never raw selectors in specs.
- Tag suites with values from `@/types/testTags` so `--grep @smoke` etc. work.
- `global.setup.ts` logs in once and saves the session; UI specs start signed in.
  Login/auth specs opt out via `test.use({ storageState: { cookies: [], origins: [] } })`.
