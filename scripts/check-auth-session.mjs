/**
 * Kiểm tra session đăng nhập Portal (storageState) còn sống được bao lâu nữa,
 * KHÔNG chạy test. Dùng cho job nightly `portal-pos-session-health` trên Jenkins
 * để báo sớm "cần npm run auth:stage" thay vì để cả suite đỏ hàng loạt khi session chết
 * (xem docs/auth-session-expiry-issue.md — đã từng 112 fail chỉ vì lý do này).
 *
 * Dùng:
 *   node scripts/check-auth-session.mjs [path-to-storage-state.json]
 *   npm run auth:check
 *
 * Đường dẫn file: argv[2] > $STORAGE_STATE > src/data/dynamic/auth/admin.json
 * Ngưỡng cảnh báo sớm: $AUTH_WARN_DAYS ngày (mặc định 3).
 *
 * Mã thoát (Jenkinsfile.session-health map thẳng sang trạng thái build):
 *   0  OK      — còn > ngưỡng cảnh báo
 *   2  WARN    — sắp hết hạn (trong ngưỡng) → build UNSTABLE, nên auth lại sớm
 *   1  EXPIRED — đã hết hạn / không đọc được / không xác định được → build FAILURE
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const C = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const WARN_DAYS = Number(process.env.AUTH_WARN_DAYS || 3);
const DAY = 24 * 60 * 60 * 1000;

const stateFile = path.resolve(
  process.argv[2] || process.env.STORAGE_STATE || 'src/data/dynamic/auth/admin.json',
);

function exit(code, msg) {
  const tag = code === 0 ? C.g('[OK]') : code === 2 ? C.y('[WARN]') : C.r('[EXPIRED]');
  console.log(`${tag} ${msg}`);
  process.exit(code);
}

if (!fs.existsSync(stateFile)) {
  exit(1, `Không thấy file session: ${stateFile}\n  → Chụp lại: npm run auth:stage (hoặc auth:prod)`);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
} catch (err) {
  exit(1, `File session hỏng, không parse được JSON (${stateFile}): ${err.message}\n  → Chụp lại: npm run auth:stage (hoặc auth:prod)`);
}

// Session lưu dạng Playwright storageState: cookies[] có `expires` (giây epoch;
// -1 = session cookie, không hết hạn theo thời gian). refreshToken là cái quyết
// định phiên còn sống hay không — mirror logic ở ci/jenkins/push-credentials.mjs.
const cookies = Array.isArray(state.cookies) ? state.cookies : [];
const refresh = cookies.find((c) => c.name === 'refreshToken');

if (!refresh || typeof refresh.expires !== 'number' || refresh.expires <= 0) {
  // Không có refreshToken hết-hạn-theo-thời-gian: không khẳng định được còn sống.
  // Coi là WARN để có người nhìn lại, chứ không fail cứng.
  exit(2, 'Không tìm thấy refreshToken có hạn trong session — không xác định được còn hiệu lực. Nên auth lại cho chắc.');
}

const expiresMs = refresh.expires * 1000;
const now = Date.now();
const when = new Date(expiresMs).toISOString();
const msLeft = expiresMs - now;

if (msLeft <= 0) {
  const agoDays = Math.ceil(-msLeft / DAY);
  exit(1, `Session ĐÃ HẾT HẠN (refreshToken expired ${when}, ~${agoDays} ngày trước).\n  → Chạy: npm run auth:stage (hoặc auth:prod)  rồi: npm run jenkins:creds <env>`);
}

const daysLeft = Math.floor(msLeft / DAY);
if (daysLeft <= WARN_DAYS) {
  exit(2, `Session SẮP HẾT HẠN: còn ~${daysLeft} ngày (hết hạn ${when}).\n  → Nên auth lại sớm: npm run auth:stage (hoặc auth:prod)  rồi: npm run jenkins:creds <env>`);
}

exit(0, `Session còn hiệu lực ~${daysLeft} ngày (hết hạn ${when}). ${C.dim('Ngưỡng cảnh báo: ' + WARN_DAYS + ' ngày.')}`);
