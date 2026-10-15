/**
 * Portal POS Test Runner GUI — a local web UI to browse the suite by feature,
 * pick tests (or everything), run them with chosen options and watch results
 * live. Zero dependencies beyond what the repo already has.
 *
 *   npm run gui                # http://localhost:4782
 *   GUI_PORT=5000 npm run gui
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const TESTS_DIR = path.join(ROOT, 'tests');
const DATA_DIR = path.join(ROOT, 'reports', 'gui-runs');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const DURATIONS_FILE = path.join(DATA_DIR, 'durations.json');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');
const PW_CLI = path.join(ROOT, 'node_modules', 'playwright', 'cli.js');
const REPORTER = path.join(HERE, 'live-reporter.cjs');
const PORT = Number(process.env.GUI_PORT ?? 4782);
const MARK = '@@GUI@@';
const MAX_HISTORY = 50;

fs.mkdirSync(DATA_DIR, { recursive: true });

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ---------------------------------------------------------------- discovery

const listCache = new Map(); // env -> { at, data }

function featureTitle(folder) {
  const doc = path.join(ROOT, 'docs', 'test-cases', `${folder}.md`);
  try {
    const first = fs.readFileSync(doc, 'utf8').split(/\r?\n/, 1)[0];
    // Doc headings vary: "Test case: Màn hình X", "Test Case — Màn hình X (Lean Core)",
    // "X — Test Cases", "X — Tài liệu tính năng & Test case". Keep just "X".
    const m = first.match(/^#\s*(.+)$/);
    if (m) {
      return m[1]
        .replace(/^test cases?\s*[:—-]\s*/i, '')
        .replace(/^màn hình\s+/i, '')
        .replace(/\s*—\s*(test cases?|tài liệu.*)$/i, '')
        .replace(/\s*\(lean core\)/i, '')
        .trim();
    }
  } catch {
    /* no doc for this folder */
  }
  return folder.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function listTests(env) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [PW_CLI, 'test', '--list', '--reporter=json'],
      { cwd: ROOT, env: { ...process.env, ENV: env }, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => {
        let json;
        try {
          json = JSON.parse(stdout.slice(stdout.indexOf('{')));
        } catch {
          return reject(new Error(err?.message || 'Could not parse playwright --list output'));
        }
        resolve(buildTree(json));
      },
    );
  });
}

function buildTree(json) {
  const features = new Map();
  const durations = readJson(DURATIONS_FILE, {});
  const tests = [];

  const walk = (suite, titles) => {
    for (const spec of suite.specs ?? []) {
      const file = spec.file.replace(/\\/g, '/');
      if (file === 'global.setup.ts') continue;
      const key = `${file}:${spec.line}:${spec.title}`;
      tests.push({
        key,
        file,
        line: spec.line,
        title: spec.title,
        describe: titles.filter(Boolean).join(' › '),
        tags: [...new Set(spec.tags.map((t) => (t.startsWith('@') ? t : `@${t}`)))],
        projects: [...new Set(spec.tests.map((t) => t.projectName))],
        lastDuration: durations[key] ?? null,
      });
    }
    for (const child of suite.suites ?? []) {
      walk(child, child.file && child.title === child.file ? titles : [...titles, child.title]);
    }
  };
  for (const s of json.suites ?? []) walk(s, []);

  for (const t of tests) {
    const parts = t.file.split('/');
    // tests/e2e/<feature>/x.spec.ts -> feature; tests/<group>/x.spec.ts -> group
    const id = parts[0] === 'e2e' && parts.length > 2 ? parts[1] : parts[0];
    const group = parts[0] === 'e2e' ? 'E2E' : parts[0].toUpperCase();
    if (!features.has(id)) {
      features.set(id, { id, group, title: featureTitle(id), files: new Map() });
    }
    const f = features.get(id);
    if (!f.files.has(t.file)) f.files.set(t.file, { file: t.file, name: parts.at(-1), tests: [] });
    f.files.get(t.file).tests.push(t);
  }

  const sortFiles = (a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

  return {
    generatedAt: new Date().toISOString(),
    total: tests.length,
    errors: (json.errors ?? []).map((e) => e.message),
    features: [...features.values()]
      .map((f) => ({ ...f, files: [...f.files.values()].sort(sortFiles) }))
      .sort((a, b) => (a.group === b.group ? a.id.localeCompare(b.id) : a.group === 'E2E' ? -1 : 1)),
  };
}

async function getTests(env, refresh) {
  const cached = listCache.get(env);
  if (cached && !refresh) return cached;
  const data = await listTests(env);
  listCache.set(env, data);
  return data;
}

// ---------------------------------------------------------------- running

const clients = new Set();
let run = null; // current run state
let lastFailed = readJson(HISTORY_FILE, [])[0]?.failedKeys ?? [];

function broadcast(event) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(line);
}

