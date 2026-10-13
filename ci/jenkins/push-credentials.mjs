/**
 * Nạp 2 credential Secret-file vào Jenkins bằng 1 lệnh — thay cho bước bấm tay
 * trong UI (docs/jenkins-getting-started.md Phần D3).
 *
 *   portal-pos-env-<env>            ← configs/env/.env.<env>
 *   portal-pos-storage-state-<env> ← src/data/dynamic/auth/admin.json
 *
 * Đây đúng chỗ build #1 chết (stage "Provision env" đỏ vì chưa có credential).
 * Script idempotent: credential đã tồn tại thì xoá rồi tạo lại (create-or-replace),
 * nên refresh session xong chỉ cần chạy lại đúng lệnh này.
 *
 * Dùng:
 *   # Lấy API token: Jenkins → góc phải tên user → Configure → API Token → Add
 *   $env:JENKINS_USER="admin"
 *   $env:JENKINS_TOKEN="<api-token>"
 *   node ci/jenkins/push-credentials.mjs stage
 *
 * Biến môi trường:
 *   JENKINS_URL    mặc định http://localhost:8090
 *   JENKINS_USER   bắt buộc — user admin đã tạo ở wizard
 *   JENKINS_TOKEN  bắt buộc — API token (hoặc JENKINS_PASSWORD = mật khẩu login)
 *
 * Tham số dòng lệnh:
 *   <env>          stage | prod | local  (mặc định stage, khớp default TARGET_ENV
 *                  của Jenkinsfile). Cũng đọc từ TARGET_ENV nếu không truyền.
 *
 * Secret-file KHÔNG tạo được bằng JSON thường như các credential khác: nội dung
 * file phải đi qua multipart/form-data, và trường `json` tham chiếu tới part
 * `file0` — đúng cách form trong UI submit. Đó là lý do script này tồn tại thay
 * vì một lệnh curl ngắn.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const C = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function die(msg) {
  console.error(`\n${C.r('✗')} ${msg}\n`);
  process.exit(1);
}

// ── Cấu hình ────────────────────────────────────────────────────────────────
const JENKINS_URL = (process.env.JENKINS_URL || 'http://localhost:8090').replace(/\/+$/, '');
const USER = process.env.JENKINS_USER;
const TOKEN = process.env.JENKINS_TOKEN || process.env.JENKINS_PASSWORD;
const ENV = (process.argv[2] || process.env.TARGET_ENV || 'stage').trim();

if (!['stage', 'prod', 'local'].includes(ENV)) {
  die(`Môi trường không hợp lệ: '${ENV}'. Chọn một trong: stage, prod, local.`);
}
if (!USER || !TOKEN) {
  die(
    'Thiếu thông tin đăng nhập Jenkins.\n\n' +
      '  Lấy API token: Jenkins → góc phải (tên user) → Configure → API Token → Add new Token\n\n' +
      '  PowerShell:\n' +
      '    $env:JENKINS_USER="admin"\n' +
      '    $env:JENKINS_TOKEN="<api-token>"\n' +
      `    node ci/jenkins/push-credentials.mjs ${ENV}`,
  );
}

// ci/jenkins/ → gốc repo. import.meta.dirname chạy đúng trên cả Windows lẫn POSIX.
const repoRoot = path.resolve(import.meta.dirname, '..', '..');

// Cặp credential ↔ file. Giữ khớp tuyệt đối với Jenkinsfile:
//   def envCred   = "portal-pos-env-${params.TARGET_ENV}"
//   def stateCred = "portal-pos-storage-state-${params.TARGET_ENV}"
//   STORAGE_STATE = 'src/data/dynamic/auth/admin.json'
const CREDENTIALS = [
  {
    id: `portal-pos-env-${ENV}`,
    file: path.join(repoRoot, 'configs', 'env', `.env.${ENV}`),
    fileName: `.env.${ENV}`,
    description: `Portal POS — biến môi trường cho ENV=${ENV} (.env.${ENV})`,
  },
  {
    id: `portal-pos-storage-state-${ENV}`,
    file: path.join(repoRoot, 'src', 'data', 'dynamic', 'auth', 'admin.json'),
    fileName: 'admin.json',
    description: `Portal POS — session đăng nhập cho ENV=${ENV} (admin.json)`,
  },
];

const authHeader = 'Basic ' + Buffer.from(`${USER}:${TOKEN}`).toString('base64');
const STORE = `${JENKINS_URL}/credentials/store/system/domain/_`;

// ── Kiểm tra file trước khi gọi mạng ────────────────────────────────────────
for (const c of CREDENTIALS) {
  if (!fs.existsSync(c.file)) {
    const hint =
      c.fileName === 'admin.json'
        ? 'Chụp session: npm run auth (đăng nhập Google + 2FA bằng tay)'
        : `Tạo file: copy configs/env/.env.example → ${path.relative(repoRoot, c.file)} rồi điền giá trị thật`;
    die(`Không tìm thấy ${path.relative(repoRoot, c.file)}\n  → ${hint}`);
  }
}

// Session hết hạn là lỗi hay gặp nhất ở stage Preflight. Cảnh báo sớm ngay đây
// thay vì để build chạy 6 phút rồi mới đỏ — nhưng KHÔNG chặn: đôi khi vẫn muốn
// push để test cơ chế credential.
warnIfSessionExpired();

// ── Thực thi ────────────────────────────────────────────────────────────────
console.log(`\nJenkins : ${JENKINS_URL}`);
console.log(`User    : ${USER}`);
console.log(`Env     : ${ENV}\n`);

const { crumbField, crumbValue, cookie } = await getCrumb();

for (const c of CREDENTIALS) {
  await createOrReplace(c, { crumbField, crumbValue, cookie });
}

console.log(`\n${C.g('✓')} Xong. 2 credential đã sẵn sàng cho build với TARGET_ENV=${C.g(ENV)}:`);
for (const c of CREDENTIALS) console.log(`    ${c.id}`);
console.log(
  `\n  Bước tiếp: Jenkins → job portal-pos-e2e → Build with Parameters → TARGET_ENV=${ENV}.` +
    `\n  ${C.dim('Stage "Provision env" giờ sẽ xanh. Nếu session đã hết hạn, Preflight sẽ báo chạy lại npm run auth.')}\n`,
);

// ── Hàm phụ ─────────────────────────────────────────────────────────────────

async function getCrumb() {
  // CSRF protection bật mặc định: POST thiếu crumb → 403 "No valid crumb".
  // Crumb gắn với session, nên phải giữ lại cookie từ chính request này.
  let res;
  try {
    res = await fetch(`${JENKINS_URL}/crumbIssuer/api/json`, {
      headers: { Authorization: authHeader },
    });
  } catch (err) {
    die(
      `Không kết nối được Jenkins ở ${JENKINS_URL}: ${err.message}\n` +
        '  → Docker Desktop đã chạy chưa? docker ps có thấy container "jenkins" (0.0.0.0:8090->8080) không?',
    );
  }

  const cookie = extractCookie(res);

  if (res.status === 401) {
    die('Sai user hoặc API token (401). Kiểm tra JENKINS_USER / JENKINS_TOKEN.');
  }
  if (res.status === 404) {
    // CSRF bị tắt — hiếm, nhưng khi đó không cần crumb.
    console.log(C.y('⚠ Crumb issuer trả 404 — coi như CSRF đã tắt, gửi request không kèm crumb.'));
    return { crumbField: null, crumbValue: null, cookie };
  }
  if (!res.ok) {
    die(`Lấy crumb thất bại: HTTP ${res.status}. ${await safeText(res)}`);
  }

  const data = await res.json();
  return { crumbField: data.crumbRequestField, crumbValue: data.crumb, cookie };
}

async function createOrReplace(cred, ctx) {
  const exists = await credentialExists(cred.id);
  if (exists) {
    console.log(`${C.y('↻')} ${cred.id} đã tồn tại — xoá rồi tạo lại.`);
    await deleteCredential(cred.id, ctx);
  }
  await createCredential(cred, ctx);

  if (!(await credentialExists(cred.id))) {
    die(`Tạo ${cred.id} xong nhưng kiểm tra lại không thấy — xem log Jenkins.`);
  }
  console.log(`${C.g('✓')} ${cred.id}  ${C.dim('← ' + cred.fileName)}`);
}

async function credentialExists(id) {
  const res = await fetch(`${STORE}/credential/${encodeURIComponent(id)}/api/json`, {
    headers: { Authorization: authHeader },
  });
  return res.status === 200;
}

async function deleteCredential(id, { crumbField, crumbValue, cookie }) {
  const res = await fetch(`${STORE}/credential/${encodeURIComponent(id)}/doDelete`, {
    method: 'POST',
    headers: withCsrf({ Authorization: authHeader }, crumbField, crumbValue, cookie),
    redirect: 'manual',
  });
  // 302 (redirect về trang store) hoặc 200 đều là xoá xong.
  if (![200, 302, 303].includes(res.status)) {
    die(`Xoá credential cũ ${id} thất bại: HTTP ${res.status}. ${await safeText(res)}`);
  }
}

async function createCredential(cred, { crumbField, crumbValue, cookie }) {
  const bytes = fs.readFileSync(cred.file);

  // `json` mô tả credential; `"file": "file0"` trỏ sang part file0 trong cùng
  // multipart. Đây chính là payload mà form "Add Credentials" trong UI gửi đi.
  const json = {
    '': '4',
    credentials: {
      file: 'file0',
      scope: 'GLOBAL',
      id: cred.id,
      description: cred.description,
      staplerClass: 'org.jenkinsci.plugins.plaincredentials.impl.FileCredentialsImpl',
      $class: 'org.jenkinsci.plugins.plaincredentials.impl.FileCredentialsImpl',
    },
  };

  const form = new FormData();
  // file0 trước, json sau — mirror thứ tự field trong DOM form của UI.
  form.append('file0', new Blob([bytes]), cred.fileName);
  form.append('json', JSON.stringify(json));

  // KHÔNG tự set Content-Type: để fetch sinh boundary multipart đúng.
  const res = await fetch(`${STORE}/createCredentials`, {
    method: 'POST',
    headers: withCsrf({ Authorization: authHeader }, crumbField, crumbValue, cookie),
    body: form,
    redirect: 'manual',
  });

  if (res.status === 403) {
    die(`Tạo ${cred.id} bị 403 (crumb/CSRF). Thử lại; nếu vẫn lỗi kiểm tra plugin credentials.`);
  }
  if (![200, 302, 303].includes(res.status)) {
    die(`Tạo ${cred.id} thất bại: HTTP ${res.status}. ${await safeText(res)}`);
  }
}

function withCsrf(headers, crumbField, crumbValue, cookie) {
  const h = { ...headers };
  if (crumbField && crumbValue) h[crumbField] = crumbValue;
  if (cookie) h.Cookie = cookie;
  return h;
}

function extractCookie(res) {
  // Giữ JSESSIONID để crumb còn hợp lệ ở các request sau (fetch không tự quản cookie).
  const all = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  if (all.length === 0) {
    const single = res.headers.get('set-cookie');
    if (single) return single.split(';')[0];
    return null;
  }
  return all.map((c) => c.split(';')[0]).join('; ');
}

function warnIfSessionExpired() {
  const stateFile = CREDENTIALS[1].file;
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const rt = (state.cookies || []).find((c) => c.name === 'refreshToken');
    if (rt && rt.expires && rt.expires * 1000 < Date.now()) {
      const when = new Date(rt.expires * 1000).toISOString();
      console.log(
        C.y(
          `\n⚠ Cảnh báo: session trong admin.json đã HẾT HẠN (refreshToken expired ${when}).\n` +
            '  Vẫn push được, nhưng stage Preflight sẽ đỏ. Chạy lại `npm run auth` rồi push lại để build xanh.',
        ),
      );
    }
  } catch {
    /* không parse được thì bỏ qua — createCredential vẫn push nội dung thô */
  }
}

async function safeText(res) {
  try {
    const t = await res.text();
    return t ? t.slice(0, 300) : '';
  } catch {
    return '';
  }
}
