---
name: linear-verify-dev
description: Verify a Linear task on the DEV web Portal (https://v2.dev-fastboypay.com). Reads the task, creates/updates the "### Test Cases (QC)" checkbox list in its description, runs every TC with Playwright on DEV recording a video of every TC, ticks the boxes that pass, and attaches one video per TC to the result comment; on PASS comments "I have verified that the task passed on dev in the portal thank you @ngan_huynh cc @tienpd @loan_dang"; on FAIL creates one sub-task per bug assigned to Ngan Huynh and comments "Please help me fix bug @ngan_huynh cc @tienpd @loan_dang" with screenshots/video. Use when the user asks to "verify task trên dev", "test task này trên dev", "đọc task cập nhật test case rồi test", "tick test case pass", or gives a Linear issue ID/URL to test on v2.dev-fastboypay.com. For PRODUCTION use `linear-verify-prod` instead.
---

# Linear → cập nhật Test Case → Verify trên DEV Portal

Input: 1 hoặc nhiều task Linear (ID `VP-1234`, URL issue, URL project, hoặc "task này" = task vừa nói trong hội thoại). **Không có ID/URL và hội thoại cũng chưa nhắc task nào → HỎI, không đoán.**

Gọi skill này = cho phép sửa mô tả task (test case + tick), comment, tạo sub-task bug trên Linear, không cần hỏi lại. Người dùng nói "dry-run / chưa ghi Linear" → làm tới bước 5, in bản nháp ra chat.

Quy ước cố định:

| Mục                            | Giá trị                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Môi trường                     | DEV Portal `https://v2.dev-fastboypay.com` = `ENV=stage` (`configs/env/.env.stage`), store `STORE_ID` trong file đó (hiện 14), giờ store UTC+7 |
| Người fix bug / người được tag | **Ngan Huynh** — mention `@ngan_huynh` (lấy user chính xác qua `list_users({ query: "ngan" })`)                                                |
| CC                             | `@tienpd @loan_dang`                                                                                                                           |
| Câu PASS (nguyên văn)          | `I have verified that the task passed on dev in the portal thank you @ngan_huynh` + dòng `cc @tienpd @loan_dang`                               |
| Câu FAIL (nguyên văn)          | `Please help me fix bug @ngan_huynh` + dòng `cc @tienpd @loan_dang`                                                                            |

Phần còn lại của comment/sub-task viết **tiếng Việt**.

## 0. Kiểm tra trước khi chạy

- Session: `node scripts/check-auth-session.mjs src/data/dynamic/auth/admin.stage.json`. `EXPIRED` → dừng, nhờ người dùng chạy `npm run auth:stage` (Google + 2FA thủ công). `WARN` → báo rồi chạy tiếp.
- Tool Linear, load 1 lần: `select:mcp__linear-server__get_issue,mcp__linear-server__list_issues,mcp__linear-server__list_comments,mcp__linear-server__save_comment,mcp__linear-server__save_issue,mcp__linear-server__list_users,mcp__linear-server__list_issue_labels,mcp__linear-server__prepare_file_upload,mcp__linear-server__extract_images`.
- Chạy song song bằng Playwright spec nhiều worker, không dùng `portal-qa` MCP (1 trình duyệt dùng chung). `portal-qa` chỉ dùng để dò selector khi viết spec.

## 1. Đọc task

`get_issue` (đọc hết mô tả, Business Rules, Acceptance Criteria, `<linear-comment>` inline) + `list_comments` (dev hay ghi phạm vi/cách test) + `extract_images` nếu có hình thiết kế. Task chỉ thuộc app Volt POS (Android/Electron, màn hình máy POS, in bill) → báo người dùng, không verify; task lẫn cả hai → chỉ verify phần Portal, TC phần app ghi `N/A (app POS)`.

## 2. Cập nhật test case vào task

Viết test case theo cách của skill `linear-test-cases` (happy path mỗi AC; mỗi business rule + biên; trạng thái UI enable/disable/ẩn; kiểm tra "không đổi" bằng so sánh trước/sau; dialog Cancel/Confirm; audit log; negative/permission). Ngôn ngữ theo ngôn ngữ task. Định dạng:

```
---

### Test Cases (QC)

**1. <Nhóm>**
- [ ] TC01: <kịch bản cụ thể + kết quả mong đợi>
```

- Chưa có mục `### Test Cases (QC)` → `save_issue({ id, patch: [{ op: "append", … }] })`.
- Đã có → **giữ nguyên số TC cũ**, sửa TC sai/lỗi thời theo mô tả + comment mới nhất, thêm TC thiếu nối tiếp số (không đánh lại số), xóa TC không còn đúng thì ghi `~~TCxx~~ (bỏ: <lý do>)` thay vì xóa mất. Dùng patch `replace`/`replace_range` trên đúng mục đó; không đụng Acceptance Criteria hay phần khác.
- TC đã được tick `[x]` từ lượt trước vẫn chạy lại; kết quả lượt này quyết định tick cuối cùng.

## 3. Viết spec verify

Thư mục ad-hoc (không commit): `tests/e2e/regression-linear/_dev-verify/<vp-id>/verify-dev.e2e.spec.ts`. Copy [dev-verify-helpers.ts](dev-verify-helpers.ts) thành `tests/e2e/regression-linear/_dev-verify/_shared.ts` nếu chưa có.

- Mỗi TC = 1 `test('TC01 — …')`; tên test bắt đầu đúng số TC để map kết quả ngược về checkbox. `import { test, expect } from '@fixtures/index'`, dùng Page Object `src/pages/**` + `Urls` từ `@constants/urls`. Có `docs/test-cases/<feature>.md` / spec cũ cùng màn thì tái dùng selector từ đó.
- Đầu mỗi test: `await guardDev(page)` (chặn remote action, SMS/email, refund/void/charge/payout, publish, logout, import), hoặc `guardReadOnly(page)` cho TC chỉ xem.
- Ngay sau guard, **trước `page.goto` đầu tiên**: `await videoStamp(page, '<vp-id> TC01')` — gắn nhãn góc dưới-trái "DEV · VP-xxxx TC01 · giờ · store" vào video của TC.
- Mỗi TC chạy trong 1 test riêng (không gộp nhiều TC vào 1 test) để video = đúng 1 TC. Thêm `await page.waitForTimeout(800)` sau thao tác quan trọng cuối (lưu, toast, kết quả) để video kịp thấy kết quả.
- Ảnh: `shot(page, '<vp-id>-TC01-<mô-tả>', '<chú thích tiếng Việt>')` — overlay xanh "Verified on DEV <ngày giờ> · store #…". Mỗi TC ≥1 ảnh; màn có bộ lọc ngày → chụp ≥2 mốc ngày có dữ liệu.
- Mỗi assert kèm message tiếng Việt ngắn.
- **Giữ session sống**: DEV xoay vòng refresh token (access token 5 phút), mà `REUSE_CONTEXT=0` tạo context mới mỗi test → test sau văng ra /login. Spec phải `test.describe.configure({ mode: 'serial' })`, thêm `test.afterEach(({ context }) => saveSession(context))`, và gọi `saveSession(ctx)` trước khi đóng mọi context tự tạo (beforeAll/afterAll).

### Ghi dữ liệu trên DEV

DEV được phép lưu thật (đổi setting, sửa record) để verify hiệu lực, nhưng phải:

1. lưu giá trị gốc (UI hoặc API) trước khi đổi,
2. khôi phục trong `finally`, và thêm 1 test cuối kiểm tra đã khôi phục,
3. dữ liệu tạo mới đặt tiền tố `e2e-` và xóa/deactivate sau test nếu Portal cho phép.
   Không bao giờ: deactivate/approve device thật, gửi remote action tới máy POS, refund/void/charge thật, gửi SMS/email cho khách, publish version, xóa dữ liệu không phải do test tạo. TC bắt buộc đụng tới những việc này → HỎI người dùng trước.

Nhiều task (≥3) → spawn 1 subagent/task trong cùng 1 message để viết spec song song (đưa: ID, danh sách TC, đường dẫn helper, quy tắc trên). Agent không ghi Linear.

## 4. Chạy (video cho MỌI TC)

Copy lại helper mỗi lần (helper có thể đã cập nhật): `cp .claude/skills/linear-verify-dev/dev-verify-helpers.ts tests/e2e/regression-linear/_dev-verify/_shared.ts`.

```bash
npx cross-env ENV=stage WORKERS=8 RETRIES=1 REUSE_CONTEXT=0 VIDEO=on playwright test tests/e2e/regression-linear/_dev-verify/<vp-id> --project=chromium > "<scratchpad>/verify-dev.log" 2>&1
```

- Bash `run_in_background: true`, headless, `WORKERS` ≤ 8. `VIDEO=on` + `REUSE_CONTEXT=0` bắt buộc — thiếu 1 trong 2 thì TC pass không có video.
- Chạy xong (kể cả sau lần chạy lại riêng 1 test — chạy lại thì gom lại cho test đó): gom video mỗi TC
  ```bash
  node .claude/skills/linear-verify-dev/collect-videos.mjs <vp-id>
  ```
  → `reports/dev-verify/<ngày>/<vp-id>-TC01.webm` (fail: `…-TC01-FAILED.webm`), in `TC  status  path  bytes`. TC nào `NO_VIDEO` → kiểm tra lại cờ VIDEO/REUSE_CONTEXT rồi chạy lại TC đó.
- Đọc `reports/json/results.json` + log. Test fail → đọc `test-results/**/error-context.md` + ảnh, **chạy lại riêng test đó 1 lần**:
  - spec/selector sai → sửa spec, chạy lại, không phải bug;
  - fail lặp lại đúng hành vi ticket mô tả → **bug xác nhận** (video đã gom ở trên + copy ảnh fail vào `reports/dev-verify/<ngày>/`);
  - fail 1 lần / 5xx lẻ tẻ → "nghi vấn", ghi trong comment, không tạo sub-task.
- Mở xem (Read) vài ảnh trước khi đăng để chắc đúng nội dung và không lộ số thẻ/SSN.

## 5. Tick test case

Cập nhật lại mục `### Test Cases (QC)` bằng patch:

- TC pass → `- [x] TC01: …`
- TC fail → giữ `- [ ] TC02: …` và thêm ` — ❌ Bug VP-xxxx` (sau khi tạo sub-task ở bước 7)
- TC N/A → `- [ ] TC03: … — ⚪ N/A (app POS)` / nghi vấn → ` — ⚠️ nghi vấn, cần xem lại`

## 6. Upload ảnh / video lên Linear

Từng file một (signed URL hết hạn sau 60 giây):

1. `prepare_file_upload({ filename, contentType: "image/png" | "video/webm", size: <số byte chính xác> })`
2. Ngay lập tức `curl -X PUT --data-binary @<file>` với **nguyên văn mọi header** trong `uploadRequest.headers` tới `uploadRequest.url`.
3. Ghi lại `assetUrl` theo TC; chèn vào mục "Bằng chứng từng TC" dưới bảng (bước 7): `![mô tả](assetUrl)` cho ảnh, `[▶ Video TC02](assetUrl)` cho video.

**Upload video của MỌI TC** (pass lẫn fail, trừ N/A), không chỉ TC fail. `size` = số byte collect-videos in ra. Video > 50 MB → báo người dùng, không upload. Nhiều file → lần lượt từng file (prepare → PUT ngay), không prepare hàng loạt rồi mới PUT.

## 7. Ghi kết quả lên Linear

Trước khi ghi: `list_comments` — đã có comment verify DEV của lượt này thì sửa comment đó (`id`) thay vì tạo mới. Sau khi sửa, **kiểm tra `updatedAt` trong kết quả**: nếu không đổi (Linear MCP có lúc bỏ qua lệnh sửa comment dài có ảnh) → tạo comment mới, rồi hỏi người dùng có xóa comment cũ không (không tự xóa).

Bảng kết quả (dùng trong cả 2 trường hợp) — **chỉ chữ, KHÔNG để link video/ảnh trong ô bảng** (khó nhìn):

```markdown
| TC   | Nội dung kiểm tra | Kết quả          | Ghi chú     |
| ---- | ----------------- | ---------------- | ----------- |
| TC01 | …                 | ✅ Pass          |             |
| TC02 | …                 | ❌ Fail          | Bug VP-xxxx |
| TC03 | …                 | ⚪ N/A (app POS) |             |

**Tổng: X TC — ✅ A pass · ❌ B fail · ⚪ C N/A** · Môi trường: DEV Portal (v2.dev-fastboypay.com), store #…, ngày verify …
```

Bằng chứng đặt **bên dưới bảng**, mục `**Bằng chứng từng TC**`, mỗi TC (trừ N/A) một khối theo thứ tự số TC — ảnh hiện trực tiếp, video là link ngay dưới ảnh:

```markdown
**Bằng chứng từng TC**

**TC01 — <tên ngắn>** ✅
![TC01 – <chú thích>](assetUrl-ảnh)
[▶ Video TC01](assetUrl-video)

**TC02 — <tên ngắn>** ❌ Bug VP-xxxx
![TC02 – <chú thích>](assetUrl-ảnh)
[▶ Video TC02](assetUrl-video)
```

- TC không có ảnh riêng → chỉ dòng video. TC có ≥2 ảnh → đặt các ảnh liền nhau rồi mới tới video.
- Dùng `assetUrl` trả về từ `prepare_file_upload` (không có `?signature=…`), không copy URL đã ký từ comment cũ.

### PASS (mọi TC verify được đều pass)

`save_comment({ issueId, body })`:

```markdown
I have verified that the task passed on dev in the portal thank you @ngan_huynh
cc @tienpd @loan_dang

**Kết quả verify trên DEV (Web Portal)** — <ngày>
<bảng>

**Ghi chú:** (nếu có — quan sát cần PO xác nhận, cách lưu khác mô tả…)

**Bằng chứng từng TC**
<khối ảnh + video của từng TC>
```

Không tự đổi trạng thái task (trừ khi người dùng bảo).

### FAIL (≥1 bug xác nhận)

1. Mỗi bug → 1 sub-task: `save_issue({ team: <team task cha>, parentId: <task cha>, title: "[Bug] <mô tả ngắn tiếng Việt>", assignee: <Ngan Huynh>, labels: ["Bug"] (nếu team có), priority, description })`:

```markdown
**Môi trường:** DEV Portal (v2.dev-fastboypay.com) · store #… · <ngày giờ UTC+7>
**Liên quan TC:** TC0x của <VP-cha>
**Các bước tái hiện:**

1. …
   **Kết quả thực tế:** …
   **Kết quả mong đợi (theo ticket):** …
   **Bằng chứng:** ![](…) · [Video](…) · API: `GET … → 500` · console: `…`
```

Priority: sai tiền/mất dữ liệu/crash → 1; chức năng chính hỏng → 2; sai nhưng có cách khác → 3; giao diện/chữ → 4. 2. Comment lên task cha (kèm ảnh **và video** của bug):

```markdown
Please help me fix bug @ngan_huynh
cc @tienpd @loan_dang

**Kết quả verify trên DEV (Web Portal)** — <ngày>
<bảng>

**Bug cần sửa:**

- VP-xxxx — <tiêu đề>

**Bằng chứng từng TC**
<khối ảnh + video của từng TC — TC fail đặt lên đầu>
```

3. Quay lại bước 5 để gắn `— ❌ Bug VP-xxxx` vào TC fail. Không tự đổi assignee/trạng thái task cha trừ khi người dùng bảo.

## 8. Kết thúc

- Xác nhận dữ liệu DEV đã khôi phục (test "đã khôi phục" pass).
- Nếu có `docs/test-cases/<feature>.md` → thêm dòng vào mục "Lịch sử chạy".
- Trả lời ngắn trong chat (tiếng Việt): mỗi task Pass/Fail, số TC pass/fail/N/A, số TC đã thêm/sửa trong mô tả, sub-task bug đã tạo, nghi vấn cần người xem lại. Không dán lại toàn bộ comment.
