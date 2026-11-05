# VP-4489 — Điểm theo lượt check-in (1 check-in = 1 point) không bị đổi thành $1 = 1 point (POS)

> Ticket #1552811 (Pinky Nails and Spa #20673): tiệm cài 1 lần check-in = 1 point, sau khi cập nhật Volt POS hệ thống tự
> chuyển sang $1 = 1 point; SS tắt $1 = 1 point thì mất luôn điểm check-in. Fix nằm trong project
> **Checkout Type Setting**: **Auto Checkout + Point Bonus** cho điểm cố định mỗi lần check-in, không phụ thuộc số tiền.
> Phần cấu hình trên Portal đã có test tự động ở [checkout-type-setting.md](checkout-type-setting.md) (VP-4590). File
> này là các ca **POS** QC test tay.

|                    |                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4489](https://linear.app/fastboy/issue/VP-4489) — QC Completed · bug con [VP-5112](https://linear.app/fastboy/issue/VP-5112) |
| **Nền tảng**       | POS Windows                                                                                                                      |
| **Màn hình**       | Portal › Store Settings › Payment & transactions (Checkout setting, Point config) → POS checkout, màn hình khách                 |
| **Môi trường**     | DEV, store `#14`, khách `new3` (`***-7702`)                                                                                      |
| **Tự động hoá**    | Portal: có (`tests/e2e/settings/checkout-setting/`); POS: không — test tay                                                       |
| **Tổng test case** | 7                                                                                                                                |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** số điểm khách nhận khi thanh toán trên POS theo từng tổ hợp Checkout type × Point config; POS nhận
  setting mới từ Portal mà không cần khởi động lại.
- **Ngoài phạm vi:** validate form Checkout setting trên Portal (xem checkout-type-setting.md); chữ "1 point"/"1 points"
  trên màn hình khách tách thành [VP-5112](pos-customer-display-earned-points.md).
- **Dữ liệu:** khách `new3` (SĐT `7777777702`), order $63.00 trả Cash. Sau khi test trả setting tiệm #14 về như cũ:
  Manual, Point Bonus 10, Cash/Card/Other $1.00, Gift card No points.

---

## B. Test case

#### TC-VP4489-CI-01 — Auto: 1 check-in = 1 point, không tính theo tiền · P1

| Bước | Thao tác                                                                   | Kết quả mong đợi                   |
| ---- | -------------------------------------------------------------------------- | ---------------------------------- |
| 1    | Portal: **Auto Checkout**, Point Bonus **1**, Cash/Card/Other $1.00 → Save |                                    |
| 2    | POS: tạo order $63.00 cho `new3`, trả Cash                                 | Khách **+1** điểm (không phải +63) |

#### TC-VP4489-CI-02 — Auto: tắt $1 = 1 point vẫn giữ điểm check-in (đúng case của tiệm) · P1

| Bước | Thao tác                                                        | Kết quả mong đợi      |
| ---- | --------------------------------------------------------------- | --------------------- |
| 1    | Portal: Auto, Point Bonus 1, **mọi** payment method "No points" |                       |
| 2    | POS: thanh toán order $63.00                                    | Khách vẫn **+1** điểm |

#### TC-VP4489-CI-03 — Manual + mọi method "No points" · P2

| Bước | Thao tác                               | Kết quả mong đợi                                       |
| ---- | -------------------------------------- | ------------------------------------------------------ |
| 1    | Portal: Manual, mọi method "No points" |                                                        |
| 2    | POS: thanh toán order $63.00           | **0** điểm (theo thiết kế: Manual không bù bằng bonus) |

#### TC-VP4489-CI-04 — Manual: $1 = 1 point không bị ảnh hưởng · P1

| Bước | Thao tác                              | Kết quả mong đợi |
| ---- | ------------------------------------- | ---------------- |
| 1    | Portal: Manual, Cash/Card/Other $1.00 |                  |
| 2    | POS: thanh toán order $63.00          | **+63** điểm     |

#### TC-VP4489-CI-05 — Auto: order $0 không cộng điểm · P2

| Bước | Thao tác                                     | Kết quả mong đợi                                     |
| ---- | -------------------------------------------- | ---------------------------------------------------- |
| 1    | Portal: Auto, Point Bonus 1                  |                                                      |
| 2    | POS: order giảm giá 100% → $0.00, thanh toán | Không cộng điểm, màn hình khách không hiện khối điểm |

#### TC-VP4489-CI-06 — Đổi setting trên Portal áp dụng ngay, không cần restart POS · P2

| Bước | Thao tác                                                           | Kết quả mong đợi                                                           |
| ---- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1    | POS đang chạy; Portal đổi Manual ↔ Auto / bonus / No points → Save |                                                                            |
| 2    | Chờ đồng bộ rồi thanh toán order trên POS                          | POS nhận setting mới trong ~10–20 giây, order sau đó tính theo setting mới |

#### TC-VP4489-CI-07 — Màn hình khách hiển thị đúng số điểm · P3

| Bước | Thao tác                                             | Kết quả mong đợi                              |
| ---- | ---------------------------------------------------- | --------------------------------------------- |
| 1    | Auto, Point Bonus 1 → thanh toán, xem màn hình khách | "Congrats! You've earned **1 point**" (số ít) |

---

## C. Kết quả QC trên Linear

- **26/10/2026 (POS dev 1.1.57, store #14): 6 PASS / 1 FAIL.** Lỗi chính của tiệm đã được fix (CI-01, CI-02 pass).
  CI-07 fail ("1 points") → log [VP-5112](pos-customer-display-earned-points.md).
- **02/11/2026:** QC xác nhận pass trên dev **1.1.64** → ticket **QC Completed**.
- Ghi chú cho PO: ở Manual khi 0 điểm, màn hình khách vẫn hiện "You've earned 0 points" (Auto thì ẩn).

## Lịch sử chạy

Chưa chạy lại ngoài các lần QC ở mục C.