/**
 * Turns a selection into the shortest CLI filter list: a fully-selected
 * feature becomes its folder, a fully-selected file its path, anything else
 * file:line. Keeps the command line well under the Windows 32k limit.
 */
function buildFilters(selectedKeys, tree) {
  const chosen = new Set(selectedKeys);
  if (tree.total > 0 && chosen.size >= tree.total) return [];
  const filters = [];
  for (const f of tree.features) {
    const all = f.files.flatMap((x) => x.tests);
    const picked = all.filter((t) => chosen.has(t.key));
    if (!picked.length) continue;
    if (picked.length === all.length) {
      const dir = path.posix.dirname(f.files[0].file);
      if (f.files.every((x) => path.posix.dirname(x.file) === dir)) {
        filters.push(`tests/${dir}/`);
        continue;
      }
    }
    for (const file of f.files) {
      const p = file.tests.filter((t) => chosen.has(t.key));
      if (!p.length) continue;
      if (p.length === file.tests.length) filters.push(`tests/${file.file}`);
      else for (const line of new Set(p.map((t) => t.line))) filters.push(`tests/${file.file}:${line}`);
    }
  }
  return filters;
}

async function startRun({ keys, options = {}, trigger = 'manual' }) {
  if (run?.proc) throw new Error('A run is already in progress');
  const env = options.env ?? 'stage';
  const tree = await getTests(env, false);
  const valid = new Set(tree.features.flatMap((f) => f.files.flatMap((x) => x.tests.map((t) => t.key))));
  const selected = (keys ?? []).filter((k) => valid.has(k));
  if (!selected.length) throw new Error('No tests selected');

  const args = [PW_CLI, 'test', ...buildFilters(selected, tree)];
  args.push(`--reporter=list,html,json,${REPORTER}`);
  args.push(`--workers=${clamp(options.workers, 1, 16, 8)}`);
  args.push(`--retries=${clamp(options.retries, 0, 5, 0)}`);
  if (options.repeatEach > 1) args.push(`--repeat-each=${clamp(options.repeatEach, 1, 20, 1)}`);
  if (options.headed) args.push('--headed');
  if (options.grep) args.push(`--grep=${options.grep}`);
  if (options.maxFailures > 0) args.push(`--max-failures=${clamp(options.maxFailures, 1, 999, 0)}`);

  const childEnv = {
    ...process.env,
    ENV: env,
    FORCE_COLOR: '1',
    TRACE: options.trace ?? 'off',
    PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(ROOT, 'reports', 'html'),
    PLAYWRIGHT_HTML_OPEN: 'never',
    PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(ROOT, 'reports', 'json', 'results.json'),
  };
  if (options.headed) childEnv.HEADLESS = 'false';

  const proc = spawn(process.execPath, args, { cwd: ROOT, env: childEnv });
  run = {
    id: Date.now().toString(36),
    trigger,
    env,
    options,
    selectedKeys: selected,
    command: `npx playwright ${args.slice(1).filter((a) => !a.startsWith('--reporter')).join(' ')}`,
    startedAt: Date.now(),
    total: selected.length,
    results: {},
    log: '',
    proc,
  };
  broadcast({ type: 'runStart', run: publicRun() });

  let buf = '';
  const onData = (chunk) => {
    buf += chunk.toString();
    const lines = buf.split('\n');
    buf = lines.pop();
    let text = '';
    for (const line of lines) {
      const i = line.indexOf(MARK);
      if (i >= 0) handleReporterEvent(JSON.parse(line.slice(i + MARK.length)));
      else text += `${line}\n`;
    }
    if (text.trim()) {
      run.log += text;
      if (run.log.length > 2_000_000) run.log = run.log.slice(-1_500_000);
      broadcast({ type: 'log', text });
    }
  };
  proc.stdout.on('data', onData);
  proc.stderr.on('data', (c) => {
    run.log += c.toString();
    broadcast({ type: 'log', text: c.toString() });
  });
  proc.on('close', (code) => finishRun(code));
  return publicRun();
}

