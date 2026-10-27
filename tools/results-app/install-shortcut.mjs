/**
 * Adds a "Portal POS Test Results" shortcut to the Desktop and Start Menu (Windows).
 * Double-click opens the results app (Electron, no console window, no localhost).
 *
 *   npm run results:shortcut
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') {
  console.error('Shortcuts are Windows-only. Use `npm run results` instead.');
  process.exit(1);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const exe = path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe');
if (!fs.existsSync(exe)) {
  console.error('Electron chưa được cài. Chạy `npm install` rồi thử lại.');
  process.exit(1);
}

const q = (s) => s.replace(/'/g, "''");
const ps = `
$sh = New-Object -ComObject WScript.Shell
$dirs = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))
foreach ($d in $dirs) {
  $lnk = $sh.CreateShortcut((Join-Path $d 'Portal POS Test Results.lnk'))
  $lnk.TargetPath = '${q(exe)}'
  $lnk.Arguments = '"${q(path.join(HERE, 'main.cjs'))}"'
  $lnk.WorkingDirectory = '${q(ROOT)}'
  $lnk.IconLocation = '${q(path.join(HERE, 'icon.ico'))}'
  $lnk.Description = 'Xem kết quả Playwright E2E của Portal POS'
  $lnk.Save()
  Write-Output "  + $($lnk.FullName)"
}`;
console.log('Creating shortcuts:');
console.log(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }));
