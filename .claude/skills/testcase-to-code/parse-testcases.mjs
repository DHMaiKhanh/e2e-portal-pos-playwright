#!/usr/bin/env node
/**
 * parse-testcases.mjs — parse a screen-test-generator test-case `.md` into JSON.
 *
 * Usage:
 *   node parse-testcases.mjs <input.md> [output.json]
 *
 * Reads a doc produced by the `screen-test-generator` skill (H1 + metadata
 * table + `## <Area>` sections + `### TC-<ABBR>-NNN — <title>` cases with
 * Priority/Type/Preconditions/Steps/Expected) and emits a structured map:
 *
 *   {
 *     screen, route, abbr, generated, total, sourceScan,
 *     areaCount, caseCount,
 *     areas: [{ name, slug, count, ids:[...], cases:[{
 *       id, title, area, priority, type, preconditions, steps:[...], expected
 *     }]}]
 *   }
 *
 * The JSON is written to [output.json] (default: <input>.parsed.json) and a
 * human summary is printed to stderr; the output path is echoed to stdout.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [, , inPath, outPathArg] = process.argv;
if (!inPath) {
  console.error('Usage: node parse-testcases.mjs <input.md> [output.json]');
  process.exit(1);
}

const md = readFileSync(inPath, 'utf8');
const lines = md.split(/\r?\n/);

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

// ---- metadata table (| **Key** | Value |) ----
const meta = {};
for (const l of lines) {
  const m = l.match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*$/);
  if (!m) continue;
  const key = m[1].trim().toLowerCase();
  const val = m[2].trim().replace(/`/g, '');
  if (key === 'screen') meta.screen = val;
  else if (key === 'route') meta.route = val;
  else if (key.startsWith('total')) meta.total = Number.parseInt(val, 10) || val;
  else if (key === 'generated') meta.generated = val;
  else if (key.startsWith('source')) meta.sourceScan = val;
}
if (!meta.screen) {
  const h1 = lines.find((l) => /^#\s+/.test(l));
  if (h1)
    meta.screen = h1
      .replace(/^#\s+/, '')
      .replace(/^Test Cases\s*[—-]\s*/i, '')
      .replace(/\s*Screen\s*$/i, '')
      .trim();
}

// ---- areas + cases (state machine) ----
const EXCLUDE = new Set(['coverage summary']);
const areas = [];
let area = null;
let tc = null;
let field = null; // 'pre' | 'steps' | 'expected'

const finishCase = () => {
  if (!tc || !area) {
    tc = null;
    return;
  }
  tc.preconditions = tc.preconditions.trim();
  tc.expected = tc.expected.trim();
  tc.steps = tc.steps.map((s) => s.trim()).filter(Boolean);
  area.cases.push(tc);
  tc = null;
  field = null;
};