function handleReporterEvent(e) {
  if (e.type === 'begin') {
    run.total = e.total;
    broadcast({ type: 'total', total: e.total });
  } else if (e.type === 'testBegin') {
    run.results[e.key] = { ...(run.results[e.key] ?? {}), status: 'running', retry: e.retry };
    broadcast({ type: 'testBegin', key: e.key, retry: e.retry });
  } else if (e.type === 'testEnd') {
    const status = !e.final
      ? 'retrying'
      : e.outcome === 'flaky'
        ? 'flaky'
        : e.status === 'passed'
          ? 'passed'
          : e.status === 'skipped'
            ? 'skipped'
            : 'failed';
    const r = { status, duration: e.duration, retry: e.retry, errors: e.errors, attachments: e.attachments };
    run.results[e.key] = r;
    broadcast({ type: 'testEnd', key: e.key, result: r });
  }
}

function finishRun(code) {
  const finishedAt = Date.now();
  const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
  const durations = readJson(DURATIONS_FILE, {});
  const failedKeys = [];
  for (const [key, r] of Object.entries(run.results)) {
    if (counts[r.status] !== undefined) counts[r.status]++;
    if (r.status === 'failed' || r.status === 'retrying') failedKeys.push(key);
    if (r.status === 'passed' || r.status === 'flaky') durations[key] = r.duration;
  }
  writeJson(DURATIONS_FILE, durations);
  const stopped = run.stopped === true;
  const entry = {
    id: run.id,
    trigger: run.trigger,
    env: run.env,
    options: run.options,
    command: run.command,
    startedAt: run.startedAt,
    finishedAt,
    duration: finishedAt - run.startedAt,
    selected: run.selectedKeys.length,
    counts,
    exitCode: code,
    status: stopped ? 'stopped' : code === 0 ? 'passed' : 'failed',
    failedKeys,
    results: run.results,
  };
  const history = readJson(HISTORY_FILE, []);
  history.unshift(entry);
  writeJson(HISTORY_FILE, history.slice(0, MAX_HISTORY));
  if (!stopped) lastFailed = failedKeys;
  run.proc = null;
  broadcast({ type: 'runEnd', entry: summary(entry) });
}

function stopRun() {
  if (!run?.proc) return false;
  run.stopped = true;
  if (process.platform === 'win32') execFile('taskkill', ['/pid', String(run.proc.pid), '/T', '/F']);
  else run.proc.kill('SIGTERM');
  return true;
}

const summary = ({ results, ...rest }) => rest;
const publicRun = () =>
  run && {
    id: run.id,
    env: run.env,
    trigger: run.trigger,
    options: run.options,
    command: run.command,
    startedAt: run.startedAt,
    total: run.total,
    selectedKeys: run.selectedKeys,
    results: run.results,
    running: !!run.proc,
  };

function clamp(v, min, max, dflt) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : dflt;
}

// ---------------------------------------------------------------- schedule

let schedule = readJson(SCHEDULE_FILE, { enabled: false, time: '02:00', days: [1, 2, 3, 4, 5], keys: 'all', options: {} });
let lastScheduledFire = '';

setInterval(async () => {
  if (!schedule.enabled || run?.proc) return;
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const stamp = `${now.toDateString()} ${hhmm}`;
  if (hhmm !== schedule.time || !schedule.days.includes(now.getDay()) || lastScheduledFire === stamp) return;
  lastScheduledFire = stamp;
  try {
    const env = schedule.options?.env ?? 'stage';
    const tree = await getTests(env, true);
    const keys =
      schedule.keys === 'all'
        ? tree.features.flatMap((f) => f.files.flatMap((x) => x.tests.map((t) => t.key)))
        : schedule.keys;
    await startRun({ keys, options: schedule.options, trigger: 'schedule' });
  } catch (e) {
    broadcast({ type: 'log', text: `\n[schedule] ${e.message}\n` });
  }
}, 20_000);

// ---------------------------------------------------------------- http

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.zip': 'application/zip',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const readBody = (req) =>
  new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch {
        resolve({});
      }
    });
  });

