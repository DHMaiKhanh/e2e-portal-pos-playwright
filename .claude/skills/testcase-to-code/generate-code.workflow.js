export const meta = {
  name: 'testcase-to-code',
  description:
    'Generate Playwright Page Object + spec files from a screen test-case .md (parsed to JSON)',
  phases: [
    { title: 'Page Object', detail: 'create/extend the screen Page Object + fixture' },
    { title: 'Specs', detail: 'one spec file per test-case area' },
    { title: 'Verify', detail: 'typecheck + playwright --list, self-heal errors' },
  ],
};

// ---- inputs (from args) ----
// The harness may deliver args as a parsed object or as a JSON string — normalize.
const input = typeof args === 'string' ? JSON.parse(args) : (args ?? {});
const {
  parsedPath, // repo-relative path to the parse-testcases.mjs output JSON
  mdPath, // repo-relative path to the source .md (for the Page Object agent to Read)
  screen, // e.g. "Overview"
  route, // e.g. "/pos/<id>/overview"
  abbr, // e.g. "OVW"
  specDir, // e.g. "tests/e2e/overview"
  pageObject, // { path, className, fixtureName, exists }
  areas: rawAreas, // [{ name, slug, count }]
  onlyAreas, // optional string[] of area names/slugs to limit scope
} = input;

if (!Array.isArray(rawAreas)) {
  throw new Error(
    `testcase-to-code: expected args.areas to be an array, got ${typeof rawAreas}. ` +
      `Received keys: ${Object.keys(input).join(', ') || '(none)'}`,
  );
}

// Merge areas that share a slug (the doc can repeat a section name) into one file.
const bySlug = new Map();
for (const a of rawAreas) {
  const m = bySlug.get(a.slug) ?? { slug: a.slug, name: a.name, sourceNames: [], count: 0 };
  m.sourceNames.push(a.name);
  m.count += a.count;
  bySlug.set(a.slug, m);
}
let mergedAreas = [...bySlug.values()];
if (onlyAreas && onlyAreas.length) {
  const want = new Set(onlyAreas);
  mergedAreas = mergedAreas.filter((a) => want.has(a.name) || want.has(a.slug));
}

log(
  `testcase-to-code: "${screen}" — ${mergedAreas.length} area file(s), ${mergedAreas.reduce((n, a) => n + a.count, 0)} cases → ${specDir}`,
);

// ---- shared convention block, embedded in every prompt ----
const CONVENTIONS = `
PROJECT CONVENTIONS (Playwright + TypeScript, Page Object Model) — follow EXACTLY:

- Import test/expect ONLY from the merged fixtures barrel:
    import { test, expect } from '@fixtures/index';
    import { Tag } from '@/types/testTags';
- Path aliases (tsconfig): @pages/* @components/* @constants/* @configs/* @fixtures/* @utils/* @/* . Never use long relative '../../..' paths.
- Route constants live in @constants/urls (Urls.DASHBOARD = the store Overview, already store-scoped via env.STORE_ID). Assert store-scoped URLs with regex like /\\/pos\\/\\d+\\/overview/ — never hardcode the numeric store id in an assertion.
- Fixtures already available on the test callback: page, dashboardPage (the Overview page object), ordersPage, productsPage, customersPage, reportsPage, settingsPage, toast, confirmModal. The Overview screen uses the '${pageObject.fixtureName}' fixture (class ${pageObject.className}).
- Page Object base: classes extend BasePage (has goto(), waitForReady(), expectUrlContains()). Components extend BaseComponent. The sidebar is exposed as dashboardPage.sidebar with .item(name), .navigateTo(name), .navigateToHref(pattern). Prefer role/label/text locators (getByRole, getByLabel, getByText) over CSS.
- Tags: use the Tag map. Rule per test:
    * always add Tag.REGRESSION
    * add Tag.UI for types UI | Data | Navigation | Accessibility
    * add Tag.SMOKE for High-priority page-load / core-navigation happy paths
    * add Tag.SLOW for Performance | Responsive types
  Apply tags with the per-test options object:
    test('TC-XXX-001 — short title', { tag: [Tag.REGRESSION, Tag.UI] }, async ({ dashboardPage, page }) => { ... });

- One test.describe per file, named for the area. Use a beforeEach that navigates once:
    test.describe('AREA NAME — ${screen}', () => {
      test.beforeEach(async ({ ${pageObject.fixtureName} }) => { await ${pageObject.fixtureName}.goto(); });
      ...tests...
    });

- Every test title MUST begin with its TC id then ' — ' then a SHORT restatement (e.g. 'TC-${abbr}-001 — lands on /pos/<id>/overview'). This keeps 1:1 traceability to the .md.

EXECUTABLE vs SCAFFOLD — decide per case:
  * EXECUTABLE (write REAL assertions that pass against the live DEV portal with the reused storageState at the default 1920x1080 desktop viewport): page load, URL/redirect assertions, section/heading presence, control visibility/enabled state, sidebar link presence + navigation by href, static text/format assertions (regex on rendered text), empty-state text, counts present, tooltip/icon presence.
  * SCAFFOLD as test.fixme(...) with the SAME id+title, a JSDoc listing the Steps and Expected verbatim, and a leading '// TODO(manual/setup): <why>' — for cases needing: network throttling/offline emulation, role/permission/tenant changes, clipboard READ verification, backend state seeding/mutation, viewport projects not configured in playwright.config, or anything the case's Expected marks 'needs live verification'. A fixme body may be empty or contain a best-effort arrange step, but must not fail.
  Do NOT invent selectors for UI the .md does not describe. When unsure a locator exists, prefer a resilient getByText/getByRole with a name regex, or scaffold.

- Assert BEHAVIOR & FORMAT, never fixed live numbers (data is store-scoped and time-based). E.g. match currency with /\\$[\\d,]+\\.\\d{2}/, percent with /[+-]?\\d+%/.
- Keep tests independent and parallel-safe: no test depends on another's side effects.
- Output must be valid TypeScript under "strict": true. No unused imports. No 'any' without reason.
`.trim();

