/**
 * Adds "Portal POS Test Runner" shortcuts to the Desktop and Start Menu
 * (Windows). Double-click opens the runner as a desktop window.
 *
 *   npm run gui:shortcut          # browser app-window (Edge/Chrome --app)
 *   npm run app:shortcut          # native Electron desktop window (no browser)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') {
  console.error('Shortcuts are Windows-only. Use `npm run app` (Electron) or `npm run gui:app` instead.');
  process.exit(1);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const q = (s) => s.replace(/'/g, "''");
const useElectron = process.env.SHORTCUT_TARGET === 'electron';

let name, target, args, desc;
if (useElectron) {
  const exe = path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe');
  if (!fs.existsSync(exe)) {
    console.error('Electron chưa được cài. Chạy `npm install` rồi thử lại.');
    process.exit(1);
  }
  name = 'Portal POS Test Runner (App)';
  target = exe; // GUI app → no console window
  args = `"${path.join(HERE, 'electron-main.cjs')}"`;
  desc = 'Portal POS Test Runner — cửa sổ app desktop (Electron)';
} else {
  name = 'Portal POS Test Runner';
  target = '$env:WINDIR\\System32\\wscript.exe';
  args = `"${path.join(HERE, 'launch.vbs')}"`;
  desc = 'Chọn và chạy Playwright E2E test cho Portal POS';
}

const ps = `
$sh = New-Object -ComObject WScript.Shell
$dirs = @([Environment]::GetFolderPath('Desktop'), (Join-Path ([Environment]::GetFolderPath('Programs')) ''))
foreach ($d in $dirs) {
  $lnk = $sh.CreateShortcut((Join-Path $d '${q(name)}.lnk'))
  $lnk.TargetPath = "${q(target)}"
  $lnk.Arguments = '${q(args)}'
  $lnk.WorkingDirectory = '${q(ROOT)}'
  $lnk.IconLocation = '${q(path.join(HERE, 'icon.ico'))}'
  $lnk.Description = '${q(desc)}'
  $lnk.Save()
  Write-Output "  + $($lnk.FullName)"
}`;
console.log(`Creating ${useElectron ? 'Electron app' : 'browser'} shortcuts:`);
console.log(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }));
