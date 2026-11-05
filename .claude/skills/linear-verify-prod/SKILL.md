---
name: linear-verify-prod
description: Verify Linear tasks on the PRODUCTION web Portal and report back on each ticket. Reads every task (from a Linear project URL, a list of IDs, or "task này"), writes and runs a read-only Playwright verify spec per task in parallel (many workers/browsers), takes screenshots across several days of data, then on PASS posts a Vietnamese comment with a pass/fail TC table + screenshots, tags the dev, cc @tienpd @loan_dang and moves the issue to the "verified production" status; on FAIL creates one sub-task per bug, comments "Please help me fix bug" and reassigns to the dev. Use whenever the user asks to "verify lại task", "verify production", "test xem task pass chưa", "kiểm tra task Linear trên prod", or pastes a linear.app project/issue link asking to test it on the portal.
---

# Linear → Verify trên Production (Web Portal)

Người dùng đưa link project Linear (vd `https://linear.app/fastboy/project/checkout-type-setting-a7d574c39869/issues`), danh sách ID (`VP-4590, VP-4591`) hoặc "task này". Claude:

1. đọc từng task, chỉ giữ task **web Portal** (bỏ task chỉ thuộc app Volt POS),
2. viết 1 spec verify **chỉ đọc** cho mỗi task, chạy **song song nhiều worker/trình duyệt** trên **PROD**,
3. chụp ảnh minh họa trên **nhiều ngày dữ liệu**,
4. comment kết quả lên từng task (tiếng Việt) + đổi trạng thái / tạo sub-task bug.

Việc gọi skill này chính là lệnh cho phép comment/đổi trạng thái/tạo sub-task trên Linear — không cần hỏi lại từng task. Chỉ hỏi khi rơi vào các điểm "HỎI" bên dưới. Nếu người dùng nói "chạy thử / chưa comment / dry-run" → làm tới bước 5, in bản nháp comment ra chat, **không** ghi gì lên Linear.

## 0. Kiểm tra trước khi chạy

- Môi trường prod: `configs/env/.env.prod` → `BASE_URL=https://v2.fastboypay.com`, session `src/data/dynamic/auth/admin.prod.json`, data API ở subdomain `volt-pos.v2.fastboypay.com`, giờ store **UTC+7**. `STORE_ID` trong `.env.prod` đang ghi chú TODO — lần verify trước dùng store `20258`; nếu trang store load ra 404/không có data thì HỎI người dùng store id prod.
- Session: `node scripts/check-auth-session.mjs src/data/dynamic/auth/admin.prod.json`. `EXPIRED` → dừng, nhờ người dùng chạy `npm run auth:prod` (đăng nhập Google + 2FA thủ công). `WARN` → báo rồi chạy tiếp.
- Tool Linear: load bằng ToolSearch một lần: `select:mcp__linear-server__get_issue,mcp__linear-server__list_issues,mcp__linear-server__list_comments,mcp__linear-server__save_comment,mcp__linear-server__save_issue,mcp__linear-server__list_issue_statuses,mcp__linear-server__list_users,mcp__linear-server__prepare_file_upload,mcp__linear-server__extract_images`.
- **Không dùng `portal-qa` MCP để chạy song song** — nó là 1 trình duyệt dùng chung và đang trỏ session stage. Song song = Playwright spec + nhiều worker.

## 1. Lấy danh sách task

- Link project → `list_issues({ project: "<slug cuối URL, vd checkout-type-setting-a7d574c39869>", limit: 250 })` (lặp `cursor` nếu `hasNextPage`), lấy cả `status, assignee, labels, parentId, url`.
- Bỏ qua và ghi lý do (để báo cáo cuối):
  - task chỉ liên quan **app Volt POS** (label/tiêu đề/mô tả nói về app POS, màn hình trên máy POS, Electron/Android, in bill trên máy…) — không verify trên app;
  - task đã ở trạng thái verified production / Canceled / Duplicate;
  - task chưa lên prod (Backlog/Todo/In Progress) — liệt kê để người dùng biết, không verify;
  - sub-task bug do chính skill tạo lần trước (tiêu đề bắt đầu `[Bug]`) — chúng được verify cùng task cha.
- Task vừa có phần Portal vừa có phần app → chỉ verify phần Portal, ghi rõ trong comment "phần app POS chưa verify".

## 2. Đọc từng task → test case

Cho mỗi task: `get_issue` (đọc hết mô tả, Business Rules, Acceptance Criteria, `<linear-comment>` inline), `list_comments` (dev hay ghi phạm vi deploy / cách test ở đây), `extract_images` nếu mô tả có hình thiết kế.

