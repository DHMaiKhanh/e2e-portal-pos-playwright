# VP-4538 — POS hỗ trợ Campaign Reminder, New Client, Birthday (POS)

> Kiểm tra POS đã dùng được 3 loại Campaign tạo trên DTS: **Reminder**, **New Client**, **Birthday** — khách có
> campaign thì khi add vào order trên POS phải thấy promotion tương ứng để apply. ID test case: `TC-VP4538-NN`.

|                    |                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4538](https://linear.app/fastboy/issue/VP-4538) — QC Completed                                 |
| **PR**             | Không ghi trong Linear                                                                             |
| **Nền tảng**       | Windows / Android (Linear không ghi rõ nền tảng đã test)                                           |
| **Màn hình**       | POS › tạo order / checkin–checkout › chọn customer › danh sách Promotion; DTS › Campaign, Customer |
| **Môi trường**     | DEV, tiệm `14`, `100004`, `19388`                                                                  |
| **Tự động hoá**    | Không — app POS, test tay                                                                          |
| **Tổng test case** | 9                                                                                                  |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** promotion của campaign New Client, Birthday, Reminder hiển thị và apply được trên POS; đồng bộ
  customer giữa POS và DTS (điều kiện để New Client chạy).
- **Ngoài phạm vi:** tạo/cấu hình campaign trên DTS; gửi SMS.
- **Dữ liệu:** tiệm 14 và 100004 (New Client, sync customer); tiệm #19388 (campaign tạo trước khi tiệm onboard, đã được
  snap lại dữ liệu).

### Quy tắc / lưu ý từ Linear

- **New Client:** DTS tạo mã New Client cho khách mới. Bug cũ: mã đồng bộ về POS trước thông tin khách nên không gắn
  được với khách → POS không thấy (dev đã fix).
- **Birthday:** campaign phải **gửi SMS** tới SĐT khách; khách dùng đúng SĐT đó để checkin/checkout thì mới thấy
  Birthday để apply. Tiệm 14 không mua SMS → không thấy Birthday là **đúng rule**.
- **Reminder:** Linear không mô tả rule riêng.
- **Sync customer bị kẹt (22/10):** đổi tên customer group trên DTS trùng tên group đã có ("QA Group" → "QA Group
  Edit") làm kẹt toàn bộ sync customer DTS → POS. Không đổi tên group trùng khi test.

---

## B. Test case

### B1. New Client

#### TC-VP4538-01 — Khách tạo trên POS thấy promo New Client · Critical

| Bước | Thao tác                                                | Kết quả mong đợi                              |
| ---- | ------------------------------------------------------- | --------------------------------------------- |
| 1    | Tiệm có campaign New Client bật; tạo khách mới trên POS |                                               |
| 2    | Chờ sync sang DTS; kiểm tra khách trên DTS              | DTS có khách và có promo New Client           |
| 3    | Trên POS add khách vào order                            | POS hiển thị Promotion New Client (giống DTS) |

#### TC-VP4538-02 — Khách tạo trên DTS sync về POS và có promo New Client · High

| Bước | Thao tác               | Kết quả mong đợi        |
| ---- | ---------------------- | ----------------------- |
| 1    | Tạo khách mới trên DTS |                         |
| 2    | POS tìm khách          | Khách có trên POS       |
| 3    | Add khách vào order    | Có Promotion New Client |

#### TC-VP4538-03 — Khách cũ không thấy New Client · Medium

| Bước | Thao tác                                   | Kết quả mong đợi              |
| ---- | ------------------------------------------ | ----------------------------- |
| 1    | Add khách đã có lịch sử vào order trên POS | Không có Promotion New Client |

### B2. Birthday

#### TC-VP4538-04 — Khách nhận SMS Birthday thấy promo khi checkin/checkout · High

| Bước | Thao tác                                                         | Kết quả mong đợi                    |
| ---- | ---------------------------------------------------------------- | ----------------------------------- |
| 1    | Tiệm có mua SMS, campaign Birthday bật, khách có birthday hợp lệ | SMS Birthday được gửi tới SĐT khách |
| 2    | Checkin/checkout order bằng **đúng SĐT** đó trên POS             | Thấy promo Birthday và apply được   |

#### TC-VP4538-05 — Tiệm không mua SMS không thấy Birthday · Medium

| Bước | Thao tác                                       | Kết quả mong đợi                    |
| ---- | ---------------------------------------------- | ----------------------------------- |
| 1    | Tiệm 14 (không mua SMS), campaign Birthday bật |                                     |
| 2    | Checkin/checkout khách đủ điều kiện birthday   | Không có promo Birthday (đúng rule) |

#### TC-VP4538-06 — Dùng SĐT khác không thấy Birthday · Medium

| Bước | Thao tác                                          | Kết quả mong đợi        |
| ---- | ------------------------------------------------- | ----------------------- |
| 1    | Khách đã nhận SMS Birthday; checkin bằng SĐT khác | Không có promo Birthday |

### B3. Reminder & dữ liệu

#### TC-VP4538-07 — Khách có campaign Reminder thấy promo trên POS · High

| Bước | Thao tác                                  | Kết quả mong đợi              |
| ---- | ----------------------------------------- | ----------------------------- |
| 1    | Khách được campaign Reminder gán trên DTS |                               |
| 2    | Add khách vào order trên POS              | Có promo Reminder, apply được |

#### TC-VP4538-08 — Apply promo campaign vào order · Medium

| Bước | Thao tác                                                            | Kết quả mong đợi                                                     |
| ---- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1    | Chọn 1 promo campaign (New Client / Birthday / Reminder) trên order | Giảm giá áp đúng theo cấu hình campaign trên DTS, tổng tiền cập nhật |

#### TC-VP4538-09 — Campaign tạo trước khi tiệm onboard có trên POS · Medium

| Bước | Thao tác                                  | Kết quả mong đợi                             |
| ---- | ----------------------------------------- | -------------------------------------------- |
| 1    | Tiệm #19388 (đã snap lại dữ liệu), mở POS | Có dữ liệu campaign của tiệm, kể cả Birthday |

---

## C. Kết quả QC trên Linear

- **12/10/2026** — dev kiểm tra: New Client lỗi (mã đến trước thông tin khách, không gắn được) → dev fix; Birthday:
  DTS chưa tạo mã Birthday nào cho tiệm 14. Tiệm #19388: campaign tạo trước khi onboard → đã snap lại, **13/10** có dữ
  liệu campaign.
- **22/10/2026** — PO xác nhận rule Birthday cần SMS; tiệm không mua SMS nên không thấy Birthday là đúng.
- **23/10/2026** — QC (Võ Minh Hưng) báo lỗi ở tiệm 14 và 100004: khách tạo trên POS không có promo New Client trên
  POS (DTS có); khách tạo trên DTS không sync về POS. Nguyên nhân: sync customer bị kẹt do đổi tên group trùng ở tiệm
  3 (22/10 ~23:37); dev đã gỡ kẹt.
- **23/10/2026 — POS app v1.1.57**: QC báo **Passed**. Comment không kèm bảng test case nên không rõ từng case (Reminder
  không có kết quả riêng).
- Không có bug mở.

## Lịch sử chạy

### 2026-10-23 (UTC+7)

- POS app v1.1.57, tiệm 14 / 100004: Passed (không có chi tiết từng case).
