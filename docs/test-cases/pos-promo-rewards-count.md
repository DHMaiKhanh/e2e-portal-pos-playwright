# VP-4802 — Số Promotion + Reward khả dụng trên nút Promo & Rewards (POS)

> Nút **Promo & Rewards** trên màn Create Order hiện số ưu đãi khách dùng được cho order, để thu ngân biết ngay có bao
> nhiêu ưu đãi. Số hiển thị = số Promotion đủ điều kiện (chưa dùng, còn hạn) + số Reward đủ điều kiện (điểm reward ≤ điểm
> của khách). ID test case: `TC-VP4802-NN`.

|                    |                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4802](https://linear.app/fastboy/issue/VP-4802) — QC Completed                        |
| **PR**             | volt-pos [#3109](https://github.com/FastboyMarketing/volt-pos/pull/3109) (approved 22/10) |
| **Nền tảng**       | Windows (QC chạy trên Windows; Android chưa có kết quả)                                   |
| **Màn hình**       | Create Order / Quick Checkout › nút **Promo & Rewards** và dialog Promotions & Rewards    |
| **Môi trường**     | DEV, tiệm test #14                                                                        |
| **Tự động hoá**    | Không — app POS, test tay                                                                 |
| **Tổng test case** | 14                                                                                        |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** badge số trên nút Promo & Rewards: có/không có khách, khách nhiều/ít điểm, có/không promotion, sau
  khi áp và sau khi đã dùng promotion, order chỉ gift card, order gift card + dịch vụ, mở lại pending order, giới hạn 99+.
- **Ngoài phạm vi:** logic áp promotion/reward vào tiền order.
- **Dữ liệu (lúc QC 26/10):** 6 reward active (3 reward 0 điểm, 1 reward 5 điểm, 1 reward 10 điểm, 1 reward 100 điểm).

| Khách   | SĐT         | Điểm | Promotion chưa dùng | Số mong đợi |
| ------- | ----------- | ---- | ------------------- | ----------- |
| hihi    | \*\*\*-9850 | 138  | 4                   | 10          |
| new3    | \*\*\*-7702 | 0    | 0                   | 3           |
| Bulk T  | \*\*\*-0085 | 10   | 0                   | 5           |
| finally | \*\*\*-7384 | 7    | 1                   | 5           |
| Bob     | \*\*\*-3625 | 382  | 0                   | 6           |

> Điểm và promotion của khách thay đổi theo thời gian — trước khi chạy, đếm lại danh sách trong dialog và so với badge.

---

## B. Test case

### B1. Số hiển thị theo khách

#### TC-VP4802-01 — Order không có khách: không có số · High

| Bước | Thao tác                                                       | Kết quả mong đợi                                       |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------ |
| 1    | Quick Checkout → chọn staff Pamela + dịch vụ, không nhập khách | Nút Promo & Rewards **không** có số                    |
| 2    | Mở dialog                                                      | Báo "No promotions available" / "No rewards available" |

#### TC-VP4802-02 — Khách có nhiều promotion + reward · High

| Bước | Thao tác                               | Kết quả mong đợi                      |
| ---- | -------------------------------------- | ------------------------------------- |
| 1    | Gắn khách hihi (138 điểm, 4 promotion) | Badge **10** = 4 promotion + 6 reward |
| 2    | Mở dialog                              | Danh sách khớp số trên badge          |

#### TC-VP4802-03 — Bỏ khách khỏi order: số biến mất · Medium

| Bước | Thao tác                                                 | Kết quả mong đợi     |
| ---- | -------------------------------------------------------- | -------------------- |
| 1    | Order đang có khách hihi (badge 10) → xoá khách → Remove | Số trên nút biến mất |

#### TC-VP4802-04 — Khách 0 điểm, không có promotion · High

| Bước | Thao tác                | Kết quả mong đợi                               |
| ---- | ----------------------- | ---------------------------------------------- |
| 1    | Gắn khách new3 (0 điểm) | Badge **3** = 3 reward 0 điểm, không promotion |

#### TC-VP4802-05 — Khách đủ điểm cho reward 10 điểm · Medium

| Bước | Thao tác                   | Kết quả mong đợi                   |
| ---- | -------------------------- | ---------------------------------- |
| 1    | Gắn khách Bulk T (10 điểm) | Badge **5** = 5 reward (≤ 10 điểm) |

#### TC-VP4802-06 — Khách có 1 promotion + reward · High

| Bước | Thao tác                                | Kết quả mong đợi                                |
| ---- | --------------------------------------- | ----------------------------------------------- |
| 1    | Gắn khách finally (7 điểm, 1 promotion) | Badge **5** = 1 promotion + 4 reward (≤ 7 điểm) |

### B2. Thay đổi trạng thái order

#### TC-VP4802-07 — Áp promotion vào order: số vẫn hiện bình thường · Medium

| Bước | Thao tác                                                                    | Kết quả mong đợi                     |
| ---- | --------------------------------------------------------------------------- | ------------------------------------ |
| 1    | Order của finally → chọn promotion "Remind after 15 days not visit" → Apply | Order lưu promotion; badge vẫn **5** |

#### TC-VP4802-08 — Promotion đã dùng không còn được đếm · High

| Bước | Thao tác                              | Kết quả mong đợi                                                              |
| ---- | ------------------------------------- | ----------------------------------------------------------------------------- |
| 1    | Thanh toán order TC-07 (cash $63.00)  | Khách được cộng điểm (lúc QC: lên 70)                                         |
| 2    | Tạo order mới cho finally → mở dialog | Promotion đã dùng không còn; badge **5** = 0 promotion + 5 reward (≤ 70 điểm) |

#### TC-VP4802-09 — Order chỉ có gift card: không có số · High

| Bước | Thao tác                                             | Kết quả mong đợi                                         |
| ---- | ---------------------------------------------------- | -------------------------------------------------------- |
| 1    | Khách finally, order chỉ có dòng gift card (nạp $25) | Badge **không** hiện                                     |
| 2    | Mở dialog                                            | Báo _"Promotions and rewards don't apply to gift cards"_ |

#### TC-VP4802-10 — Order gift card + dịch vụ: số hiện lại · Medium

| Bước | Thao tác                                       | Kết quả mong đợi     |
| ---- | ---------------------------------------------- | -------------------- |
| 1    | Thêm staff + dịch vụ vào order gift card TC-09 | Badge hiện lại **5** |

#### TC-VP4802-11 — Mở lại pending order có sẵn · Medium

| Bước | Thao tác                                                 | Kết quả mong đợi                                  |
| ---- | -------------------------------------------------------- | ------------------------------------------------- |
| 1    | Pending Orders → mở order của Bob (382 điểm) → mở dialog | Badge **6** = 0 promotion + 6 reward, khớp dialog |

### B3. Biên và đồng bộ (chưa test được trên dev)

#### TC-VP4802-12 — Hơn 99 ưu đãi hiển thị "99+" · Low

| Bước | Thao tác                                          | Kết quả mong đợi   |
| ---- | ------------------------------------------------- | ------------------ |
| 1    | Gắn khách có > 99 promotion + reward đủ điều kiện | Badge hiện **99+** |

#### TC-VP4802-13 — Promotion gán từ Portal / POS khác: số tự cập nhật · Medium

| Bước | Thao tác                                                     | Kết quả mong đợi                                     |
| ---- | ------------------------------------------------------------ | ---------------------------------------------------- |
| 1    | Order đang mở cho khách X, ghi lại badge                     |                                                      |
| 2    | Trên Portal (hoặc POS khác) gán thêm 1 promotion cho khách X | Badge trên POS tăng 1 (sau khi tải lại / tự đồng bộ) |

#### TC-VP4802-14 — Promotion inactive hoặc chưa tới ngày bắt đầu không được đếm · Medium

| Bước | Thao tác                                                                        | Kết quả mong đợi                                              |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | Gán cho khách 1 promotion **inactive** và 1 promotion **chưa tới ngày bắt đầu** |                                                               |
| 2    | Gắn khách vào order, so badge với dialog                                        | Hai promotion này **không** được đếm, không hiện trong dialog |

> QC ghi chú: query hiện chỉ lọc theo ngày hết hạn, **không** lọc `isActive` / ngày bắt đầu — ca này có khả năng fail.

---

## C. Kết quả QC trên Linear

### 26/10/2026 — POS Windows DEV 1.1.57 (update thật từ 1.1.51), tiệm #14 — **11 Pass / 0 Fail**

| Test case          | Kết quả                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| TC-VP4802-01 … -11 | Pass (QC PR-01 … PR-11)                                                                                |
| TC-VP4802-12       | Chưa test — dev không có khách nào đủ 100 promotion/reward                                             |
| TC-VP4802-13       | Chưa test — cần thao tác trên Portal                                                                   |
| TC-VP4802-14       | Chưa test — dev không có khách được gán loại này; nghi lỗi (query không lọc `isActive` / ngày bắt đầu) |

## Lịch sử chạy

### 2026-10-26 (UTC+7)

- POS Windows DEV 1.1.57: **11 Pass / 0 Fail** (TC-VP4802-01 … -11); TC-12 … -14 chưa test.
