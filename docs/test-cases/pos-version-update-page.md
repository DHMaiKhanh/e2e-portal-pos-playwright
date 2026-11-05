# VP-2691 — Bỏ popup auto update, thêm trang Version Update (POS)

> Bỏ popup auto update gây gián đoạn; thay bằng trang **Version Update** trong menu POS hiển thị Current / Latest
> version, release notes và cho phép update ngay tại đó. Khi có bản mới chỉ hiện toast không chặn màn hình. Phần POS là
> **VP-2787**; bug con **VP-5102** (toast "Update failed" tràn, nút Update Now bị che). ID test case: `TC-VP2691-NN`.

|                    |                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ticket**         | [VP-2691](https://linear.app/fastboy/issue/VP-2691) — QC Completed · [VP-2787](https://linear.app/fastboy/issue/VP-2787) (POS) — QC Completed · [VP-5102](https://linear.app/fastboy/issue/VP-5102) — QC Completed |
| **PR**             | volt-pos #3157 (fix VP-5102); PR chính của VP-2787 không ghi trong Linear                                                                                                                                          |
| **Nền tảng**       | Windows                                                                                                                                                                                                            |
| **Màn hình**       | POS › menu trái › **Version Update** (dialog, URL `?dialog=version-update`); toast góc phải trên                                                                                                                   |
| **Môi trường**     | POS Windows dev (đã test 1.1.57 và 1.1.59)                                                                                                                                                                         |
| **Tự động hoá**    | Không — app POS, test tay                                                                                                                                                                                          |
| **Tổng test case** | 14                                                                                                                                                                                                                 |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** mục Version Update trong menu; trạng thái Up to Date / Checking / có bản mới / lỗi mạng; toast
  "A New Update is Available"; luồng Update Now (confirm, đang update, lỗi download, bản mới bị gỡ); toast "Update
  failed" (VP-5102).
- **Ngoài phạm vi:** cài đặt bản mới thật (server dev không có bản mới hơn bản đang chạy).
- **Chưa xác nhận:** luồng force-update (`deprecated: true` → `/force-update`) — VP-2787 nêu là câu hỏi cần confirm
  với PO/BE, chưa có kết quả trong Linear (TC-14).
- **Dữ liệu / giả lập:** server dev không có bản mới hơn bản đang test, nên các case "có bản mới" phải giả lập kết quả
  check update ngay trong app (bản = version hiện tại + 1, có release notes) và cho bước download trả lỗi (vd 500).
  Các case TC-01 → TC-04, TC-10 chạy với server dev thật.

---

## B. Test case

### B1. Không còn popup, trạng thái đã mới nhất

#### TC-VP2691-01 — Menu có mục Version Update · P1

| Bước | Thao tác      | Kết quả mong đợi                                            |
| ---- | ------------- | ----------------------------------------------------------- |
| 1    | Đăng nhập POS |                                                             |
| 2    | Mở menu trái  | Có mục "Version Update", footer hiện đúng version đang chạy |

#### TC-VP2691-02 — Trạng thái đã là bản mới nhất · P1

| Bước | Thao tác                | Kết quả mong đợi                                                                      |
| ---- | ----------------------- | ------------------------------------------------------------------------------------- |
| 1    | Server không có bản mới |                                                                                       |
| 2    | Menu → Version Update   | Hiện "You're Up to Date", Current version đúng bản đang chạy, không có nút Update Now |

#### TC-VP2691-03 — Kiểm tra lại bằng nút refresh · P2

| Bước | Thao tác                                 | Kết quả mong đợi                                          |
| ---- | ---------------------------------------- | --------------------------------------------------------- |
| 1    | Đang mở Version Update, bấm icon refresh | Hiện "Checking for Updates" → quay về "You're Up to Date" |

#### TC-VP2691-04 — Không còn popup auto update · P1

| Bước | Thao tác                                        | Kết quả mong đợi                         |
| ---- | ----------------------------------------------- | ---------------------------------------- |
| 1    | Reload app                                      | Không có popup/dialog update nào bật lên |
| 2    | Chuyển qua Appointment, Scanner, Pending Orders | Không có popup/dialog update nào bật lên |

### B2. Có bản mới

#### TC-VP2691-05 — Có bản mới: chỉ hiện toast, không chặn màn hình · P1

| Bước | Thao tác                                   | Kết quả mong đợi                                                  |
| ---- | ------------------------------------------ | ----------------------------------------------------------------- |
| 1    | App phát hiện bản mới (giả lập)            | Toast "A New Update is Available" ở góc phải, không có popup chặn |
| 2    | Chuyển trang Order History, Pending Orders | POS vẫn thao tác bình thường                                      |
| 3    | Đóng toast (X), chuyển trang tiếp          | Toast không hiện lại khi chuyển trang                             |

#### TC-VP2691-06 — Trang Version Update hiển thị đủ thông tin · P1

| Bước | Thao tác              | Kết quả mong đợi                                                                                               |
| ---- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | Menu → Version Update | Hiện "A New Update is Available", Current version, Latest version, Description (release notes), nút Update Now |

#### TC-VP2691-07 — Bấm Update Now → Cancel · P2

| Bước | Thao tác       | Kết quả mong đợi                           |
| ---- | -------------- | ------------------------------------------ |
| 1    | Bấm Update Now | Hiện confirm "Update to version <latest>?" |
| 2    | Bấm Cancel     | Confirm đóng, không download               |

#### TC-VP2691-08 — Update Now → download lỗi → toast lỗi gọn trong khung · P1 · VP-5102

| Bước | Thao tác                                | Kết quả mong đợi                                                                                                |
| ---- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1    | Bấm Update Now → xác nhận Update Now    | Hiện "Software Updating"                                                                                        |
| 2    | Download bị lỗi (mất mạng / server lỗi) | Toast "Update failed. Please try again." nằm gọn trong khung, có nút X                                          |
| 3    | Đo toast trên màn hình 1920×1080        | 2 nút **Update Later** / **Update Now** nằm trong toast, chữ 20px, không tràn ra ngoài màn hình, đủ lớn để chạm |

#### TC-VP2691-09 — Bản mới bị gỡ trước khi cài · P2

| Bước | Thao tác                                          | Kết quả mong đợi                                                             |
| ---- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | Mở trang khi có bản mới, sau đó server bỏ bản mới |                                                                              |
| 2    | Bấm Update Now → xác nhận                         | Toast "No update is currently available.", trang quay về "You're Up to Date" |

#### TC-VP2691-10 — Đóng trang Version Update · P3

| Bước | Thao tác | Kết quả mong đợi                                                   |
| ---- | -------- | ------------------------------------------------------------------ |
| 1    | Bấm X    | Dialog đóng, URL bỏ `?dialog=version-update`, quay lại màn hình cũ |

#### TC-VP2691-11 — Mất mạng khi kiểm tra · P2

| Bước | Thao tác                                  | Kết quả mong đợi                                                                                             |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1    | Ngắt mạng (hoặc giả lập lỗi), bấm refresh | Hiện "Couldn't Check for Updates – Check the network connection and try again", không báo sai là đã mới nhất |

#### TC-VP2691-12 — Menu báo có bản mới · P2

| Bước | Thao tác                 | Kết quả mong đợi                      |
| ---- | ------------------------ | ------------------------------------- |
| 1    | Có bản mới, mở menu trái | Mục "Version Update" có icon cảnh báo |

#### TC-VP2691-13 — Toast lỗi: thử lại / Update Later / X · P1 · VP-5102

| Bước | Thao tác                                 | Kết quả mong đợi                                                                       |
| ---- | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| 1    | Toast lỗi đang hiện → bấm **Update Now** | Toast đóng, chạy lại "Software Updating" và download lại (lỗi tiếp thì toast hiện lại) |
| 2    | Lỗi lại → bấm **Update Later**           | Toast đóng, trang Version Update vẫn còn bản mới và nút Update Now                     |
| 3    | Lỗi lại → bấm **X**                      | Toast đóng giống Update Later, bản mới vẫn còn                                         |

#### TC-VP2691-14 — Luồng force-update không bị ảnh hưởng · P2

| Bước | Thao tác                                                | Kết quả mong đợi                                                   |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| 1    | Giả lập version hiện tại bị đánh dấu `deprecated: true` | POS vẫn chuyển sang `/force-update` như trước (cần PO/BE xác nhận) |

---

## C. Kết quả QC trên Linear

**26/10/2026 — POS dev 1.1.57** (comment trên VP-2691, 11 case, giả lập bản 1.1.58): **10 pass / 1 fail**.

- FAIL TC-08: toast "Update failed" tràn ra ngoài (toast x = 1274–1896, Update Later x = 1814–1901 chữ 12px, Update
  Now x = 1907–1991 nằm ngoài màn hình 1920px) → tách bug **VP-5102**.

**26/10/2026 — POS dev 1.1.59** (comment trên VP-2691, VP-2787, VP-5102, giả lập bản 1.1.60): **13/13 pass**.

| Test case          | Kết quả                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| TC-VP2691-01 … -07 | PASS                                                                                       |
| TC-VP2691-08       | PASS — toast x = 1220–1896, Update Later x = 1326–1448, Update Now x = 1480–1598, chữ 20px |
| TC-VP2691-09 … -13 | PASS (VP-5102: 4/4 pass — BUG-01 … BUG-04 tương ứng TC-08 và 3 bước của TC-13)             |
| TC-VP2691-14       | Chưa có kết quả QC                                                                         |

- Không có bug mở. Cả 3 ticket ở trạng thái QC Completed.

## Lịch sử chạy

### 2026-10-26 (UTC+7)

- POS Windows dev 1.1.57: 10 pass, 1 fail (TC-08 → VP-5102).
- POS Windows dev 1.1.59 (có PR #3157): 13/13 pass (TC-01 … -13). TC-14 chưa chạy.