- Nếu task đã có `### Test Cases (QC)` → dùng đúng danh sách đó, giữ số TC.
- Nếu chưa có → tự lập test case theo cách của skill `linear-test-cases` (happy path theo từng AC, mỗi business rule + biên, trạng thái UI, kiểm tra không có tác dụng phụ). Không ghi ngược vào mô tả task trừ khi người dùng yêu cầu.
- Đánh dấu TC nào **chỉ làm được trên app POS** → kết quả `N/A (app POS)`, không tính pass/fail.
- **Liên quan version update:** nếu task/project dính tới phiên bản POS (min version, trang version update, cờ bật theo version — như project Checkout Type Setting), thêm TC kiểm tra phía Portal: trang Version Update / thông tin version hiển thị đúng, tính năng hiện/ẩn đúng theo version mà ticket mô tả. Tham khảo `docs/test-cases/pos-version-update-page.md` và `docs/test-cases/<feature>.md` nếu đã có (vd `checkout-type-setting.md`).
- Xác định **dev của task** = `assignee` hiện tại; nếu assignee là QA/người dùng hiện tại (`whoami`) thì lấy người tạo PR / người comment "done/deployed" gần nhất. Lấy `displayName` qua `list_users` để mention chính xác (`@displayName`). Không đoán — không xác định được thì HỎI.

## 3. Viết spec verify (song song theo task)

Mỗi task 1 thư mục: `tests/e2e/regression-linear/_prod-verify/<vp-id>/verify-prod.e2e.spec.ts` (thư mục này là ad-hoc, không commit). Helper chung: copy [prod-verify-helpers.ts](prod-verify-helpers.ts) thành `tests/e2e/regression-linear/_prod-verify/_shared.ts` nếu chưa có.

- Nhiều task (≥3) → spawn **1 subagent / task** trong cùng một message để đọc task + viết spec song song; mỗi agent nhận: ID task, danh sách TC, đường dẫn helper, quy tắc an toàn dưới đây, thư mục ảnh. Không để agent comment Linear — chỉ viết spec và trả về đường dẫn spec.
- Mỗi TC = 1 `test('TC01 — …')`, dùng Page Object có sẵn trong `src/pages/**` + `Urls` từ `@constants/urls`; `import { test, expect } from '@fixtures/index'`.
- Gọi `await guardProd(page)` **trước** `goto` trong mọi test (chặn mọi request ghi, chỉ cho refresh token + report query `…/run`).
- Chụp ảnh bằng `shot(page, '<vp-id>-TC01-<mô-tả>', '<chú thích tiếng Việt>')` — overlay đỏ "Verified on PROD <ngày giờ UTC+7> · store #…" để ảnh tự chứng minh môi trường/thời điểm.
- **Nhiều ngày:** với mọi màn có bộ lọc ngày/kỳ (orders, reports, payroll, income, batch history, appointment…) chạy TC chính trên ít nhất 3 mốc: hôm nay, hôm qua, 1 ngày cũ hơn có dữ liệu (vd 7 ngày trước hoặc kỳ đã chốt gần nhất); chụp mỗi mốc 1 ảnh. Màn không có ngày (setting) → chụp trước/sau thao tác + 1 ảnh màn liên quan bị ảnh hưởng.
- Chỉ assert những gì ticket nói; mỗi assert kèm message tiếng Việt ngắn để đọc lỗi dễ.

### An toàn PROD (bắt buộc)

- Mặc định **chỉ đọc**: guard chặn POST/PUT/PATCH/DELETE. Cuối mỗi test `expect(blocked).toEqual([])` trừ khi TC cố tình bấm Save để chứng minh nút có gọi API (khi đó assert request bị chặn đúng endpoint).
- TC cần **lưu thật** (vd đổi Checkout Type rồi xem hiệu lực) → ưu tiên mock response (kiểu `CheckoutSettingPage.mockSettingWrites()`). Nếu bắt buộc phải lưu thật để verify → HỎI người dùng một lần cho cả lượt chạy; được đồng ý thì: chụp giá trị gốc qua API → lưu → verify → khôi phục trong `finally` → thêm 1 test kiểm tra đã khôi phục. Ghi rõ trong comment đã ghi thật và đã hoàn tác.
- Không bao giờ: Delete / Refund / Void / Charge / Payout / gửi SMS-email / Import / Logout / publish version / remote action tới máy POS.

## 4. Chạy song song

```bash
npx cross-env ENV=prod WORKERS=8 RETRIES=1 playwright test tests/e2e/regression-linear/_prod-verify --project=chromium > "<scratchpad>/verify-prod.log" 2>&1
```

- Chạy bằng Bash `run_in_background: true`, headless. `WORKERS` tối đa 8 (trên 8 server prod/dev chậm lại, không nhanh hơn). Ít task → `WORKERS = số test` nhưng ≤8.
- Đọc `reports/json/results.json` + log. Test fail → xem `test-results/**/error-context.md` + ảnh/trace, **chạy lại riêng test đó 1 lần** để phân biệt bug thật với lỗi mạng/spec sai:
  - fail do selector/spec viết sai → sửa spec, chạy lại, **không** phải bug;
  - fail lặp lại đúng chỗ ticket mô tả → **bug xác nhận**;
  - chỉ fail 1 lần / 5xx lẻ tẻ → "nghi vấn", ghi trong comment, không tạo sub-task.
