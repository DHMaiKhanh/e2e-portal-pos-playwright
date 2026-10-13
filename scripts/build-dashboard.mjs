// Build a self-contained *React* dashboard from the Playwright JSON report.
//
// Reads reports/json/results.json and writes reports/dashboard/index.html — a
// single file that boots a real React app (React + ReactDOM + htm, all inlined
// from scripts/vendor/) against run data inlined as window.__DATA__. No build
// step, no dev server, no network: open index.html directly (file://).
//
//   node scripts/build-dashboard.mjs
//   ENV=stage node scripts/build-dashboard.mjs
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(ROOT, 'reports/json/results.json');
const OUT_DIR = path.join(ROOT, 'reports/dashboard');
const OUT_FILE = path.join(OUT_DIR, 'index.html');
const VENDOR = path.join(HERE, 'vendor');
const APP_JS = path.join(HERE, 'dashboard-app.js');
const ENV = process.env.ENV || 'stage';

if (!fs.existsSync(RESULTS)) {
  console.error(`✗ No results file at ${RESULTS}. Run the suite first.`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));

const stripAnsi = (s) => String(s ?? '').replace(/\x1b\[[0-9;]*m/g, '');

// Make an attachment path usable from reports/dashboard/index.html.
const relPath = (abs) => {
  if (!abs) return null;
  try {
    return path.relative(OUT_DIR, abs).replace(/\\/g, '/');
  } catch {
    return abs.replace(/\\/g, '/');
  }
};

// Derive a human screen name from a spec file path, e.g.
//   e2e/batch-history/responsive.e2e.spec.ts -> "batch-history"
//   api/customers.api.spec.ts               -> "api"
const screenOf = (file) => {
  const parts = String(file || '')
    .split(/[\\/]/)
    .filter(Boolean);
  if (parts[0] === 'e2e') return parts[1] || 'e2e';
  return parts[0] || 'other';
};

const tests = [];
function walk(suite, file) {
  const f = suite.file || file;
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      const results = t.results || [];
      const last = results[results.length - 1] || {};
      const attachments = [];
      for (const r of results) for (const a of r.attachments || []) attachments.push(a);
      const screenshot = attachments.find(
        (a) => a.name === 'screenshot' && a.path && /image\//.test(a.contentType || ''),
      );
      const errorCtx = attachments.find((a) => a.name === 'error-context' && a.path);
      let message = '';
      const err = last.error || (last.errors && last.errors[0]);
      if (err) message = stripAnsi(err.message || '');
      tests.push({
        screen: screenOf(spec.file || f),
        file: (spec.file || f || '').replace(/\\/g, '/'),
        title: spec.title,
        status: t.status, // expected | unexpected | flaky | skipped
        ok: spec.ok,
        duration: last.duration || 0,
        retries: Math.max(0, results.length - 1),
        message,
        screenshot: screenshot ? relPath(screenshot.path) : null,
        errorContext: errorCtx ? relPath(errorCtx.path) : null,
      });
    }
  }
  for (const s of suite.suites || []) walk(s, f);
}
for (const s of report.suites || []) walk(s);

const stats = report.stats || {};
const count = (st) => tests.filter((t) => t.status === st).length;
const summary = {
  total: tests.length,
  passed: count('expected'),
  failed: count('unexpected'),
  flaky: count('flaky'),
  skipped: count('skipped'),
  duration: stats.duration || tests.reduce((a, t) => a + t.duration, 0),
  startTime: stats.startTime || null,
  env: ENV,
};
const executed = summary.passed + summary.failed + summary.flaky;
summary.passRate = executed ? Math.round((summary.passed / executed) * 1000) / 10 : 0;

// Group by screen.
const screensMap = {};
for (const t of tests) (screensMap[t.screen] ||= []).push(t);
const screens = Object.entries(screensMap)
  .map(([name, ts]) => ({
    name,
    total: ts.length,
    passed: ts.filter((t) => t.status === 'expected').length,
    failed: ts.filter((t) => t.status === 'unexpected').length,
    flaky: ts.filter((t) => t.status === 'flaky').length,
    skipped: ts.filter((t) => t.status === 'skipped').length,
    tests: ts,
  }))
  .sort((a, b) => b.failed - a.failed || a.name.localeCompare(b.name));

