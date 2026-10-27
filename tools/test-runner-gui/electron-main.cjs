/**
 * Electron shell for the Portal POS Test Runner.
 *
 *   npm run app
 *
 * It reuses the existing `server.mjs` verbatim: the main process starts that
 * local server (bound to 127.0.0.1, never exposed), waits until it answers,
 * then loads it inside a native desktop window — no browser, no address bar,
 * no visible localhost. Closing the window stops the server and quits.
 */
const { app, BrowserWindow, shell, Menu } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '../..');
const PORT = Number(process.env.GUI_PORT || 4782);
const URL = `http://127.0.0.1:${PORT}`;
const SERVER = path.join(HERE, 'server.mjs');

let server = null;
let win = null;

/** Launch server.mjs headless. On a dev machine use the real Node (npm hands us
 *  its path in npm_node_execpath); in a packaged build, or if that Node is
 *  missing, fall back to the bundled Electron running as plain Node. */
function startServer() {
  const base = { cwd: ROOT, env: { ...process.env, GUI_PORT: String(PORT), GUI_NO_OPEN: '1' }, stdio: 'inherit' };
  const asNode = { ...base, env: { ...base.env, ELECTRON_RUN_AS_NODE: '1' } };
  if (app.isPackaged) {
    server = spawn(process.execPath, [SERVER], asNode);
    return;
  }
  const nodeBin = process.env.npm_node_execpath || (process.platform === 'win32' ? 'node.exe' : 'node');
  server = spawn(nodeBin, [SERVER], base);
  server.on('error', () => {
    // No standalone Node on PATH — fall back to Electron-as-Node.
    server = spawn(process.execPath, [SERVER], asNode);
  });
}

/** Poll the server until it responds (it may still be scanning the suite). */
function waitForServer(done, tries = 0) {
  const req = http.get(URL, () => { req.destroy(); done(); });
  req.on('error', () => {
    if (tries > 200) return done(new Error('Server did not start on ' + URL));
    setTimeout(() => waitForServer(done, tries + 1), 150);
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 900,
    minHeight: 600,
    title: 'Portal POS Test Runner',
    icon: path.join(HERE, 'icon.ico'),
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  Menu.setApplicationMenu(null);
  win.loadURL(URL);
  win.once('ready-to-show', () => win.show());
  // External links (HTML report popups, Discord help, etc.) open in the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(URL)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => { win = null; });
}

function stopServer() {
  if (!server) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F']);
    else server.kill('SIGTERM');
  } catch { /* already gone */ }
  server = null;
}

// Own name + profile: the results app is launched from the same package.json,
// so without this both share one userData dir and its single-instance lock.
app.setName('Portal POS Test Runner');
app.setPath('userData', path.join(app.getPath('appData'), 'Portal POS Test Runner'));

// Single instance: a second launch just focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

  app.whenReady().then(() => {
    startServer();
    waitForServer((err) => {
      if (err) { console.error(err.message); app.quit(); return; }
      createWindow();
    });
    app.on('activate', () => { if (!win) createWindow(); });
  });

  app.on('window-all-closed', () => { stopServer(); app.quit(); });
  app.on('before-quit', stopServer);
  process.on('exit', stopServer);
}