for (const line of lines) {
  // area header — exactly two leading '#'
  const areaM = line.match(/^##(?!#)\s+(.+?)\s*$/);
  if (areaM) {
    finishCase();
    const name = areaM[1].trim();
    if (EXCLUDE.has(name.toLowerCase())) {
      area = null;
      continue;
    }
    area = { name, slug: slugify(name), cases: [] };
    areas.push(area);
    continue;
  }

  // case header — ### TC-ABBR-001 — title  (em dash or hyphen separator)
  const caseM = line.match(/^###\s+(TC-[A-Z0-9]+-\d+)\s*[—-]\s*(.+?)\s*$/);
  if (caseM) {
    finishCase();
    if (!area) {
      area = { name: 'Uncategorized', slug: 'uncategorized', cases: [] };
      areas.push(area);
    }
    tc = {
      id: caseM[1],
      title: caseM[2].trim(),
      area: area.name,
      priority: '',
      type: '',
      preconditions: '',
      steps: [],
      expected: '',
    };
    field = null;
    continue;
  }

  if (!tc) continue;

  // **Priority:** X | **Type:** Y  (also: **Ưu tiên:** X | **Loại:** Y)
  const ptM = line.match(/\*\*(?:Priority|Ưu tiên):\*\*\s*([A-Za-zÀ-ỹ]+)\s*\|\s*\*\*(?:Type|Loại):\*\*\s*([A-Za-zÀ-ỹ/ ]+?)\s*$/);
  if (ptM) {
    const priorityMap = { high: 'High', medium: 'Medium', low: 'Low', cao: 'High', 'trung bình': 'Medium', thấp: 'Low' };
    const rawPriority = ptM[1].trim();
    tc.priority = priorityMap[rawPriority.toLowerCase()] ?? rawPriority;
    tc.type = ptM[2].trim();
    field = null;
    continue;
  }

  // **Preconditions:** ... (also: **Điều kiện tiên quyết:**)
  const preM = line.match(/^\s*\*\*(?:Preconditions|Điều kiện tiên quyết):\*\*\s*(.*)$/);
  if (preM) {
    tc.preconditions = preM[1];
    field = 'pre';
    continue;
  }

  // **Steps:** marker (also: **Các bước:**)
  if (/^\s*\*\*(?:Steps|Các bước):\*\*\s*$/.test(line)) {
    field = 'steps';
    continue;
  }

  // **Expected:** ... (also: **Kết quả mong đợi:**)
  const expM = line.match(/^\s*\*\*(?:Expected|Kết quả mong đợi):\*\*\s*(.*)$/);
  if (expM) {
    tc.expected = expM[1];
    field = 'expected';
    continue;
  }

  // section separator ends the current field accumulation
  if (/^\s*---\s*$/.test(line)) {
    field = null;
    continue;
  }

  const trimmed = line.trim();

  if (field === 'steps') {
    const stepM = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (stepM) {
      tc.steps.push(stepM[1]);
      continue;
    }
    // wrapped continuation of the previous step
    if (trimmed && tc.steps.length) tc.steps[tc.steps.length - 1] += ' ' + trimmed;
    continue;
  }
  if (field === 'pre') {
    if (trimmed) tc.preconditions += (tc.preconditions ? ' ' : '') + trimmed;
    continue;
  }
  if (field === 'expected') {
    if (trimmed) tc.expected += (tc.expected ? ' ' : '') + trimmed;
    continue;
  }
}
finishCase();

const allCases = areas.flatMap((a) => a.cases);
const abbr = allCases[0]?.id.match(/^TC-([A-Z0-9]+)-/)?.[1] ?? 'XXX';

const result = {
  screen: meta.screen ?? 'Screen',
  route: meta.route ?? '',
  abbr,
  generated: meta.generated ?? '',
  total: meta.total ?? allCases.length,
  sourceScan: meta.sourceScan ?? '',
  areaCount: areas.length,
  caseCount: allCases.length,
  areas: areas.map((a) => ({
    name: a.name,
    slug: a.slug,
    count: a.cases.length,
    ids: a.cases.map((c) => c.id),
    cases: a.cases,
  })),
};

const outPath = outPathArg ?? inPath.replace(/\.md$/i, '') + '.parsed.json';
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

// ---- summary → stderr ----
const byPriority = {};
const byType = {};
for (const c of allCases) {
  byPriority[c.priority || '?'] = (byPriority[c.priority || '?'] || 0) + 1;
  byType[c.type || '?'] = (byType[c.type || '?'] || 0) + 1;
}
const fmt = (o) =>
  Object.entries(o)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ');
console.error(`Parsed ${allCases.length} cases across ${areas.length} areas → ${outPath}`);
console.error(`  screen=${result.screen}  route=${result.route}  abbr=${result.abbr}`);
console.error(`  priority: ${fmt(byPriority)}`);
console.error(`  type:     ${fmt(byType)}`);
for (const a of areas) console.error(`  - ${a.name} (${a.cases.length})`);

// echo output path to stdout for scripting
console.log(outPath);
