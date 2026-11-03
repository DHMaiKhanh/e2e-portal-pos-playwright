# VP-5483 — Category cũ được đổi sang bảng màu Staff (Portal + BE)

> Bug con của [VP-5338](category-color-palette.md): picker đã đổi sang 15 màu Staff, nhưng category tạo từ trước vẫn giữ
> màu trong bảng 20 màu cũ. BE viết command đổi màu (map 20 màu cũ → màu Staff, PR volt-pos-api#1609) chạy cho mọi
> tiệm. Spec: `tests/e2e/regression-linear/vp-5338.e2e.spec.ts` (ID giữ theo spec cha: `TC-VP5338-07` … `-10`).

|                     |                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**          | [VP-5483](https://linear.app/fastboy/issue/VP-5483) — QC Testing · cha [VP-5338](https://linear.app/fastboy/issue/VP-5338) |
| **PR**              | volt-pos-api #1609 (command remap màu category)                                                                            |
| **Màn hình**        | Management › **Services** — danh sách category (cột trái) và dialog _Edit category_; dữ liệu `GET /categories`             |
| **Môi trường**      | DEV Portal `https://v2.dev-fastboypay.com`, store `#14`, session `admin.stage.json`                                        |
| **Chạy**            | `ENV=stage npx playwright test tests/e2e/regression-linear/vp-5338.e2e.spec.ts -g "TC-VP5338-(07\|08\|09\|10)"`            |
| **Ghi dữ liệu DEV** | **Không** — request ghi bị mock 200; ca -10 chỉ giả lập response `GET` trong trình duyệt                                   |
| **Tổng test case**  | 4 (+ 1 ca POS test tay)                                                                                                    |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** `colorHex` đã lưu của mọi category (active + inactive), chấm màu ở danh sách, cách dialog Edit hiển
  thị category chưa có màu / còn màu cũ.
- **Ngoài phạm vi tự động:** tile Category trên Home POS (ca POS bên dưới — test tay).
- **Thứ tự release (theo BE, comment 02/11):** FE lên trước → BE chạy command (dry-run rồi apply) → chạy lại 1 lần sau khi
  các máy POS update xong, để dọn category do máy POS cũ tạo lại bằng màu cũ.
- **Dữ liệu trước khi remap (QC 02/11 sáng):** 24 category Active còn màu cũ, vd `rgb(46,228,217)`, `rgb(231,79,120)`,
  `rgb(227,99,172)`, `rgb(242,187,59)`… (Product, The Signature Spa Combo, Artificial Nails, Hand Care, Specialty & Art,
  Gel & Acrylic Services…).
- **Dữ liệu khi quét (02/11 chiều):** mọi category active có màu đều đã thuộc bảng Staff (vd Hand Care = Yellow
  `#F8D885`, Skincare = Sky blue `#9DDDF9`); 9 category có `colorHex = null` (nail, ZZdupCat, test2…) hiển thị **Peach**.

Bảng 15 màu Staff: xem [category-color-palette.md](category-color-palette.md#a-phạm-vi--dữ-liệu).

---

## B. Test case

#### TC-VP5338-07 — Mọi category đã lưu dùng màu trong bảng Staff · High

| Bước | Thao tác                                         | Kết quả mong đợi                                                   |
| ---- | ------------------------------------------------ | ------------------------------------------------------------------ |
| 1    | `GET /categories` (active + inactive, mọi trang) |                                                                    |
| 2    | So `colorHex` của từng category với 15 mã Staff  | Mọi `colorHex` khác `null` đều thuộc bảng Staff (không còn màu cũ) |

#### TC-VP5338-08 — Chấm màu ở danh sách khớp màu đã lưu · Medium

| Bước | Thao tác                                          | Kết quả mong đợi                                                        |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Services, tab Active — đọc chấm màu từng category | Chấm màu = `colorHex` đã lưu; category `colorHex = null` hiện **Peach** |

#### TC-VP5338-09 — Category chưa có màu: Edit chọn sẵn Peach · Medium

| Bước | Thao tác                             | Kết quả mong đợi                               |
| ---- | ------------------------------------ | ---------------------------------------------- |
| 1    | Edit 1 category có `colorHex = null` | Có 15 ô (không thêm ô lạ), **Peach** được chọn |

#### TC-VP5338-10 — Category còn màu cũ: hiện thành ô riêng, vẫn chọn được 15 màu Staff · Medium

| Bước | Thao tác                                                      | Kết quả mong đợi                                                        |
| ---- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Giả lập API trả `colorHex: "#36BFF2"` (màu cũ) cho 1 category |                                                                         |
| 2    | Mở Edit category đó                                           | Ô màu cũ đứng **đầu** và đang được chọn; 15 ô Staff vẫn còn đủ phía sau |
| 3    | Chọn Mint → **Save changes**                                  | `PUT` gửi `colorHex: "#83F0CC"`                                         |

> Dữ liệu DEV không còn category màu cũ sau lệnh remap, nên ca này giả lập response `GET` (chỉ đổi dữ liệu trả về
> trình duyệt, không ghi gì lên server).

### Test tay trên POS

#### TC-VP5483-POS-01 — Home POS: tile Category cũ cùng tông màu với Staff · High

| Bước | Thao tác                                                                                        | Kết quả mong đợi                                              |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | BE đã chạy command remap; POS đã sync                                                           |                                                               |
| 2    | Mở Home POS, so tile Category cũ (Hand Care, Artificial Nails, Specialty & Art…) với tile Staff | Category cũ dùng màu Staff, không còn tông đậm chỏi với Staff |

---

## C. Kết quả QC trên Linear

- **02/11/2026 (QC, Portal dev, POS 1.1.57/1.1.87):** TC-6 trong comment VP-5338 **Fail** — 24 category Active còn màu cũ →
  log VP-5483. Ca POS (TC-05 của VP-5338) chưa test được vì command remap chưa chạy (Hand Care `#F2BB3B`, Artificial
  Nails `#E363AC`).

## Lịch sử chạy

### 2026-11-02 (UTC+7)

- Lệnh: `ENV=stage npx playwright test tests/e2e/regression-linear/vp-5338.e2e.spec.ts --retries=0 --reporter=list`
- Kết quả 4 ca của file này: **3 passed, 1 failed**
- Pass: TC-VP5338-08, -09, -10 → mọi category **active** đã đúng màu Staff, chấm màu ở list khớp dữ liệu.
- Fail — **lỗi dữ liệu thật**:
  - TC-VP5338-07 — category **inactive** `ZZ VP-5115 test` còn `colorHex = #999999`. Màu này không nằm trong 20 màu cũ
    của bảng map nên command remap bỏ qua. Cần BE quyết: map thêm màu lạ về một màu Staff, hay chấp nhận.
- Dữ liệu DEV sau khi chạy: không đổi.

### 2026-11-03 (UTC+7) — re-test

- Lệnh: `ENV=stage npx playwright test tests/e2e/regression-linear/vp-5338.e2e.spec.ts -g "TC-VP5338-07" --retries=0 --reporter=list`
- Kết quả: **vẫn FAIL** — category **inactive** `ZZ VP-5115 test` (type `service`) còn `colorHex = #999999`.
- Category này tạo 26/10 14:37 UTC, sửa lần cuối 26/10 15:17 UTC — **trước** lệnh remap (02/11 08:00 UTC) và không bị lệnh
  chạm tới: command chỉ map 20 màu cũ (và/hoặc chỉ quét category active), `#999999` không nằm trong bảng map.
- QC trên Linear kiểm 41 category **active** → 0 màu cũ (PASS); ca tự động quét cả active + inactive nên bắt được ca này.
  Cần BE/PO quyết: map thêm màu ngoài bảng (và category inactive) về màu Staff, hay chấp nhận.
- Đã log bug **[VP-5502](https://linear.app/fastboy/issue/VP-5502)** (03/11, con của VP-5338, kèm ảnh tab Inactive + dialog Edit).
