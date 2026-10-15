#!/usr/bin/env node
/**
 * parse-testcases.mjs — parse a screen-test-generator test-case `.md` into JSON.
 *
 * Usage:
 *   node parse-testcases.mjs <input.md> [output.json]
 *
 * Handles the two doc shapes the generator has emitted:
 *
 *   "heading" format (older — docs/test-cases/overview.md)
 *     ## <Area>
 *     ### TC-<ABBR>-NNN — <title>
 *     **Priority:** High | **Type:** UI
 *     **Preconditions:** …   **Steps:** …   **Expected:** …
 *
 *   "bullet" format (current Vietnamese docs — staffs / services / settings / merchants)
 *     ### A. <Area> (English gloss)
 *     **TC-<ABBR>-NNN · <title>** — Mức độ ưu tiên: Cao · Loại: Điều hướng
 *     - Điều kiện tiên quyết: …
 *     - Các bước: 1) … 2) …          (or a nested "1." list on the following lines)
 *     - Kết quả mong đợi: …
 *
 * Emits a structured map:
 *
 *   {
 *     screen, route, abbr, generated, total, sourceScan, format,
 *     areaCount, caseCount,
 *     areas: [{ name, slug, letter, index, specFile, count, ids, cases:[{
 *       id, title, area, priority, type, typeEn, preconditions, steps:[...],
 *       expected, needsVerification
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
    // Fold Latin diacritics first: a Vietnamese area header with no English
    // gloss would otherwise shred into `t-i-trang-b-c-c`.
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const PRIORITY_MAP = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  cao: 'High',
  'trung bình': 'Medium',
  thấp: 'Low',
};
const normalizePriority = (raw) => PRIORITY_MAP[raw.trim().toLowerCase()] ?? raw.trim();

/**
 * Vietnamese case "Loại" → the English bucket the tagging convention keys off
 * (UI / Data / Navigation / Accessibility → @ui; Performance / Responsive → @slow).
 */
const TYPE_MAP = {
  'điều hướng': 'Navigation',
  'giao diện': 'UI',
  'chức năng': 'Functional',
  'dữ liệu': 'Data',
  biên: 'Edge',
  'hiệu năng': 'Performance',
  'bảo mật': 'Security',
  'tiêu cực': 'Negative',
  responsive: 'Responsive',
  'khả năng tiếp cận': 'Accessibility',
  'tích hợp': 'Integration',
};
const normalizeType = (raw) => TYPE_MAP[raw.trim().toLowerCase()] ?? raw.trim();

