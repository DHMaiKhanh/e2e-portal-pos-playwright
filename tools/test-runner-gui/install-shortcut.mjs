/**
 * Adds "Portal POS Test Runner" shortcuts to the Desktop and Start Menu
 * (Windows). Double-click opens the GUI as a desktop window.
 *
 *   npm run gui:shortcut
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') {
  console.error('Shortcuts are Windows-only. Use `npm run gui:app` instead.');
  process.exit(1);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const q = (s) => s.replace(/'/g, "''");
const ps = `
$sh = New-Object -ComObject WScript.Shell
$dirs = @([Environment]::GetFolderPath('Desktop'), (Join-Path ([Environment]::GetFolderPath('Programs')) ''))
foreach ($d in $dirs) {
  $lnk = $sh.CreateShortcut((Join-Path $d 'Portal POS Test Runner.lnk'))
  $lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"
  $lnk.Arguments = '"${q(path.join(HERE, 'launch.vbs'))}"'
  $lnk.WorkingDirectory = '${q(path.resolve(HERE, '../..'))}'
  $lnk.IconLocation = '${q(path.join(HERE, 'icon.ico'))}'
  $lnk.Description = 'Chọn và chạy Playwright E2E test cho Portal POS'
  $lnk.Save()
  Write-Output "  + $($lnk.FullName)"
}`;
console.log('Creating shortcuts:');
console.log(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }));
