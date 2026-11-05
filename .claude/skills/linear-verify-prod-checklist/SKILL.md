---
name: linear-verify-prod-checklist
description: Verify a Linear task on the PRODUCTION web Portal (https://v2.fastboypay.com) using a test-case checklist kept in the task itself. Reads the task, creates/updates the "### Test Cases (QC)" checkbox list in its description, runs every TC with read-only Playwright on PROD, ticks the boxes that pass; on PASS comments "I have verified that the task passed on production in the portal thank you @ngan_huynh cc @tienpd @loan_dang"; on FAIL creates one sub-task per bug assigned to Ngan Huynh and comments "Please help me fix bug @ngan_huynh cc @tienpd @loan_dang" with screenshots/video. Use when the user asks to verify a task on production AND wants the test cases updated/ticked in the task, or wants bugs assigned to Ngan Huynh ("đọc task cập nhật test case rồi test trên production", "tick test case pass trên prod", "verify prod assign ngan huynh"). For DEV use `linear-verify-dev`; for a whole project with dev-of-task tagging and status change use `linear-verify-prod`.
---

# Linear → cập nhật Test Case → Verify trên PRODUCTION Portal

Giống `linear-verify-dev` nhưng chạy trên **PROD** và **mặc định chỉ đọc**. Input: ID `VP-1234`, URL issue/project, hoặc "task này" (task vừa nói trong hội thoại). **Không có ID/URL và hội thoại chưa nhắc task nào → HỎI, không đoán.**

Gọi skill này = cho phép sửa mô tả task (test case + tick), comment, tạo sub-task bug trên Linear, không cần hỏi lại. "dry-run / chưa ghi Linear" → làm tới bước 5, in bản nháp ra chat.

| Mục                            | Giá trị                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Môi trường                     | PROD Portal `https://v2.fastboypay.com` = `ENV=prod` (`configs/env/.env.prod`), store test **#20258 "VOLT POS"**, data ở `volt-pos.v2.fastboypay.com`, giờ store UTC+7 |
| Người fix bug / người được tag | **Ngan Huynh** — `@ngan_huynh` (lấy user chính xác qua `list_users({ query: "ngan" })`)                                                                                |
| CC                             | `@tienpd @loan_dang`                                                                                                                                                   |
| Câu PASS (nguyên văn)          | `I have verified that the task passed on production in the portal thank you @ngan_huynh` + dòng `cc @tienpd @loan_dang`                                                |
| Câu FAIL (nguyên văn)          | `Please help me fix bug @ngan_huynh` + dòng `cc @tienpd @loan_dang`                                                                                                    |

Phần còn lại của comment/sub-task viết **tiếng Việt**.

## 0. Kiểm tra trước khi chạy

- Session: `node scripts/check-auth-session.mjs src/data/dynamic/auth/admin.prod.json`. `EXPIRED` → dừng, nhờ người dùng chạy `npm run auth:prod` (Google + 2FA thủ công). `WARN` → báo rồi chạy tiếp.
- Tool Linear, load 1 lần: `select:mcp__linear-server__get_issue,mcp__linear-server__list_issues,mcp__linear-server__list_comments,mcp__linear-server__save_comment,mcp__linear-server__save_issue,mcp__linear-server__list_users,mcp__linear-server__list_issue_labels,mcp__linear-server__prepare_file_upload,mcp__linear-server__extract_images`.
- Không dùng `portal-qa` MCP để chạy (trình duyệt dùng chung, đang trỏ session stage).

## 1. Đọc task

`get_issue` (mô tả, Business Rules, Acceptance Criteria, `<linear-comment>` inline) + `list_comments` + `extract_images` nếu có hình. Task chỉ thuộc app Volt POS → báo người dùng, không verify; task lẫn cả hai → chỉ verify phần Portal, TC phần app ghi `N/A (app POS)`. Task chưa deploy prod (Todo/In Progress/chưa có comment deploy) → báo người dùng trước khi chạy.

## 2. Cập nhật test case vào task

Theo cách của skill `linear-test-cases` (happy path mỗi AC; mỗi business rule + biên; trạng thái UI; so sánh trước/sau cho "không đổi"; dialog Cancel/Confirm; audit log; negative/permission). Ngôn ngữ theo task. Định dạng:

```
---

### Test Cases (QC)

**1. <Nhóm>**
- [ ] TC01: <kịch bản cụ thể + kết quả mong đợi>
```

- Chưa có mục → `save_issue({ id, patch: [{ op: "append", … }] })`.
- Đã có (vd từ lượt verify DEV) → **giữ số TC cũ**, sửa TC lỗi thời, thêm TC thiếu nối tiếp số, TC bỏ ghi `~~TCxx~~ (bỏ: <lý do>)`. Patch `replace`/`replace_range` đúng mục đó; không đụng phần khác.
- Tick `[x]` từ lượt DEV trước **reset về `[ ]`** rồi tick lại theo kết quả PROD lượt này; thêm dòng `_Kết quả PROD <ngày>_` dưới heading để phân biệt.
- TC chỉ làm được bằng thao tác ghi không hoàn tác được trên PROD (tạo order thật, refund, gửi remote action…) → ghi `— ⚪ N/A (không test được trên prod: <lý do>)`.

## 3. Viết spec verify

Thư mục ad-hoc (không commit): `tests/e2e/regression-linear/_prod-verify/<vp-id>/verify-prod.e2e.spec.ts`. Helper: copy [../linear-verify-prod/prod-verify-helpers.ts](../linear-verify-prod/prod-verify-helpers.ts) thành `tests/e2e/regression-linear/_prod-verify/_shared.ts` nếu chưa có.

- Mỗi TC = 1 `test('TC01 — …')` (tên bắt đầu đúng số TC để map về checkbox). `import { test, expect } from '@fixtures/index'`, dùng Page Object `src/pages/**` + `Urls`; tái dùng selector từ spec DEV (`_dev-verify/<vp-id>`) / `docs/test-cases/<feature>.md` nếu có.
- `await guardProd(page)` **trước** `goto` trong mọi test; cuối test `expect(blocked).toEqual([])` (trừ TC cố tình bấm Save để chứng minh nút gọi đúng API → assert request bị chặn đúng endpoint).
- Ảnh: `shot(page, '<vp-id>-TC01-<mô-tả>', '<chú thích tiếng Việt>')` — overlay đỏ "Verified on PROD <ngày giờ> · store #20258". Mỗi TC ≥1 ảnh; màn có bộ lọc ngày → chụp ≥3 mốc (hôm nay, hôm qua, 1 ngày cũ có dữ liệu).

### An toàn PROD (bắt buộc)

- Mặc định chỉ đọc; TC cần thấy hiệu lực sau khi lưu → ưu tiên mock response.
- Bắt buộc lưu thật → HỎI người dùng 1 lần cho cả lượt; được đồng ý: lưu giá trị gốc → lưu → verify → khôi phục trong `finally` → thêm test kiểm tra đã khôi phục; ghi rõ trong comment.
- Không bao giờ: Delete / Refund / Void / Charge / Payout / gửi SMS-email / Import / Logout / publish version / remote action / approve-deactivate device.

## 4. Chạy (có video)

```bash
npx cross-env ENV=prod WORKERS=8 RETRIES=1 REUSE_CONTEXT=0 VIDEO=retain-on-failure playwright test tests/e2e/regression-linear/_prod-verify/<vp-id> --project=chromium > "<scratchpad>/verify-prod.log" 2>&1
```

- Bash `run_in_background: true`, headless, `WORKERS` ≤ 8. `REUSE_CONTEXT=0` để có video test fail.
- Đọc `reports/json/results.json` + log. Fail → đọc `test-results/**/error-context.md` + ảnh, **chạy lại riêng test đó 1 lần**:
  - spec/selector sai → sửa, chạy lại, không phải bug;
  - fail lặp lại đúng hành vi ticket mô tả → **bug xác nhận** (copy `video.webm` + ảnh vào `reports/prod-verify/<ngày>/`);
  - fail 1 lần / 5xx lẻ tẻ → "nghi vấn", không tạo sub-task.
- Mở xem (Read) vài ảnh trước khi đăng: đúng nội dung, không lộ số thẻ/SSN/thông tin khách thật (che nếu cần bằng `highlight`/crop).

## 5. Tick test case

Patch lại mục `### Test Cases (QC)`:

- pass → `- [x] TC01: …`
- fail → `- [ ] TC02: … — ❌ Bug VP-xxxx` (gắn số sau bước 7)
- N/A → `— ⚪ N/A (…)` · nghi vấn → `— ⚠️ nghi vấn, cần xem lại`

## 6. Upload ảnh / video lên Linear

Từng file một (signed URL hết hạn sau 60 giây):

1. `prepare_file_upload({ filename, contentType: "image/png" | "video/webm", size: <số byte chính xác> })`
2. Ngay lập tức `curl -X PUT --data-binary @<file>` với **nguyên văn mọi header** trong `uploadRequest.headers` tới `uploadRequest.url`.
3. Chèn `![mô tả](assetUrl)` cho ảnh, `[Video TC02](assetUrl)` cho video.

## 7. Ghi kết quả lên Linear

Trước khi ghi: `list_comments` — đã có comment verify PROD của lượt này thì sửa (`id`) thay vì tạo mới.

```markdown
| TC   | Nội dung kiểm tra | Kết quả | Ghi chú / ảnh |
| ---- | ----------------- | ------- | ------------- |
| TC01 | …                 | ✅ Pass | Ảnh 1, 2      |
| TC02 | …                 | ❌ Fail | Bug VP-xxxx   |
| TC03 | …                 | ⚪ N/A  | lý do         |

**Tổng: X TC — ✅ A pass · ❌ B fail · ⚪ C N/A** · Môi trường: Production Portal (v2.fastboypay.com), store #20258, ngày verify …
```

### PASS (mọi TC verify được đều pass)

```markdown
I have verified that the task passed on production in the portal thank you @ngan_huynh
cc @tienpd @loan_dang

**Kết quả verify trên Production (Web Portal)** — <ngày>
<bảng>

**Ảnh minh họa**
![TC01 – …](…)
```

Không tự đổi trạng thái task trừ khi người dùng bảo (nếu bảo: `list_issue_statuses` → status khớp `/verif.*prod/i`; không có → HỎI).

### FAIL (≥1 bug xác nhận)

1. Mỗi bug → 1 sub-task: `save_issue({ team: <team task cha>, parentId: <task cha>, title: "[Bug][PROD] <mô tả ngắn tiếng Việt>", assignee: <Ngan Huynh>, labels: ["Bug"] (nếu team có), priority, description })`:

```markdown
**Môi trường:** Production Portal (v2.fastboypay.com) · store #20258 · <ngày giờ UTC+7>
**Liên quan TC:** TC0x của <VP-cha>
**Các bước tái hiện:**

1. …
   **Kết quả thực tế:** …
   **Kết quả mong đợi (theo ticket):** …
   **Bằng chứng:** ![](…) · [Video](…) · API: `GET … → 500` · console: `…`
```

Priority: sai tiền/mất dữ liệu/crash → 1; chức năng chính hỏng → 2; có cách khác → 3; giao diện/chữ → 4. 2. Comment lên task cha (ảnh **và video** của bug):

```markdown
Please help me fix bug @ngan_huynh
cc @tienpd @loan_dang

**Kết quả verify trên Production (Web Portal)** — <ngày>
<bảng>

**Bug cần sửa:**

- VP-xxxx — <tiêu đề>

**Ảnh / video minh họa**
![TC02 – …](…)
[Video TC02](…)
```

3. Quay lại bước 5 gắn `— ❌ Bug VP-xxxx`. Không tự đổi assignee/trạng thái task cha trừ khi người dùng bảo.

## 8. Kết thúc

- Không để thay đổi nào trên prod: nếu có lưu thật (đã duyệt) → xác nhận test khôi phục pass.
- Có `docs/test-cases/<feature>.md` → thêm dòng vào "Lịch sử chạy".
- Trả lời ngắn trong chat (tiếng Việt): Pass/Fail, số TC pass/fail/N/A, số TC thêm/sửa trong mô tả, sub-task bug đã tạo, nghi vấn. Không dán lại toàn bộ comment.
