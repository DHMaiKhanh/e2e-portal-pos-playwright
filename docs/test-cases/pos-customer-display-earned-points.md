# VP-5112 — Customer Display: "You've earned 1 point" đúng số ít / số nhiều (POS)

> Sau khi thanh toán, màn hình khách (Customer Display) hiện _"Congrats! You've earned **1 points**"_ — với 1 điểm phải là
> **"1 point"**. Tiệm cài Auto Checkout + Point Bonus = 1 (nhu cầu "1 lần check-in = 1 point" của task cha VP-4489, tiệm
> Pinky Nails and Spa) gặp ở mọi lần thanh toán. Fix: truyền `count` và thêm key `pointsValue_one` / `pointsValue_other`.
> ID test case: `TC-VP5112-NN`.

|                    |                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ticket**         | [VP-5112](https://linear.app/fastboy/issue/VP-5112) — QC Completed · cha [VP-4489](https://linear.app/fastboy/issue/VP-4489)               |
| **PR**             | volt-pos #3179                                                                                                                             |
| **Nền tảng**       | Windows (QC chạy trên Windows; Android chưa có kết quả)                                                                                    |
| **Màn hình**       | POS Checkout → **Customer Display** (màn Payment Success, khối điểm) · Portal › Store Settings › Payment & transactions › Checkout setting |
| **Môi trường**     | DEV, tiệm test #14 (Volt POS tiem test 14 v1)                                                                                              |
| **Tự động hoá**    | Không — app POS, test tay                                                                                                                  |
| **Tổng test case** | 8                                                                                                                                          |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** chuỗi "You've earned N point(s)" trên Customer Display sau thanh toán: 1 → "point", ≠ 1 → "points";
  số điểm hiện tại của khách cộng đúng; không hỏng chuỗi khi POS đổi ngôn ngữ; các chế độ checkout (Auto / Hybrid / Manual).
- **Ngoài phạm vi:** Customer Display hiện tiếng Anh khi POS ở Tiếng Việt (màn hình khách có ngôn ngữ riêng — hành vi có
  sẵn); quyết định ẩn dòng "0 points" ở Manual (chờ PO, TC-08).
- **Dữ liệu:**
  - Khách **new3** — \*\*\*-\*\*\*-7702 (lúc QC 27/10: 128 điểm trước khi test).
  - Dịch vụ Lidasy sửa giá $1.00 / $5.00; thanh toán Cash.
  - Cấu hình điểm lúc QC: Hybrid Checkout, Cash/Card/Other = 1 point / $1, Gift Card = No points.
  - Kịch bản gốc: Portal → Checkout setting → **Auto Checkout**, **Point Bonus = 1** → Save.

---

## B. Test case

#### TC-VP5112-01 — POS lên bản có fix · High

| Bước | Thao tác                    | Kết quả mong đợi                                           |
| ---- | --------------------------- | ---------------------------------------------------------- |
| 1    | Menu ≡ → **Version Update** | "You're Up to Date", current version ≥ 1.1.64 (bản có fix) |

#### TC-VP5112-02 — Được 1 điểm: hiển thị số ít "1 point" · Critical

| Bước | Thao tác                                                                            | Kết quả mong đợi                                              |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | Tạo order cho new3, dịch vụ $1.00 (tổng Cash $1.05) → Pay → Cash → Complete Payment | Thanh toán thành công                                         |
| 2    | Xem Customer Display                                                                | _"Congrats! You've earned **1 point**"_; điểm hiện tại tăng 1 |

#### TC-VP5112-03 — Được nhiều điểm: hiển thị số nhiều "N points" · High

| Bước | Thao tác                                               | Kết quả mong đợi                                      |
| ---- | ------------------------------------------------------ | ----------------------------------------------------- |
| 1    | Order new3, dịch vụ $5.00 (tổng Cash $5.25) → Complete | _"Congrats! You've earned **5 points**"_; điểm tăng 5 |

#### TC-VP5112-04 — Điểm hiện tại cộng đúng sau mỗi đơn · Medium

| Bước | Thao tác                                  | Kết quả mong đợi                                                                       |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| 1    | 4 đơn liên tiếp cho new3 ($1, $5, $5, $1) | "Your current points" tăng đúng số điểm nhận mỗi đơn (QC: 128 → 129 → 134 → 139 → 140) |

#### TC-VP5112-05 — POS ở Tiếng Việt: không hỏng chuỗi điểm · Low

| Bước | Thao tác                                                           | Kết quả mong đợi                                                         |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1    | Setting → Language → **Tiếng Việt**                                |                                                                          |
| 2    | Order new3, dịch vụ $1.00 → Cash → Complete → xem Customer Display | Chuỗi điểm hiển thị bình thường ("1 point"), không lộ key / `{{points}}` |
| 3    | Đổi POS về English                                                 |                                                                          |

#### TC-VP5112-06 — Kịch bản gốc: Auto Checkout + Point Bonus = 1 · High

| Bước | Thao tác                                                                     | Kết quả mong đợi                                                |
| ---- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1    | Portal DEV → Checkout setting: **Auto Checkout**, **Point Bonus = 1** → Save |                                                                 |
| 2    | POS: order cho new3 (7777777702) → Cash → chọn tip → xem Customer Display    | _"Congrats! You've earned **1 point**"_ (không phải "1 points") |

#### TC-VP5112-07 — Auto Checkout, không được điểm: ẩn khối điểm · Medium

| Bước | Thao tác                                                              | Kết quả mong đợi                                    |
| ---- | --------------------------------------------------------------------- | --------------------------------------------------- |
| 1    | Auto Checkout; thanh toán bằng phương thức "No points" (vd Gift Card) | Customer Display **ẩn** khối điểm (hành vi hiện có) |

#### TC-VP5112-08 — Manual, mọi payment method "No points": hiện "0 points" (chờ PO) · Low

| Bước | Thao tác                                                      | Kết quả mong đợi                                                                                                                           |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Checkout setting **Manual**, mọi payment method = "No points" |                                                                                                                                            |
| 2    | Thanh toán → xem Customer Display                             | Hiện tại: _"You've earned **0 points**"_ (số nhiều đúng ngữ pháp). PO chưa quyết có ẩn khối này như Auto không — ghi nhận, không đánh fail |

---

## C. Kết quả QC trên Linear

### 27/10/2026 — POS Windows DEV 1.1.64 (sau merge PR #3179), tiệm #14 — **5 Pass / 0 Fail**

| Test case          | Kết quả                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| TC-VP5112-01 … -05 | Pass (QC TC01 … TC05; build có key `pointsValue_one` / `pointsValue_other`)                                 |
| TC-VP5112-06       | Chưa chạy lại — tiệm #14 đang để Hybrid cho đợt test VP-4591 (cùng component, QC đánh giá áp dụng như nhau) |
| TC-VP5112-07, -08  | Chưa có kết quả; câu hỏi ẩn "0 points" ở Manual vẫn chờ PO                                                  |

- Lỗi gốc ghi nhận 26/10 trên POS 1.1.57: "Congrats! You've earned **1 points**".

## Lịch sử chạy

### 2026-10-27 (UTC+7)

- POS Windows DEV 1.1.64: **5 Pass / 0 Fail** (TC-VP5112-01 … -05); TC-06 … -08 chưa chạy.
