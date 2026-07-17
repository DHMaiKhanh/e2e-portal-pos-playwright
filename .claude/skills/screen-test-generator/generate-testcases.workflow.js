/**
 * Generalized test-case generation workflow for any Portal POS screen.
 *
 * Invoke via the Workflow tool:
 *   Workflow({
 *     scriptPath: ".claude/skills/screen-test-generator/generate-testcases.workflow.js",
 *     args: { screen: "Orders", route: "/pos/<id>/orders", inventory: "<scanned inventory text>" }
 *   })
 *
 * Fans out one agent per generic test dimension, runs a completeness critic,
 * fills the gaps, and returns structured test cases for the caller to render
 * into docs/test-cases/<screen>.md.
 */
export const meta = {
  name: 'screen-testcases',
  description:
    'Generate exhaustive test cases for a Portal POS screen from a scanned feature inventory',
  phases: [
    { title: 'Generate', detail: 'one agent per test dimension' },
    { title: 'Critique', detail: 'completeness critic finds gaps' },
    { title: 'Gap-fill', detail: 'one agent per gap' },
  ],
};

const SCREEN = args?.screen ?? 'this screen';
const ROUTE = args?.route ?? '';
const INVENTORY = args?.inventory ?? '';

const TC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['dimension', 'testCases'],
  properties: {
    dimension: { type: 'string' },
    testCases: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'priority', 'type', 'preconditions', 'steps', 'expected'],
        properties: {
          title: { type: 'string' },
          priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          type: {
            type: 'string',
            enum: [
              'Functional',
              'UI',
              'Navigation',
              'Data',
              'Negative',
              'Edge',
              'Accessibility',
              'Performance',
              'Security',
              'Responsive',
            ],
          },
          preconditions: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          expected: { type: 'string' },
        },
      },
    },
  },
};

const DIMENSIONS = [
  {
    key: 'page-load-layout',
    focus:
      'Initial load, correct route, all sections/regions render, loading & skeleton states, layout integrity.',
  },
  {
    key: 'primary-navigation',
    focus:
      'Sidebar & in-page navigation: every link routes to the correct URL, active-state highlight, tabs, breadcrumbs, back/forward, collapse toggles.',
  },
  {
    key: 'core-actions',
    focus:
      'Every primary button / CTA / action on the screen: happy path, disabled states, confirmation dialogs, success & error feedback.',
  },
  {
    key: 'forms-inputs',
    focus:
      'Any inputs, selects, toggles, date pickers: required/validation, formats, min/max, error messages, submit/cancel. (Few cases if the screen has no forms.)',
  },
  {
    key: 'tables-lists',
    focus:
      'Any tables/lists/cards: columns, row content, sorting, pagination/infinite scroll, row actions, selection, and the empty state.',
  },
  {
    key: 'search-filter',
    focus:
      'Any search box / filters / segment controls: filtering results, clearing, no-results state, combined filters, persistence. (Few cases if none exist.)',
  },
  {
    key: 'data-display-formatting',
    focus:
      'Correctness & formatting of displayed data: currency, numbers, percentages (incl. negative/zero), dates, timezones, badges/statuses, truncation.',
  },
  {
    key: 'detail-modals-drawers',
    focus:
      'Any detail views, modals, drawers, tooltips, popovers: open/close, content accuracy, focus trap, dismiss (Esc/backdrop). (Few cases if none exist.)',
  },
  {
    key: 'negative-edge-cases',
    focus:
      'Empty data, zero values, very large datasets, boundary values, API/network failures per section, partial/slow load, stale/expired session mid-view.',
  },
  {
    key: 'responsive-cross-device',
    focus:
      'Desktop / laptop / tablet / mobile widths: reflow, sidebar auto-collapse, table/card adaptation, no horizontal overflow, touch interactions.',
  },
  {
    key: 'accessibility',
    focus:
      'Keyboard navigation & focus order, ARIA roles/names, tooltip & dialog access, table semantics, color contrast of badges/deltas, screen-reader announcements.',
  },
  {
    key: 'performance-loading',
    focus:
      'Load-time budget, skeletons, lazy/virtualized rendering of large lists, no layout shift, refresh/refetch of time-based data.',
  },
  {
    key: 'security-permissions',
    focus:
      'Unauthenticated redirect to /login, role-based visibility, cross-tenant/cross-store access control, sensitive-data exposure, token/secret handling.',
  },
];

