/**
 * Human label for a test folder (tests/e2e/<folder>): the folder name in title case, plus the
 * Vietnamese name in brackets when docs/test-cases/<folder>.md has one in its first heading,
 * e.g. "customers" → "Customers (Khách hàng)". Folder names are unique, so labels are too.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const cache = new Map();

function folderLabel(folder) {
  if (cache.has(folder)) return cache.get(folder);
  let label =
    folder === 'setup'
      ? 'Chuẩn bị (đăng nhập)'
      : folder
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
  try {
    const md = fs.readFileSync(path.join(ROOT, 'docs', 'test-cases', `${folder}.md`), 'utf8');
    // Only a bracket that is actually Vietnamese (has diacritics), not "(headless)" etc.
    const vi = md.match(/^#\s+.*?\(([^)]+)\)/m)?.[1];
    if (vi && /[^\x00-\x7f]/.test(vi.replace(/[—·]/g, ''))) {
      label += ` (${vi.replace(/\s+—.*$/, '').trim()})`;
    }
  } catch {
    /* no doc for this folder */
  }
  cache.set(folder, label);
  return label;
}

module.exports = { folderLabel };