// ---- metadata: table rows (| **Key** | Value |) and bullets (- **Key**: Value) ----
const meta = {};
const assignMeta = (rawKey, rawVal) => {
  const key = rawKey.trim().toLowerCase();
  const val = rawVal.trim().replace(/`/g, '').replace(/\*\*/g, '');
  if (key === 'screen' || key === 'màn hình')
    // `Income Reports (Báo cáo doanh thu)` → `Income Reports`
    meta.screen ??= val.replace(/\s*\([^()]*\)\s*$/, '').trim();
  // The route bullet often trails a gloss (`(vd: /pos/14/income) — …`) — keep the path.
  else if (key.startsWith('route')) meta.route ??= val.split(/\s+/)[0];
  else if (key.startsWith('total') || key.startsWith('tổng'))
    meta.total ??= Number.parseInt(val, 10) || val;
  else if (key === 'generated' || key.startsWith('ngày')) meta.generated ??= val;
  else if (key.startsWith('source') || key.startsWith('nguồn')) meta.sourceScan ??= val;
};
for (const l of lines) {
  const table = l.match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*$/);
  if (table) {
    assignMeta(table[1], table[2]);
    continue;
  }
  // Either `- **Key**: value` or `- **Key:** value` (colon inside the bold).
  const bullet = l.match(/^-\s*\*\*(.+?)\s*:?\s*\*\*\s*:?\s*(.+?)\s*$/);
  if (bullet) assignMeta(bullet[1], bullet[2]);
}
if (!meta.screen) {
  const h1 = lines.find((l) => /^#\s+/.test(l));
  if (h1)
    meta.screen = h1
      .replace(/^#\s+/, '')
      .replace(/^Test Cases?\s*[:—-]\s*/i, '')
      .replace(/\s*Screen\s*$/i, '')
      .trim();
}

const EXCLUDE = new Set(['coverage summary']);

/** Older format: `## Area` + `### TC-ID — title` + `**Field:**` blocks. */
function parseHeadingFormat(lines) {
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
    const ptM = line.match(
      /\*\*(?:Priority|Ưu tiên):\*\*\s*([A-Za-zÀ-ỹ]+)\s*\|\s*\*\*(?:Type|Loại):\*\*\s*([A-Za-zÀ-ỹ/ ]+?)\s*$/,
    );
    if (ptM) {
      tc.priority = normalizePriority(ptM[1]);
      tc.type = ptM[2].trim();
      tc.typeEn = normalizeType(ptM[2]);
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
  return areas;
}

/**
 * Split an inline step string ("1) do X. 2) do Y.") into individual steps.
 * A whole step list written as one bullet is the norm in the Vietnamese docs;
 * some cases carry no numbering at all, in which case the sentence is step 1.
 */
function splitInlineSteps(text) {
  const body = text.trim();
  if (!body) return [];

  // Walk the expected step indices in order. A number that is not the next
  // index is prose, not a marker — "1) Đếm số dòng ở trang 1. 2) So sánh…" has
  // three number-like tokens but only two steps.
  const marks = [];
  let expected = 1;
  const re = /(\d+)[.)]\s+/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (Number(m[1]) !== expected) continue;
    marks.push({ start: m.index, contentStart: m.index + m[0].length });
    expected += 1;
  }
  if (marks.length === 0) return [body];

  const steps = [];
  const preamble = body.slice(0, marks[0].start).trim();
  if (preamble) steps.push(preamble);
  marks.forEach((mark, i) => {
    steps.push(body.slice(mark.contentStart, marks[i + 1]?.start ?? body.length).trim());
  });
  return steps.filter(Boolean);
}

/** Current format: `### A. Area` + `**TC-ID · title** — …` + `- Field: …` bullets. */
function parseBulletFormat(lines) {
  const areas = [];
  let area = null;
  let tc = null;
  let field = null; // 'pre' | 'steps' | 'expected'

  const finishCase = () => {
    if (!tc || !area) {
      tc = null;
      field = null;
      return;
    }
    tc.preconditions = tc.preconditions.trim();
    tc.expected = tc.expected.trim();
    tc.steps = tc.steps.map((s) => s.trim()).filter(Boolean);
    // Cases the doc itself flags as unconfirmed — the generator turns these into
    // assertions only after the screen has been re-scanned.
    tc.needsVerification = /CẦN XÁC MINH/i.test(
      [tc.title, tc.preconditions, tc.expected, ...tc.steps].join(' '),
    );
    area.cases.push(tc);
    tc = null;
    field = null;
  };

  for (const line of lines) {
    // `## 1. …` top-level sections close any open case but are not areas here.
    if (/^##(?!#)\s+/.test(line)) {
      finishCase();
      area = null;
      continue;
    }

    // area header — `### A. Tải trang & bố cục (Page load / Layout)`
    if (/^###\s+/.test(line) && !/^###\s+TC-/.test(line)) {
      finishCase();
      const areaM = line.match(/^###\s+(?:([A-Z])\.\s*)?(.+?)\s*$/);
      const name = areaM[2].trim();
      if (EXCLUDE.has(name.toLowerCase())) {
        area = null;
        continue;
      }
      // Prefer the English gloss in trailing parentheses for the slug so file
      // names stay ASCII (`(Page load / Layout)` → `page-load-layout`).
      const gloss = name.match(/\(([^()]+)\)\s*$/);
      const slugSource = gloss && /[a-z]/i.test(gloss[1]) ? gloss[1] : name;
      area = {
        name,
        slug: slugify(slugSource) || slugify(name) || 'area',
        letter: areaM[1] ?? '',
        cases: [],
      };
      areas.push(area);
      continue;
    }

    // case header — `**TC-MCH-001 · title** — Mức độ ưu tiên: Cao · Loại: Điều hướng`
    const caseM = line.match(/^\*\*(TC-[A-Z0-9]+-\d+)\s*[·:—-]\s*(.+?)\*\*\s*(.*)$/);
    if (caseM) {
      finishCase();
      if (!area) {
        area = { name: 'Uncategorized', slug: 'uncategorized', letter: '', cases: [] };
        areas.push(area);
      }
      tc = {
        id: caseM[1],
        title: caseM[2].trim(),
        area: area.name,
        priority: '',
        type: '',
        typeEn: '',
        preconditions: '',
        steps: [],
        expected: '',
        needsVerification: false,
      };
      const tail = caseM[3] ?? '';
      const pM = tail.match(/(?:Mức độ ưu tiên|Ưu tiên|Priority)\s*:\s*([^·|]+)/i);
      if (pM) tc.priority = normalizePriority(pM[1]);
      const tM = tail.match(/(?:Loại|Type)\s*:\s*([^·|]+)/i);
      if (tM) {
        tc.type = tM[1].trim();
        tc.typeEn = normalizeType(tM[1]);
      }
      continue;
    }

    if (!tc) continue;

    const trimmed = line.trim();

    // `- Mức ưu tiên: Cao · Loại: Điều hướng` — priority/type as a bullet of
    // their own, rather than in the case-header tail.
    const ptBullet = trimmed.match(
      /^[-*]\s*(?:\*\*)?(?:Mức độ ưu tiên|Mức ưu tiên|Ưu tiên|Priority)(?:\*\*)?\s*:\s*([^·|]+?)\s*(?:[·|]\s*(?:\*\*)?(?:Loại|Type)(?:\*\*)?\s*:\s*(.+?)\s*)?$/i,
    );
    if (ptBullet) {
      tc.priority = normalizePriority(ptBullet[1]);
      if (ptBullet[2]) {
        tc.type = ptBullet[2].trim();
        tc.typeEn = normalizeType(ptBullet[2]);
      }
      field = null;
      continue;
    }

    // `- Điều kiện tiên quyết: …` / `- Các bước: …` / `- Kết quả mong đợi: …`
    const fieldM = trimmed.match(
      /^[-*]\s*(?:\*\*)?(Điều kiện tiên quyết|Tiền điều kiện|Preconditions|Các bước|Steps|Kết quả mong đợi|Expected)(?:\*\*)?\s*:\s*(.*)$/i,
    );
    if (fieldM) {
      const key = fieldM[1].toLowerCase();
      const value = fieldM[2].trim();
      if (/điều kiện|precondition/.test(key)) {
        tc.preconditions = value;
        field = 'pre';
      } else if (/bước|steps/.test(key)) {
        tc.steps = splitInlineSteps(value);
        field = 'steps';
      } else {
        tc.expected = value;
        field = 'expected';
      }
      continue;
    }

    // any other bullet ends the current field
    if (/^[-*]\s+/.test(trimmed)) {
      field = null;
      continue;
    }

    if (/^---$/.test(trimmed)) {
      field = null;
      continue;
    }

    if (!trimmed) continue;

    if (field === 'steps') {
      const stepM = trimmed.match(/^\d+[.)]\s+(.*)$/);
      if (stepM) {
        tc.steps.push(stepM[1]);
        continue;
      }
      if (tc.steps.length) tc.steps[tc.steps.length - 1] += ' ' + trimmed;
      continue;
    }
    if (field === 'pre') {
      tc.preconditions += (tc.preconditions ? ' ' : '') + trimmed;
      continue;
    }
    if (field === 'expected') {
      tc.expected += (tc.expected ? ' ' : '') + trimmed;
      continue;
    }
  }
  finishCase();
  return areas;
}

/**
 * Table format (ticket-driven docs — docs/test-cases/edit-order.md):
 *   ### B1. <Area>
 *   | ID | Tiêu đề | Các bước & Kết quả mong đợi | Ưu tiên | Nguồn | Scan |
 *   | TC-EO-001 | <title> | <step> → <step> → <expected> | Cao | 2591-TC01 | ✅ |
 * The "Scan" column records what a read-only DOM scan confirmed: ✅ matches spec,
 * ⚠️ observed but deviates from spec, 🔍 not verifiable read-only.
 */
function parseTableFormat(lines) {
  const areas = [];
  let area = null;
  for (const line of lines) {
    if (/^##(?!#)\s+/.test(line)) {
      area = null;
      continue;
    }
    const areaM = line.match(/^###\s+(?:([A-Z]\d*)\.\s*)?(.+?)\s*$/);
    if (areaM) {
      const name = areaM[2].trim();
      area = { name, slug: slugify(name) || 'area', letter: areaM[1] ?? '', cases: [] };
      areas.push(area);
      continue;
    }
    const row = line.match(/^\|\s*(TC-[A-Z0-9]+-\d+)\s*\|(.*)\|\s*$/);
    if (!row || !area) continue;
    const [title = '', body = '', priority = '', source = '', scan = ''] = row[2]
      .split('|')
      .map((c) => c.trim());
    // "a → b → expected": everything before the last arrow is steps.
    const parts = body.split(/\s*→\s*/).filter(Boolean);
    const expected = parts.length > 1 ? parts.pop() : body;
    const steps = parts.length ? parts : [];
    const scanStatus = scan.includes('⚠')
      ? 'deviates'
      : scan.includes('✅')
        ? scan.includes('🔍')
          ? 'partial'
          : 'verified'
        : 'unverified';
    area.cases.push({
      id: row[1],
      title: title.replace(/\*\*/g, ''),
      area: area.name,
      priority: normalizePriority(priority),
      type: '',
      typeEn: 'Functional',
      preconditions: '',
      steps,
      expected,
      source,
      scan,
      scanStatus,
      needsVerification: scanStatus !== 'verified',
    });
  }
  return areas;
}

const isBulletFormat = /^\*\*TC-[A-Z0-9]+-\d+\s*[·:—-]/m.test(md);
const isTableFormat = !isBulletFormat && /^\|\s*TC-[A-Z0-9]+-\d+\s*\|/m.test(md);
const format = isBulletFormat ? 'bullet' : isTableFormat ? 'table' : 'heading';
const parser = { bullet: parseBulletFormat, table: parseTableFormat, heading: parseHeadingFormat }[
  format
];
// Areas with no cases are prose sections (feature inventory, coverage summary).
const areas = parser(lines).filter((a) => a.cases.length > 0);

const allCases = areas.flatMap((a) => a.cases);
const abbr = allCases[0]?.id.match(/^TC-([A-Z0-9]+)-/)?.[1] ?? 'XXX';

const result = {
  screen: meta.screen ?? 'Screen',
  route: meta.route ?? '',
  abbr,
  generated: meta.generated ?? '',
  total: meta.total ?? allCases.length,
  sourceScan: meta.sourceScan ?? '',
  format,
  areaCount: areas.length,
  caseCount: allCases.length,
  areas: areas.map((a, i) => ({
    name: a.name,
    slug: a.slug,
    letter: a.letter ?? '',
    index: i + 1,
    // Repo convention for generated specs: tests/e2e/<screen>/TC<n>-<slug>.e2e.spec.ts
    specFile: `TC${i + 1}-${a.slug}.e2e.spec.ts`,
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
  const t = c.typeEn || c.type || '?';
  byType[t] = (byType[t] || 0) + 1;
}
const fmt = (o) =>
  Object.entries(o)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ');
console.error(
  `Parsed ${allCases.length} cases across ${areas.length} areas (${format} format) → ${outPath}`,
);
console.error(`  screen=${result.screen}  route=${result.route}  abbr=${result.abbr}`);
console.error(`  priority: ${fmt(byPriority)}`);
console.error(`  type:     ${fmt(byType)}`);
const needsVerify = allCases.filter((c) => c.needsVerification).length;
if (needsVerify) console.error(`  needsVerification: ${needsVerify}`);
for (const a of result.areas)
  console.error(`  - [${a.index}] ${a.name} (${a.count}) → ${a.specFile}`);

// echo output path to stdout for scripting
console.log(outPath);