const generatedAt = summary.startTime ? new Date(summary.startTime).toLocaleString() : 'unknown';

const data = { summary, screens, generatedAt };

// ---- Assemble the self-contained HTML ------------------------------------

const readVendor = (name) => {
  const p = path.join(VENDOR, name);
  if (!fs.existsSync(p)) {
    console.error(
      `✗ Missing vendored lib ${p}. Re-download with:\n` +
        `  curl -L https://unpkg.com/react@18.3.1/umd/react.production.min.js -o scripts/vendor/react.production.min.js\n` +
        `  curl -L https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js -o scripts/vendor/react-dom.production.min.js\n` +
        `  curl -L https://unpkg.com/htm@3.1.1/dist/htm.umd.js -o scripts/vendor/htm.umd.js`,
    );
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
};

const reactJs = readVendor('react.production.min.js');
const reactDomJs = readVendor('react-dom.production.min.js');
const htmJs = readVendor('htm.umd.js');
const appJs = fs.readFileSync(APP_JS, 'utf8');

// Inline JSON safely inside a <script> tag.
const dataJson = JSON.stringify(data).replace(/</g, '\\u003c');

const css = `
  :root {
    --bg:#0f1115; --panel:#171a21; --panel2:#1e222b; --border:#2a2f3a;
    --text:#e6e9ef; --muted:#9aa4b2;
    --pass:#2ecc71; --fail:#ff5b5b; --flaky:#f5a623; --skip:#6b7280;
    --accent:#4f8cff;
  }
  @media (prefers-color-scheme: light) {
    :root { --bg:#f5f6f8; --panel:#fff; --panel2:#f0f2f5; --border:#e2e5ea;
            --text:#1a1d24; --muted:#5b6472; }
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .wrap { max-width:1140px; margin:0 auto; padding:24px 20px 80px; }
  .hero h1 { font-size:22px; margin:0 0 2px; display:flex; align-items:center; gap:10px; }
  .hero .tag { font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase;
               color:#fff; background:linear-gradient(135deg,#61dafb33,#4f8cff); border:1px solid var(--accent);
               padding:2px 8px; border-radius:20px; color:var(--accent); background:color-mix(in srgb,var(--accent) 15%,transparent); }
  .sub { color:var(--muted); font-size:13px; margin-bottom:20px; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:12px; margin-bottom:22px; }
  .card { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:14px 16px; }
  .card .num { font-size:26px; font-weight:700; }
  .card .lbl { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
  .card.pass .num { color:var(--pass); } .card.fail .num { color:var(--fail); }
  .card.flaky .num { color:var(--flaky); } .card.skip .num { color:var(--skip); }
  .ratebar { height:10px; background:var(--panel2); border-radius:6px; overflow:hidden; margin-top:8px; }
  .ratebar > span { display:block; height:100%; background:var(--pass); transition:width .4s; }
  .toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:16px;
             position:sticky; top:0; background:var(--bg); padding:10px 0; z-index:5; }
  .toolbar .search { flex:1; min-width:180px; background:var(--panel); border:1px solid var(--border);
                     color:var(--text); padding:9px 12px; border-radius:9px; font-size:13px; }
  .toolbar button { background:var(--panel); border:1px solid var(--border); color:var(--text);
                    padding:9px 14px; border-radius:9px; cursor:pointer; font-size:13px; }
  .toolbar button:hover { border-color:var(--accent); }
  .toolbar button.active { background:var(--accent); border-color:var(--accent); color:#fff; }
  .toolbar button.ghost { color:var(--muted); }
  .screen { background:var(--panel); border:1px solid var(--border); border-radius:12px;
            margin-bottom:12px; overflow:hidden; }
  .screen-summary { width:100%; text-align:left; background:none; border:none; color:inherit;
                    cursor:pointer; display:flex; align-items:center; gap:12px; padding:14px 16px;
                    flex-wrap:wrap; font:inherit; }
  .screen-summary:hover { background:var(--panel2); }
  .caret { width:14px; color:var(--muted); }
  .screen-name { font-weight:600; font-size:15px; min-width:130px; }
  .screen-stats { display:flex; gap:6px; flex-wrap:wrap; flex:1; }
  .screen-rate { color:var(--muted); font-size:12px; font-variant-numeric:tabular-nums; }
  .screen-bar { width:110px; height:8px; background:var(--panel2); border-radius:5px; overflow:hidden; }
  .screen-bar-fill { display:block; height:100%; background:var(--pass); }
  .chip { font-size:11px; padding:2px 8px; border-radius:20px; font-weight:600; }
  .chip.pass { color:var(--pass); background:color-mix(in srgb,var(--pass) 15%,transparent); }
  .chip.fail { color:var(--fail); background:color-mix(in srgb,var(--fail) 15%,transparent); }
  .chip.flaky { color:var(--flaky); background:color-mix(in srgb,var(--flaky) 15%,transparent); }
  .chip.skip { color:var(--skip); background:color-mix(in srgb,var(--skip) 18%,transparent); }
  .screen-body { padding:0 16px 10px; }
  .test { border-top:1px solid var(--border); padding:12px 0; }
  .test-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .test-title { font-weight:500; }
  .test-dur { color:var(--muted); font-size:12px; margin-left:auto; }
  .test-file { color:var(--muted); font-size:12px; font-family:ui-monospace,monospace; margin:3px 0 0; }
  .badge { font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; }
  .badge.pass { color:#063; background:color-mix(in srgb,var(--pass) 25%,transparent); }
  .badge.fail { color:#fff; background:var(--fail); }
  .badge.flaky { color:#000; background:var(--flaky); }
  .badge.skip { color:var(--text); background:var(--panel2); }
  .test-err { background:var(--panel2); border:1px solid var(--border); border-radius:8px;
              padding:10px 12px; margin:8px 0 0; font-size:12px; white-space:pre-wrap;
              word-break:break-word; overflow:hidden; color:#ff9b9b; max-height:120px; }
  .test-err.open { max-height:none; }
  .toggle-err { margin-top:6px; background:none; border:none; color:var(--accent); cursor:pointer;
                font-size:12px; padding:0; }
  .test-links { display:flex; gap:12px; align-items:center; margin-top:8px; flex-wrap:wrap; }
  .shot { padding:0; border:none; background:none; cursor:zoom-in; }
  .shot img { max-height:120px; border-radius:8px; border:1px solid var(--border); display:block; }
  .link { color:var(--accent); font-size:12px; text-decoration:none; }
  .link:hover { text-decoration:underline; }
  .empty { color:var(--muted); text-align:center; padding:48px 0; }
  footer { color:var(--muted); font-size:12px; margin-top:24px; text-align:center; }
  .lightbox { position:fixed; inset:0; background:rgba(0,0,0,.8); display:flex; align-items:center;
              justify-content:center; z-index:50; padding:30px; }
  .lightbox-inner { background:var(--panel); border:1px solid var(--border); border-radius:12px;
                    padding:14px; max-width:92vw; max-height:92vh; display:flex; flex-direction:column; gap:10px; }
  .lightbox-head { display:flex; align-items:center; justify-content:space-between; gap:16px;
                   font-size:13px; color:var(--muted); }
  .lightbox-close { background:none; border:1px solid var(--border); color:var(--text); border-radius:8px;
                    cursor:pointer; padding:4px 10px; }
  .lightbox-inner img { max-width:88vw; max-height:78vh; object-fit:contain; border-radius:8px; }
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>E2E Test Dashboard — Portal POS (React)</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${reactJs}</script>
<script>${reactDomJs}</script>
<script>${htmJs}</script>
<script>window.__DATA__ = ${dataJson};</script>
<script>${appJs}</script>
</body>
</html>`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, html, 'utf8');
console.log(`✓ React dashboard written to ${OUT_FILE}`);
console.log(
  `  ${summary.total} tests · ${summary.passed} passed · ${summary.failed} failed · ` +
    `${summary.skipped} skipped · ${summary.flaky} flaky · ${summary.passRate}% pass rate`,
);