// =====================================================================
// Phase 1 — Page Object
// =====================================================================
phase('Page Object');

const PO_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'className', 'fixtureName', 'api', 'changed'],
  properties: {
    path: { type: 'string', description: 'repo-relative path of the Page Object file written' },
    className: { type: 'string' },
    fixtureName: { type: 'string', description: 'fixture property name tests use' },
    api: {
      type: 'array',
      description: 'public locators/methods the specs may use, as short signatures',
      items: { type: 'string' },
    },
    fixtureRegistered: { type: 'boolean', description: 'true if pages.fixture.ts was edited' },
    changed: { type: 'boolean', description: 'true if any file was created/modified' },
    notes: { type: 'string' },
  },
};

const po = await agent(
  `You are generating the Page Object for the "${screen}" screen of the Portal POS Playwright suite.

${CONVENTIONS}

TASK:
1. Read the test-case doc at ${mdPath} to learn every section, control, and label this screen exposes (focus on the "Feature inventory" / area headers and the controls referenced in cases).
2. The Page Object for this screen ${pageObject.exists ? `ALREADY EXISTS at ${pageObject.path} (class ${pageObject.className}, fixture '${pageObject.fixtureName}'). Read it, then EXTEND it: ADD readonly Locator members and small helper methods for the sections/controls the specs will need (e.g. section headings, metric tiles by label, merchant-info fields, device cards + "Open POS #N details", batch-history table + empty state, "Generate Token", "Copy encryption key", "View All" links, store switcher). Do NOT remove or rename existing members and do NOT duplicate what already exists. Do NOT edit pages.fixture.ts (the fixture is already registered).` : `does NOT exist. CREATE it at ${pageObject.path} extending BasePage with path = the appropriate Urls constant, a waitForReady() keyed on a stable element, and Locator members/methods for the screen's sections and controls. THEN register it in src/fixtures/pages.fixture.ts (add to the PagesFixture interface and the extend block) as '${pageObject.fixtureName}'.`}
3. Locators must be resilient: prefer getByRole/getByText/getByLabel with name regexes grounded in the exact labels from the doc. Add a JSDoc note where a label is dynamic.

Return the Page Object's final public API so the spec generators can call it. Only write the Page Object (and, if creating, the fixture) — do not write any spec files.`,
  { label: `page-object:${screen}`, phase: 'Page Object', schema: PO_SCHEMA },
);

const poApi = (po?.api ?? []).join('\n  - ');
log(
  `Page Object ready: ${po?.className ?? pageObject.className} (${po?.api?.length ?? 0} members)`,
);

// =====================================================================
// Phase 2 — Specs (one file per area, in parallel)
// =====================================================================
phase('Specs');

const SPEC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'total', 'executable', 'scaffolded'],
  properties: {
    file: { type: 'string', description: 'repo-relative path of the spec written' },
    total: { type: 'integer' },
    executable: { type: 'integer', description: 'count of real (non-fixme) tests' },
    scaffolded: { type: 'integer', description: 'count of test.fixme scaffolds' },
    notes: { type: 'string' },
  },
};

