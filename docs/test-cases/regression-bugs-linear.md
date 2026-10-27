# Bug hồi quy từ Linear — Test case & spec

> Test case gốc cho 5 bug Portal trên Linear chưa có test chống tái phát. Mỗi bug một spec trong
> `tests/e2e/regression-linear/vp-<id>.e2e.spec.ts`. ID test case: `TC-VP<id>-NN`.

|                     |                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Ticket**          | VP-3787 · VP-2687 · VP-2688 · VP-4093 · VP-4086                                                         |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#100004`, session `src/data/dynamic/auth/admin.json` |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear`                                             |
| **Ngày quét DOM**   | 2026-10-20 (script chỉ đọc, chặn request ghi; riêng import có gửi thật — xem B2)                        |
| **Ghi dữ liệu DEV** | Có, cho VP-3787 / VP-2687 / VP-2688 — **ghi thật rồi hoàn tác** (đã thống nhất)                         |
| **Tổng test case**  | 9                                                                                                       |

**Mục lục**

- [A. Tổng quan](#a-tổng-quan)
- [B. Test case](#b-test-case)
- [C. Chạy test tự động](#c-chạy-test-tự-động)

---

## A. Tổng quan

| Ticket                                              | Màn hình                                  | Trạng thái Linear | Spec                  | Ghi dữ liệu?             | Kết quả quét DEV (2026-10-20)                     |
| --------------------------------------------------- | ----------------------------------------- | ----------------- | --------------------- | ------------------------ | ------------------------------------------------- |
| [VP-3787](https://linear.app/fastboy/issue/VP-3787) | Staff Detail (`/staffs/<id>?tab=profile`) | Done              | `vp-3787.e2e.spec.ts` | Có — toggle rồi trả lại  | Đã fix: `PUT` gửi kèm `role: "/roles/<id>"`       |
| [VP-2687](https://linear.app/fastboy/issue/VP-2687) | Staff Members › Import                    | Done              | `vp-2687.e2e.spec.ts` | Có — server phải từ chối | Đã fix: `Employee Code <code> already exists`     |
| [VP-2688](https://linear.app/fastboy/issue/VP-2688) | Staff Members › Import                    | Done              | `vp-2688.e2e.spec.ts` | Có — server phải từ chối | Đã fix: `<phone> is not a valid phone number.`    |
| [VP-4093](https://linear.app/fastboy/issue/VP-4093) | Store Settings › Payment & Transactions   | Ready to Review   | `vp-4093.e2e.spec.ts` | Không                    | **Chưa fix**: id `card`, `cash`, `other` bị trùng |
| [VP-4086](https://linear.app/fastboy/issue/VP-4086) | Internal › Monitor (Syncing, Background)  | Ready to Review   | `vp-4086.e2e.spec.ts` | Không                    | Đã fix: sheet hiện Merchant đúng                  |

### Những điều phát hiện khi quét

- **Toggle Status / Appointment Staff lưu ngay** (`PUT /staffs/<id>` với toàn bộ bản ghi), không có nút Save.
  Switch: `#staff-status-toggle` ("Toggle staff status"), `#staff-booking-toggle` ("Toggle appointment booking").
- **Click vào dòng** ở Staff Members không mở chi tiết; phải click vào tên (nickname).
- **Import Staff**: chọn file chỉ xem trước ở client ("N rows ready to import"). Mọi kiểm tra chạy ở server khi bấm
  **Confirm import** → `POST /import/staff` (multipart) → `ImportResult { importedCount, failedCount, errors.member[].errors[{key, message}] }`.
  Dòng lỗi: banner "1 of 1 rows have errors — fix them in your file and re-upload", nút "Show error in <cột>" trên ô sai,
  **Confirm import** bị khoá.
- File phải đúng header của **Download template** (`staffs-import-template.csv`, 18 cột, có BOM), nếu không: "This file
  doesn't match the Staff import template".
- **Phone hợp lệ phải có dạng `+1XXXXXXXXXX`** như template. `4155550115` (10 số, không `+1`) cũng bị báo "not a valid
  phone number" — vì vậy test VP-2687 dùng `+14155550115` để dòng chỉ sai ở code.
- Settings › Payment & Transactions: label "Cash" (Point value) trỏ vào **switch** Cash của Payment Methods vì cùng
  `id="cash"`; tương tự `card` và `other`.

---

## B. Test case

### B1. VP-3787 — Toggle Status / Appointment Staff xoá mất Role

**Mô tả bug:** Ở Staff Detail, bật/tắt Status hoặc Appointment Staff làm Role của staff bị set về `null` → staff mất
toàn bộ permission theo role, `role_id = NULL` bị đẩy sang central/POS, không undo được.

**Dữ liệu:** staff đầu tiên trong danh sách Active có Role (helper `openStaffWithRole(page, 0)`).
**Hoàn tác:** toggle lại về trạng thái ban đầu; `finally` so sánh với snapshot `GET /staffs/<id>`, khác thì `PUT` snapshot.

#### TC-VP3787-01 — Bật/tắt Status không xoá Role

| Bước | Thao tác                                | Kết quả mong đợi                                                                           |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1    | Mở chi tiết staff có Role, ghi lại role | Trang chi tiết hiển thị, `GET /staffs/<id>` có `role`                                      |
| 2    | Click switch **Status**                 | Gửi `PUT /staffs/<id>` 2xx; body có `status` đã đổi và `role` = IRI role cũ (không `null`) |
| 3    | Reload trang                            | `GET` trả `role.id` như cũ; tab **Role & permissions** hiển thị đúng tên role              |
| 4    | Click **Status** lần nữa                | `PUT` 2xx; `status` về giá trị ban đầu; `role` vẫn là IRI cũ                               |
| 5    | Đọc lại bản ghi                         | Bản ghi giống hệt snapshot ban đầu                                                         |

#### TC-VP3787-02 — Bật/tắt Appointment Staff không xoá Role

Như TC-VP3787-01, thao tác trên switch **Appointment Staff** (`isAllowBooking`).

### B2. VP-2687 — Import trùng Employee Code vẫn thành công

**Mô tả bug:** Import file có Employee Code trùng staff đã có → hệ thống vẫn import và **ghi đè** toàn bộ thông tin staff đó,
thay vì báo lỗi.

**Dữ liệu:** staff có Role thứ 2 trong danh sách (`openStaffWithRole(page, 1)` — tránh đụng staff VP-3787 đang toggle song
song). Dòng CSV dùng đúng code, nickname, role, email của staff đó, phone hợp lệ `+14155550115`.
**Hoàn tác:** nếu bug quay lại và staff bị ghi đè, `finally` `PUT` lại snapshot.

#### TC-VP2687-01 — Import 1 dòng trùng code bị từ chối

| Bước | Thao tác                                                    | Kết quả mong đợi                                                                                                                              |
| ---- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Staff Members › **Import**, chọn file CSV 1 dòng trùng code | Xem trước "1 rows ready to import"                                                                                                            |
| 2    | **Confirm import**                                          | `POST /import/staff`: `importedCount = 0`, `failedCount = 1`, lỗi duy nhất `key = staffCode`, message "Employee Code `<code>` already exists" |
| 3    | Quan sát dialog                                             | Banner "1 of 1 rows have errors"; nút "Show error in Employee Code (*)"; **Confirm import** bị khoá                                           |
| 4    | Đọc lại staff có sẵn                                        | Không thay đổi so với snapshot                                                                                                                |

### B3. VP-2688 — Employee Phone không được validate (>10 chữ số)

**Mô tả bug:** File import có Employee Phone nhiều hơn 10 chữ số vẫn import thành công, số bị lưu sai dạng
(`3.45679E+11`).

**Dữ liệu:** staff mới, code 4 chữ số chưa dùng (`unusedStaffCode`), nickname `E2E-VP2688-<code>`.
**Hoàn tác:** nếu bug quay lại và staff được tạo, `finally` xoá bằng `removeStaffViaApi` (DELETE, fallback inactive).

#### TC-VP2688-01 — Phone `+1` + 12 chữ số (dạng template) bị từ chối

| Bước | Thao tác                                   | Kết quả mong đợi                                                                                             |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 1    | Import file 1 dòng, phone `+1415555011512` | Xem trước "1 rows ready to import"                                                                           |
| 2    | **Confirm import**                         | `importedCount = 0`, `failedCount = 1`, lỗi duy nhất `key = phone`, message "… is not a valid phone number." |
| 3    | Quan sát dialog                            | Banner lỗi; nút "Show error in Employee Phone (*)"; **Confirm import** bị khoá                               |
| 4    | Tìm code mới trong Staff Members           | Không có staff nào                                                                                           |

#### TC-VP2688-02 — Phone 12 chữ số không `+1` (như bước tái hiện trong ticket) bị từ chối

Như TC-VP2688-01 với phone `415555011512`.

### B4. VP-4093 — Tab Payment & Transactions có 2 field cùng id

**Mô tả bug:** Field Point value và switch payment method của Cash cùng dùng `id="cash"`; label "Cash" của Point value
trỏ nhầm sang switch (click label / screen reader tới sai control). Cùng lỗi với `card`, `other`.

**Dữ liệu:** chỉ đọc, không nhập, không Save.

#### TC-VP4093-01 — Không có id nào bị dùng cho 2 phần tử

Mở `Store Settings ?tab=payment-transactions` → mọi `id` (trừ id `radix-*` tự sinh) chỉ xuất hiện 1 lần.

#### TC-VP4093-02 — Mỗi `label[for]` trỏ tới đúng một control

Mọi `label[for=X]` có đúng 1 phần tử `#X`.

#### TC-VP4093-03 — Nhãn "Cash" của Point value gắn với ô nhập

| Bước | Thao tác                               | Kết quả mong đợi                                                              |
| ---- | -------------------------------------- | ----------------------------------------------------------------------------- |
| 1    | Tìm control theo tên accessible "Cash" | Đúng 1 switch "Cash" (Payment Methods) và đúng 1 textbox "Cash" (Point value) |
| 2    | Click label "Cash" của Point value     | Textbox được focus; switch Cash giữ nguyên `aria-checked`                     |

### B5. VP-4086 — Sheet chi tiết Monitor không hiện merchant

**Mô tả bug:** Sheet chi tiết sync log và background task trên trang Monitor hiển thị Merchant "—" do không còn đọc
merchant id từ link API trả về.

**Dữ liệu:** chỉ đọc; dòng mới nhất của mỗi tab. Skip có lý do nếu tab rỗng.

#### TC-VP4086-01 — Tab Syncing: Merchant trong sheet đúng

| Bước | Thao tác                                   | Kết quả mong đợi                                             |
| ---- | ------------------------------------------ | ------------------------------------------------------------ |
| 1    | Mở `/pos/nail/admin/monitor?tab=sync-data` | Bảng có dữ liệu; ghi lại Merchant (tên + `#id`) của dòng đầu |
| 2    | Click dòng đầu                             | Sheet "Sync log detail" mở                                   |
| 3    | Đọc trường **Merchant**                    | Khác "—", hiển thị tên + `#id`, khớp với dòng trong bảng     |

#### TC-VP4086-02 — Tab Background tasks: Merchant trong sheet đúng

Như TC-VP4086-01 với `?tab=background-task`.

---

## C. Chạy test tự động

| Spec                  | Test case                  | Ghi dữ liệu DEV |
| --------------------- | -------------------------- | --------------- |
| `vp-3787.e2e.spec.ts` | TC-VP3787-01, TC-VP3787-02 | Có, hoàn tác    |
| `vp-2687.e2e.spec.ts` | TC-VP2687-01               | Có (bị từ chối) |
| `vp-2688.e2e.spec.ts` | TC-VP2688-01, TC-VP2688-02 | Có (bị từ chối) |
| `vp-4093.e2e.spec.ts` | TC-VP4093-01, -02, -03     | Không           |
| `vp-4086.e2e.spec.ts` | TC-VP4086-01, -02          | Không           |

Page object dùng chung: `ImportStaffDialog`, `StaffDetailPage.statusToggle` (`src/pages/staffs/StaffsPage.ts`),
`MonitorPage` (`src/pages/monitor/MonitorPage.ts`), helper `tests/e2e/regression-linear/helpers.ts`.

## Lịch sử chạy

### 2026-10-20 (UTC+7)

- Lệnh: `ENV=stage WORKERS=4 npx playwright test tests/e2e/regression-linear --retries=2 --reporter=list`
- Kết quả: **7 passed, 3 failed** (tổng 10 TC, chưa tính setup)
- Pass: TC-VP3787-01, TC-VP3787-02, TC-VP2687-01, TC-VP2688-01, TC-VP2688-02, TC-VP4086-01, TC-VP4086-02
- Fail (đúng do bug, VP-4093 đang **Ready to Review**, fix chưa lên DEV):
  - TC-VP4093-01 · Không có id nào bị dùng cho 2 phần tử — `card`, `cash`, `other` mỗi id dùng cho 1 switch + 1 input
  - TC-VP4093-02 · Mỗi label[for] trỏ tới đúng một control — label `card`/`cash`/`other` có 2 đích
  - TC-VP4093-03 · Nhãn "Cash" của Point value gắn với ô nhập — switch Cash có accessible name "Cash Cash"
- Dữ liệu DEV sau khi chạy: staff dùng cho VP-3787 / VP-2687 trùng khớp snapshot (test tự assert); không có staff
  `E2EVP<code>` nào được tạo.
- Ghi chú ổn định: một lần chạy với 8 worker, mọi trang không render trong 30 giây (accessibility tree chỉ còn
  "Notifications") → lỗi môi trường DEV, chạy lại với 4 worker + `--retries=2` thì sạch.
- Report chi tiết: `npm run report` (reports/html)
