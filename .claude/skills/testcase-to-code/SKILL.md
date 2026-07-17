---
name: testcase-to-code
description: Generate runnable Playwright test code (Page Object + spec files) from a screen test-case .md produced by screen-test-generator (e.g. docs/test-cases/overview.md). Use when the user asks to "gen/generate code from the test cases", "implement/triển khai the .md test cases", "turn overview.md into Playwright specs", or scaffold tests for a screen from its test-case document.
---

# Test Case → Code

Turn a test-case document (`docs/test-cases/<screen>.md`, produced by the
[`screen-test-generator`](../screen-test-generator/SKILL.md) skill) into **runnable Playwright code**
that follows this repo's conventions:

- a **Page Object** under `src/pages/<screen>/…` (extends `BasePage`, uses the `Sidebar` component and `Urls` constants), created or extended as needed;
- one **spec file per test-case area** under `tests/e2e/<screen>/<area>.e2e.spec.ts`, importing `{ test, expect }` from `@fixtures/index` and `Tag` from `@/types/testTags`;
- every case mapped **1:1** to a `test(...)` (real assertions) or a `test.fixme(...)` scaffold (for cases needing setup the harness can't reproduce — throttling, roles, clipboard reads, backend seeding), with the `TC-<ABBR>-NNN` id in the title for traceability;
- a **self-verify** pass that runs `tsc --noEmit` + `playwright --list` and fixes compile/collection errors.

## Prerequisites

- The test-case `.md` exists (run `/screen-test-generator` first if not).
- Dependencies installed (`npm install`). Generated code assumes the fixtures/aliases already in this repo.

## Workflow

### 1. Parse the .md into a structured map

On Git Bash prefix with `MSYS_NO_PATHCONV=1` so `/`-paths aren't mangled:

```bash
MSYS_NO_PATHCONV=1 node .claude/skills/testcase-to-code/parse-testcases.mjs docs/test-cases/overview.md docs/test-cases/_scan/overview.parsed.json
```

Emits JSON `{ screen, route, abbr, areas:[{ name, slug, count, ids, cases:[{ id,title,priority,type,preconditions,steps,expected }] }] }` and prints a summary (counts by area/priority/type). This is the single source of truth for generation — agents read exact cases from it, no re-parsing of prose.

### 2. Read the summary & resolve the Page Object target

From the parser summary note the `screen`, `abbr`, area list, and total. Then decide the Page Object:

- If a Page Object already covers the screen's route, **reuse and extend** it (don't duplicate). Known mapping: **Overview → `DashboardPage`** (`src/pages/dashboard/DashboardPage.ts`, fixture `dashboardPage`, `Urls.DASHBOARD`) — it _is_ the Overview page.
- Otherwise create a new Page Object + register a fixture in `src/fixtures/pages.fixture.ts`.

### 3. Generate code (fan-out workflow)

```
Workflow({
  scriptPath: ".claude/skills/testcase-to-code/generate-code.workflow.js",
  args: {
    parsedPath: "docs/test-cases/_scan/overview.parsed.json",
    mdPath: "docs/test-cases/overview.md",
    screen: "Overview",
    route: "/pos/<id>/overview",
    abbr: "OVW",
    specDir: "tests/e2e/overview",
    pageObject: { path: "src/pages/dashboard/DashboardPage.ts", className: "DashboardPage", fixtureName: "dashboardPage", exists: true },
    areas: [ { name: "Page Load & Layout", slug: "page-load-layout", count: 16 }, /* …from the parser… */ ],
    onlyAreas: ["Page Load & Layout"]   // OPTIONAL — limit scope; omit to generate every area
  }
})
```

Phases: **Page Object** (create/extend + fixture) → **Specs** (one agent per area, in parallel; areas that share a slug are merged into one file) → **Verify** (typecheck + `--list`, self-heals errors). Returns `{ screen, pageObject, specDir, files:[…], totals:{total,executable,scaffolded}, verify }`.

> Pass `onlyAreas` for a quick demo or to generate incrementally (a few areas per run) — this keeps each run small and lets you review before expanding. Re-running is idempotent per area (each area owns one file). For very large docs, run in batches of areas.

### 4. Review & report

Read the workflow result and the `verify` block. Report: files written, executable vs `fixme` counts, and any unresolved compile errors. Then the suite can be run with the repo's scripts:

```bash
npx playwright test tests/e2e/overview --list      # collect
npm run test:e2e -- tests/e2e/overview             # run (needs a valid session)
npx playwright test --grep @smoke                  # by tag
```

## Non-workflow fallback (small docs / single area)

For one small area, skip the workflow: read the area's cases from the parsed JSON, extend the Page Object, and write the single spec file by hand using the same conventions (imports from `@fixtures/index`, `Tag` map, `TC-<ABBR>-NNN — …` titles, executable-vs-`fixme` rule). Then run `npx tsc --noEmit` and `npx playwright test <file> --list`.

## Conventions the generated code must follow

- `import { test, expect } from '@fixtures/index';` and `import { Tag } from '@/types/testTags';` — never raw `@playwright/test` in specs.
- Fixtures: `dashboardPage` is the Overview page; `page`, `ordersPage`, `customersPage`, `toast`, `confirmModal`, etc. are available. `dashboardPage.sidebar` has `.item()`, `.navigateTo()`, `.navigateToHref(pattern)`.
- Assert store-scoped URLs with regex (`/\/pos\/\d+\/overview/`), never a hardcoded store id.
- Assert **format & behavior**, not fixed live numbers (data is store-scoped and time-based): currency `/\$[\d,]+\.\d{2}/`, percent `/[+-]?\d+%/`.
- Tags per test: always `Tag.REGRESSION`; `Tag.UI` for UI/Data/Navigation/Accessibility; `Tag.SMOKE` for High-priority load/nav happy paths; `Tag.SLOW` for Performance/Responsive — applied via the `{ tag: [...] }` options object.
- Prefer role/label/text locators over CSS; extend the Page Object rather than inlining brittle selectors.

## Notes

- Keep `docs/test-cases/_scan/*.parsed.json` out of the human-facing docs (it's an input); it may be gitignored.
- `test.fixme` scaffolds are intentional: they preserve 1:1 coverage of every case while keeping the suite green until the required setup (network conditions, roles, seeded data) is wired up. Grep `TODO(` in the generated specs to find them.