- Ảnh nằm ở `reports/prod-verify/<ngày>/` (biến `SHOTS` của helper, đổi bằng `VERIFY_SHOTS`). Mở xem vài ảnh (Read) trước khi đăng để chắc ảnh đúng nội dung, không lộ dữ liệu thẻ/SSN.

## 5. Tổng hợp kết quả mỗi task

Bảng TC (tiếng Việt) — giống hình mẫu người dùng hay dùng:

```markdown
| TC   | Nội dung kiểm tra | Kết quả          | Ghi chú / ảnh                  |
| ---- | ----------------- | ---------------- | ------------------------------ |
| TC01 | …                 | ✅ Pass          | Ảnh 1, 2 (02/11, 01/11, 27/10) |
| TC02 | …                 | ❌ Fail          | Bug → VP-xxxx                  |
| TC03 | …                 | ⚪ N/A (app POS) |                                |

**Tổng: X TC — ✅ A pass · ❌ B fail · ⚪ C N/A** · Môi trường: Production Portal (v2.fastboypay.com), store #…, ngày verify …
```

Task **PASS** = mọi TC verify được đều pass (N/A không tính). Có ≥1 bug xác nhận → **FAIL**.

## 6. Upload ảnh lên Linear

Từng ảnh một (signed URL hết hạn sau 60 giây — không chuẩn bị nhiều URL trước):

1. `prepare_file_upload({ filename, contentType: "image/png", size: <số byte chính xác> })`
2. Ngay lập tức `curl -X PUT --data-binary @<file>` với **đúng nguyên văn mọi header** trong `uploadRequest.headers` tới `uploadRequest.url`.
3. Dùng `markdown`/`assetUrl` trả về để chèn `![mô tả](assetUrl)` vào comment.

Chọn lọc 4–10 ảnh/task: mỗi TC chính ≥1 ảnh, đủ các mốc ngày khác nhau.

## 7. Ghi lên Linear

Trước khi ghi: `list_comments` để tránh comment trùng (đã có comment verify của skill cho đúng lượt này thì sửa comment đó bằng `id` thay vì tạo mới).

### Task PASS

1. `save_comment({ issueId, body })`:

```markdown
I have verified that the task passed on production in the portal. Thank you @<dev>
cc @tienpd @loan_dang

**Kết quả verify trên Production (Web Portal)** — <ngày>
<bảng TC ở bước 5>

**Ảnh minh họa** (nhiều ngày dữ liệu)
![TC01 – hôm nay 03/11](…)
![TC01 – 02/11](…)
…
<nếu có: Phần app Volt POS chưa verify trong lượt này.>
```

2. Đổi trạng thái: `list_issue_statuses({ team })` → chọn status khớp `/verif.*prod/i` (vd "Verified Production" / "Verify Production"). Không có status nào khớp → HỎI người dùng, không tự chọn "Done". Rồi `save_issue({ id, state })`.

### Task FAIL

1. Mỗi bug xác nhận → 1 sub-task: `save_issue({ team: <team của task cha>, parentId: <task cha>, title: "[Bug] <mô tả ngắn tiếng Việt>", assignee: <dev>, addLabels: ["Bug"] (nếu team có label này), priority: theo mức độ, description })` với mô tả tiếng Việt:

```markdown
**Môi trường:** Production Portal (v2.fastboypay.com) · store #… · <ngày giờ UTC+7>
**Liên quan TC:** TC0x của <VP-cha>
**Các bước tái hiện:**

1. …
   **Kết quả thực tế:** …
   **Kết quả mong đợi (theo ticket):** …
   **Bằng chứng:** ![](…) · API: `GET … → 500` · console: `…`
```

Mức độ: Nghiêm trọng (sai tiền/mất dữ liệu/crash) → priority 1; chức năng chính hỏng → 2; sai nhưng có cách khác → 3; giao diện/chữ → 4. 2. Comment lên task cha:

```markdown
Please help me fix bug @<dev>
cc @tienpd @loan_dang

**Kết quả verify trên Production (Web Portal)** — <ngày>
<bảng TC>

**Bug cần sửa:**

- VP-xxxx — <tiêu đề>
- VP-yyyy — <tiêu đề>

**Ảnh minh họa**
![…](…)
```

3. Assign lại task cha cho dev: `save_issue({ id, assignee: <dev> })`. Không tự đổi trạng thái task cha (trừ khi người dùng bảo).

Phần nội dung comment/sub-task viết **tiếng Việt**; hai câu mở đầu "I have verified that the task passed on production in the portal…" và "Please help me fix bug…" giữ nguyên văn như người dùng quy định.

## 8. Kết thúc

- Không để thay đổi nào trên prod: nếu có lưu thật (đã được duyệt) → xác nhận test khôi phục pass.
- Ghi lịch sử chạy vào `docs/test-cases/<feature>.md` (mục "Lịch sử chạy", giống `run-tests-headless-bg`) nếu file tồn tại.
- Trả lời ngắn trong chat (tiếng Việt): bảng mỗi task → Pass/Fail, số TC pass/fail/N/A, link task, sub-task bug đã tạo, task đã bỏ qua và lý do, nghi vấn cần người xem lại. Không dán lại toàn bộ comment.
