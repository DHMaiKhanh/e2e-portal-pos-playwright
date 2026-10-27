/**
 * "Portal POS Test Results" — desktop app that shows Playwright results.
 *
 *   npm run results
 *
 * No server and no localhost: the window loads index.html from disk and talks to this
 * process over Electron IPC. Results come from reports/desktop-app/latest.json, written by
 * results-reporter.cjs at the end of every run (the reporter also opens this window).
 * The app can start a run itself; it then spawns the Playwright CLI as a child process.
 */
const { app, BrowserWindow, ipcMain, Menu, Notification, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { folderLabel } = require('./labels.cjs');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '../..');
const DATA = path.join(ROOT, 'reports', 'desktop-app');
const LATEST = path.join(DATA, 'latest.json');
const HISTORY = path.join(DATA, 'history.json');
const E2E = path.join(ROOT, 'tests', 'e2e');
const PW_CLI = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');

let win = null;
let run = null; // { proc, total, done, failed }
let lastShownId = null;

const readJson = (file, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const send = (channel, payload) => win?.webContents.send(channel, payload);

function listFolders() {
  return fs
    .readdirSync(E2E, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ id: d.name, label: folderLabel(d.name) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

function listEnvs() {
  return fs
    .readdirSync(path.join(ROOT, 'configs', 'env'))
    .map((f) => f.match(/^\.env\.(\w+)$/)?.[1])
    .filter((e) => e && e !== 'example');
}

// ---------------------------------------------------------------- results feed

function announce(latest) {
  if (!latest || latest.id === lastShownId) return;
  const first = lastShownId === null;
  lastShownId = latest.id;
  send('results:updated', latest);
  if (first) return;
  const { failed, flaky, passed } = latest.stats;
  const body =
    failed > 0
      ? `${failed} test lỗi · ${passed} đạt${flaky ? ` · ${flaky} chập chờn` : ''}`
      : `Tất cả đều đạt (${passed} test)`;
  if (Notification.isSupported()) {
    const n = new Notification({
      title: 'Chạy test xong',
      body,
      icon: path.join(HERE, 'icon.ico'),
    });
    n.on('click', focusWindow);
    n.show();
  }
  if (win && !win.isFocused()) win.flashFrame(true);
}

let debounce = null;
function watchResults() {
  fs.mkdirSync(DATA, { recursive: true });
  fs.watch(DATA, (_event, file) => {
    if (file !== 'latest.json') return;
    clearTimeout(debounce);
    debounce = setTimeout(() => announce(readJson(LATEST)), 300);
  });
}

// ---------------------------------------------------------------- running tests

function startRun({ folders = [], env = 'stage', grep = '' }) {
  if (run) return { ok: false, error: 'Đang có lượt chạy khác.' };
  const args = [PW_CLI, 'test', ...folders.map((f) => `tests/e2e/${f}`)];
  if (grep) args.push('--grep', grep);
  const childEnv = { ...process.env, ENV: env, RESULTS_APP_OPEN: '0', FORCE_COLOR: '0' };
  delete childEnv.ELECTRON_RUN_AS_NODE;

  // Prefer a real Node on PATH; fall back to Electron running as plain Node.
  let proc = spawn('node', args, { cwd: ROOT, env: childEnv, windowsHide: true });
  proc.on('error', () => {
    proc = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...childEnv, ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
    });
    wire(proc);
  });
  run = { proc, total: 0, done: 0, failed: 0 };
  wire(proc);
  send('run:state', { running: true, total: 0, done: 0, failed: 0, folders, env });
  return { ok: true };
}

function wire(proc) {
  run.proc = proc;
  let buffer = '';
  const onData = (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) {
      const total = line.match(/Running (\d+) tests?/);
      if (total) run.total = Number(total[1]);
      const mark = line.match(/^\s+(ok|✓|x|✘|-)\s+\d+\s/);
      if (mark) {
        run.done += 1;
        if (mark[1] === 'x' || mark[1] === '✘') run.failed += 1;
      }
      send('run:output', line);
    }
    send('run:state', { running: true, total: run.total, done: run.done, failed: run.failed });
  };
  proc.stdout?.on('data', onData);
  proc.stderr?.on('data', onData);
  proc.on('close', (code) => {
    if (run?.proc !== proc) return;
    run = null;
    send('run:state', { running: false, code });
    // The reporter has written latest.json by now; make sure it shows even if fs.watch missed it.
    setTimeout(() => announce(readJson(LATEST)), 500);
  });
}

function stopRun() {
  if (!run) return;
  const { pid } = run.proc;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(pid), '/T', '/F']);
  else run.proc.kill('SIGTERM');
}

// ---------------------------------------------------------------- IPC

/** Only files inside the repo may be opened from the UI. */
const insideRoot = (p) => {
  const rel = path.relative(ROOT, path.resolve(ROOT, p));
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
};

ipcMain.handle('results:latest', () => {
  const latest = readJson(LATEST);
  if (latest) lastShownId = latest.id;
  return latest;
});
ipcMain.handle('results:history', () => readJson(HISTORY, []));
ipcMain.handle('results:run', (_e, id) =>
  /^[\w-]+$/.test(id) ? readJson(path.join(DATA, 'runs', `${id}.json`)) : null,
);
ipcMain.handle('tests:options', () => ({ folders: listFolders(), envs: listEnvs() }));
ipcMain.handle('tests:run', (_e, opts) => startRun(opts ?? {}));
ipcMain.handle('tests:stop', () => stopRun());
ipcMain.handle('tests:state', () =>
  run
    ? { running: true, total: run.total, done: run.done, failed: run.failed }
    : { running: false },
);
ipcMain.handle('shell:open', (_e, p) =>
  insideRoot(p) ? shell.openPath(path.resolve(ROOT, p)) : 'denied',
);
ipcMain.handle('shell:show', (_e, p) => {
  if (insideRoot(p)) shell.showItemInFolder(path.resolve(ROOT, p));
});
ipcMain.handle('shell:report', () =>
  shell.openPath(path.join(ROOT, 'reports', 'html', 'index.html')),
);

// ---------------------------------------------------------------- window

function focusWindow() {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 760,
    minHeight: 560,
    title: 'Portal POS Test Results',
    icon: path.join(HERE, 'icon.ico'),
    backgroundColor: '#f6f7f9',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(HERE, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(HERE, 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('focus', () => win.flashFrame(false));
  // Never navigate away from the app page; external links go to the real browser.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => {
    win = null;
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId('Portal POS Test Results');
  app.on('second-instance', () => {
    focusWindow();
    announce(readJson(LATEST));
  });
  app.whenReady().then(() => {
    createWindow();
    watchResults();
  });
  app.on('window-all-closed', () => {
    stopRun();
    app.quit();
  });
}