const specs = await parallel(
  mergedAreas.map((a) => () => {
    const file = `${specDir}/${a.slug}.e2e.spec.ts`;
    const extract = `node -e "const d=require('./${parsedPath.replace(/\\/g, '/')}');const names=${JSON.stringify(JSON.stringify(a.sourceNames))};const set=new Set(JSON.parse(names));const cs=d.areas.filter(x=>set.has(x.name)).flatMap(x=>x.cases);process.stdout.write(JSON.stringify(cs))"`;
    return agent(
      `You are generating ONE Playwright spec file for the "${a.name}" area of the "${screen}" screen.

${CONVENTIONS}

The Page Object "${po?.className ?? pageObject.className}" (fixture '${po?.fixtureName ?? pageObject.fixtureName}') exposes these members you should use where relevant:
  - ${poApi || '(read the Page Object file at ' + (po?.path ?? pageObject.path) + ')'}

STEP 1 — Get this area's exact test cases (id, title, priority, type, preconditions, steps, expected) by running this command from the repo root and reading its JSON stdout:
${extract}

STEP 2 — Write the spec file to: ${file}
  - Convert EVERY case in the extracted JSON to a test() (executable) or test.fixme() (scaffold) per the EXECUTABLE-vs-SCAFFOLD rule above. Never drop a case — the file's test count must equal the number of extracted cases.
  - Wrap them in a single test.describe('${a.name} — ${screen}', ...) with the beforeEach navigation shown in the conventions.
  - Each test title starts with the case id (e.g. 'TC-${abbr}-001 — ...').
  - For scaffolds, put the case's Steps and Expected in a JSDoc above the test.fixme and a '// TODO(...)' reason.
  - Ground assertions in the case's Expected text (URL regexes, visible text/format regexes, control visibility). Reuse Page Object members instead of re-declaring locators when one fits.

STEP 3 — Return the counts. Write ONLY this one spec file.`,
      { label: `spec:${a.slug}`, phase: 'Specs', schema: SPEC_SCHEMA },
    );
  }),
);

const written = specs.filter(Boolean);
const totals = written.reduce(
  (t, s) => ({
    total: t.total + (s.total || 0),
    executable: t.executable + (s.executable || 0),
    scaffolded: t.scaffolded + (s.scaffolded || 0),
  }),
  { total: 0, executable: 0, scaffolded: 0 },
);
log(
  `Specs written: ${written.length} files · ${totals.total} tests (${totals.executable} exec, ${totals.scaffolded} fixme)`,
);

// =====================================================================
// Phase 3 — Verify (typecheck + collection), self-heal
// =====================================================================
phase('Verify');

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['typecheckOk', 'listOk'],
  properties: {
    typecheckOk: { type: 'boolean' },
    listOk: { type: 'boolean' },
    listedTests: { type: 'integer' },
    fixedFiles: { type: 'array', items: { type: 'string' } },
    remainingErrors: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
};

const fileList = written.map((s) => s.file).join('\n  - ');
const verify = await agent(
  `You are verifying the generated Playwright code for the "${screen}" screen compiles and is collectable.

Generated Page Object: ${po?.path ?? pageObject.path}
Generated spec files:
  - ${fileList}

DO THIS:
1. Run \`npx tsc --noEmit\` (project typecheck).
2. Run \`npx playwright test ${specDir} --list\` to confirm Playwright can collect the tests without runtime/import errors. (This only lists; it does not execute tests or need the app server.)
3. If either fails, FIX the generated files (Page Object + specs listed above only — do not touch unrelated files). Common issues: wrong import path/alias, unused import under strict, a locator member that doesn't exist on the Page Object, a bad regex escape, or a Tag key that isn't in the Tag map. Re-run until both pass or you hit clearly-external errors.
4. Do NOT weaken assertions just to pass; if a real assertion can't compile, convert that single case to test.fixme with a TODO rather than deleting it.

Return whether typecheck and --list pass, how many tests were listed, which files you edited, and any errors you could not resolve (with a one-line reason each).`,
  { label: 'verify', phase: 'Verify', schema: VERIFY_SCHEMA, effort: 'high' },
);

return {
  screen,
  route,
  pageObject: {
    path: po?.path ?? pageObject.path,
    className: po?.className ?? pageObject.className,
    fixtureName: po?.fixtureName ?? pageObject.fixtureName,
  },
  specDir,
  files: written,
  totals,
  verify,
};