/** Only serve files that live under these folders. */
const within = (file, dirs) => dirs.some((d) => file.startsWith(path.join(ROOT, d) + path.sep));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  try {
    if (p === '/' || p === '/index.html') return sendFile(res, path.join(HERE, 'index.html'));
    if (p === '/icon.ico' || p === '/favicon.ico') return sendFile(res, path.join(HERE, 'icon.ico'));

    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'hello', run: publicRun(), log: run?.log.slice(-200_000) ?? '' })}\n\n`);
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
      req.on('close', () => {
        clearInterval(ping);
        clients.delete(res);
      });
      return;
    }

    if (p === '/api/envs') {
      const envs = fs
        .readdirSync(path.join(ROOT, 'configs', 'env'))
        .map((f) => f.match(/^\.env\.(\w+)$/)?.[1])
        .filter((e) => e && e !== 'example');
      return send(res, 200, { envs: envs.length ? envs : ['local'] });
    }

    if (p === '/api/tests') {
      const data = await getTests(url.searchParams.get('env') ?? 'stage', url.searchParams.has('refresh'));
      return send(res, 200, { ...data, lastFailed });
    }

    if (p === '/api/run' && req.method === 'POST') {
      const body = await readBody(req);
      return send(res, 200, await startRun({ keys: body.keys, options: body.options }));
    }

    if (p === '/api/stop' && req.method === 'POST') return send(res, 200, { stopped: stopRun() });

    if (p === '/api/history') {
      const h = readJson(HISTORY_FILE, []);
      const id = url.searchParams.get('id');
      if (id) return send(res, 200, h.find((x) => x.id === id) ?? null);
      return send(res, 200, h.map(summary));
    }

    if (p === '/api/history/clear' && req.method === 'POST') {
      writeJson(HISTORY_FILE, []);
      return send(res, 200, { ok: true });
    }

    if (p === '/api/schedule') {
      if (req.method === 'POST') {
        schedule = { ...schedule, ...(await readBody(req)) };
        writeJson(SCHEDULE_FILE, schedule);
      }
      return send(res, 200, schedule);
    }

    if (p === '/api/file') {
      const file = path.resolve(ROOT, url.searchParams.get('p') ?? '');
      if (!within(file, ['test-results', 'reports'])) return send(res, 403, { error: 'Forbidden' });
      return sendFile(res, file);
    }

    if (p === '/api/open' && req.method === 'POST') {
      // Opens a spec in VS Code (falls back silently if `code` is not on PATH).
      const { file, line } = await readBody(req);
      const abs = path.resolve(TESTS_DIR, file ?? '');
      if (!within(abs, ['tests'])) return send(res, 403, { error: 'Forbidden' });
      spawn('code', ['-g', `${abs}:${line ?? 1}`], { shell: true, detached: true, stdio: 'ignore' }).unref();
      return send(res, 200, { ok: true });
    }

    if (p.startsWith('/report')) {
      const rel = decodeURIComponent(p.slice('/report'.length)).replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(ROOT, 'reports', 'html', rel);
      if (!within(file, [path.join('reports', 'html')])) return send(res, 403, { error: 'Forbidden' });
      return sendFile(res, file);
    }

    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

// ---------------------------------------------------------------- window

const LINK = `http://localhost:${PORT}`;
const APP_MODE = process.env.GUI_APP === '1';

/** Edge ships with Windows; Chrome/Chromium are fallbacks. */
function findAppBrowser() {
  const pf = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  const candidates =
    process.platform === 'win32'
      ? pf.flatMap((d) => [
          path.join(d, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
          path.join(d, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ])
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
        : ['/usr/bin/google-chrome', '/usr/bin/microsoft-edge', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find((p) => fs.existsSync(p));
}

/**
 * Opens the GUI as a standalone desktop window (Chromium `--app` mode: no tabs,
 * no address bar). A dedicated profile makes the window its own process, so
 * `onClose` fires when the user closes it. Falls back to the default browser.
 */
function openWindow(onClose) {
  const browser = findAppBrowser();
  if (!browser) {
    const opener = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(`${opener} ${LINK}`, { shell: true, stdio: 'ignore', detached: true }).unref();
    return;
  }
  const win = spawn(
    browser,
    [
      `--app=${LINK}`,
      `--user-data-dir=${path.join(ROOT, '.cache', 'test-runner-gui-window')}`,
      '--window-size=1480,940',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,msEdgeTranslate,msEdgeSidebarV2,msHubApps,EdgeCollections,msImplicitSignin',
    ],
    { stdio: 'ignore', detached: !onClose },
  );
  if (onClose) win.on('exit', onClose);
  else win.unref();
}

server.on('error', (err) => {
  // Another GUI server already owns the port: just show its window.
  if (err.code === 'EADDRINUSE') {
    console.log(`\n  GUI already running → ${LINK}\n`);
    if (!process.env.GUI_NO_OPEN) openWindow();
    setTimeout(() => process.exit(0), 1500);
    return;
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Portal POS Test Runner GUI → ${LINK}\n`);
  if (process.env.GUI_NO_OPEN) return;
  if (!APP_MODE) return openWindow();
  // Desktop-app mode: closing the window shuts the server (and any run) down,
  // unless a schedule is armed — then keep serving in the background for it.
  openWindow(() => {
    if (schedule.enabled) return console.log('  Window closed; staying up for the schedule.');
    stopRun();
    setTimeout(() => process.exit(0), 500);
  });
});