phase('Generate');
const generated = (
  await parallel(
    DIMENSIONS.map(
      (d) => () =>
        agent(
          `You are a senior QA engineer writing test cases for the "${SCREEN}" screen (${ROUTE}) of the Portal POS merchant web app.\n\n` +
            `Write an EXHAUSTIVE, high-quality set of test cases focused ONLY on this dimension: "${d.key}".\n` +
            `Dimension focus: ${d.focus}\n\n` +
            `=== SCANNED INVENTORY ===\n${INVENTORY}\n=== END INVENTORY ===\n\n` +
            `Rules:\n` +
            `- Ground every case in the REAL elements/labels/routes above (use exact button labels, column names, routes).\n` +
            `- Each case: imperative title, priority (High/Medium/Low), type, preconditions, numbered steps, precise expected result.\n` +
            `- Cover happy path, alternate paths, boundary and negative variations for this dimension.\n` +
            `- Aim for 6–14 non-duplicate cases; fewer if the dimension barely applies. Don't repeat other dimensions' cases.\n` +
            `- Assume the tester is already logged in (reused session) unless the dimension is about auth.`,
          { schema: TC_SCHEMA, phase: 'Generate', label: `gen:${d.key}` },
        ),
    ),
  )
).filter(Boolean);

const flat = generated.flatMap((g) => g.testCases.map((t) => ({ ...t, dimension: g.dimension })));
log(`Generated ${flat.length} cases across ${generated.length} dimensions`);

phase('Critique');
const titleList = generated
  .map(
    (g) =>
      `## ${g.dimension}\n` +
      g.testCases.map((t) => `- [${t.type}/${t.priority}] ${t.title}`).join('\n'),
  )
  .join('\n\n');
const critique = await agent(
  `You are a meticulous QA lead reviewing test coverage for the "${SCREEN}" screen.\n\n` +
    `Inventory:\n${INVENTORY}\n\n` +
    `Test cases so far (titles), by dimension:\n${titleList}\n\n` +
    `Identify GAPS: important scenarios/interactions/states/feature areas from the inventory that are missing or under-covered. ` +
    `For each, give a short dimension key and a one-line reason. Empty list if coverage is thorough.`,
  {
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['missing'],
      properties: {
        missing: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['dimension', 'reason'],
            properties: { dimension: { type: 'string' }, reason: { type: 'string' } },
          },
        },
      },
    },
    phase: 'Critique',
    label: 'completeness-critic',
  },
);
const gaps = (critique?.missing ?? []).slice(0, 8);
log(`Critic found ${gaps.length} gaps`);

phase('Gap-fill');
const gapResults =
  gaps.length === 0
    ? []
    : (
        await parallel(
          gaps.map(
            (g) => () =>
              agent(
                `Senior QA engineer. Write concrete test cases filling this coverage GAP for the "${SCREEN}" screen.\n\n` +
                  `Gap: "${g.dimension}" — ${g.reason}\n\n` +
                  `=== SCANNED INVENTORY ===\n${INVENTORY}\n=== END INVENTORY ===\n\n` +
                  `Return 3–10 non-duplicate cases (title, priority, type, preconditions, numbered steps, expected). Ground them in real labels/routes.`,
                { schema: TC_SCHEMA, phase: 'Gap-fill', label: `gap:${g.dimension}`.slice(0, 40) },
              ),
          ),
        )
      ).filter(Boolean);

const gapFlat = gapResults.flatMap((g) =>
  g.testCases.map((t) => ({ ...t, dimension: `gap:${g.dimension}` })),
);
log(`Gap-fill added ${gapFlat.length} cases`);

return { screen: SCREEN, route: ROUTE, generated, gaps, all: [...flat, ...gapFlat] };
