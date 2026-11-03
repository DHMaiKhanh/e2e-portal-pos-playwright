# VP-4039 — Đổi màu chữ Menu service sang màu đen như tên thợ (POS)

> Ticket hỗ trợ #1532414 (ASIAN PEARL NAILS STUDIO, store #21013): ở màn checkout, phần Menu service, chữ tên service
> đang khó đọc trên nền màu. Tiệm muốn chữ service màu đen giống tên thợ. Request thứ 2 (lưu filter Active ở
> Setting/Employees) **đã bị gạch** khỏi ticket — ngoài phạm vi. ID test case: `TC-VP4039-NN`.

|                           |                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Ticket**                | [VP-4039](https://linear.app/fastboy/issue/VP-4039) — QC Completed (SS Request, Enhancement)                       |
| **PR**                    | volt-pos [#3133](https://github.com/FastboyMarketing/volt-pos/pull/3133)                                           |
| **Nền tảng**              | POS Windows                                                                                                        |
| **Màn hình / Thành phần** | Home / checkout → lưới Menu service (card service), dải tile category (gồm Quick Pay, Gift Card), ô Search service |
| **Môi trường**            | POS DEV, bản ≥ 1.1.58 (1.1.57 build trước khi merge, vẫn chữ trắng)                                                |
| **Tự động hoá**           | Không — app POS, test tay                                                                                          |
| **Tổng test case**        | 8                                                                                                                  |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** màu chữ tên / mô tả / giá trên card service, tên + số service trên tile category (cả Quick Pay,
  Gift Card, Product), card kết quả tìm kiếm.
- **Ngoài phạm vi:**
  - ~~Request 2: lưu filter Active ở Setting / Employees~~ — đã gạch trong ticket, không nằm trong PR, **không test**.
  - Màu nền category/service (chỉ đổi màu chữ, nền giữ nguyên — kiểm ở TC-07 như hồi quy).
- **Dữ liệu:** store DEV có nhiều category, trong đó có category nền màu tím đậm (QC dùng Gel & Acrylic Services
  `#785EE1`, Additional Services `#6C64E9`). Màu tên thợ tham chiếu: `rgb(47, 44, 53)`.

---

## B. Test case

#### TC-VP4039-01 — Đúng bản build có fix · High

| Bước | Thao tác                       | Kết quả mong đợi |
| ---- | ------------------------------ | ---------------- |
| 1    | Mở menu bên trái → xem Version | Version ≥ 1.1.58 |

#### TC-VP4039-02 — Chữ trên card service màu đen · High

| Bước | Thao tác                     | Kết quả mong đợi                                           |
| ---- | ---------------------------- | ---------------------------------------------------------- |
| 1    | Home → xem lưới Menu service | Tên, mô tả, giá service màu đen (ink), không còn chữ trắng |

#### TC-VP4039-03 — Chữ trên tile category màu đen · High

| Bước | Thao tác                                    | Kết quả mong đợi                                                            |
| ---- | ------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | Xem dải category, vuốt qua tất cả các trang | Tên category + số service màu đen trên mọi tile, kể cả Quick Pay, Gift Card |

#### TC-VP4039-04 — Màu chữ service giống màu tên thợ · Medium

| Bước | Thao tác                                  | Kết quả mong đợi                 |
| ---- | ----------------------------------------- | -------------------------------- |
| 1    | So màu tên thợ (tile thợ) với chữ service | Cùng một màu (`rgb(47, 44, 53)`) |

#### TC-VP4039-05 — Card kết quả tìm kiếm cũng chữ đen · Medium

| Bước | Thao tác                           | Kết quả mong đợi             |
| ---- | ---------------------------------- | ---------------------------- |
| 1    | Gõ `pedicure` vào ô Search service | Mọi card kết quả đều chữ đen |

#### TC-VP4039-06 — Category nền màu đậm vẫn đọc được · Medium

| Bước | Thao tác                                                          | Kết quả mong đợi                                                                    |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1    | Bấm vào category nền tím đậm (Gel & Acrylic, Additional Services) | Chữ đen trên nền tím vẫn đọc được (tương phản thấp hơn chữ trắng cũ — đúng yêu cầu) |

#### TC-VP4039-07 — Màu nền không đổi · Low

| Bước | Thao tác                                                | Kết quả mong đợi                |
| ---- | ------------------------------------------------------- | ------------------------------- |
| 1    | So màu nền tile/card giữa bản cũ (1.1.57) và bản có fix | Chỉ đổi màu chữ, nền giữ nguyên |

#### TC-VP4039-08 — Tile thợ không bị ảnh hưởng · Low

| Bước | Thao tác                        | Kết quả mong đợi                                         |
| ---- | ------------------------------- | -------------------------------------------------------- |
| 1    | Xem danh sách / tile thợ ở Home | Màu chữ tên thợ và màu nền tile thợ giữ nguyên như trước |

---

## C. Kết quả QC trên Linear

**26/10/2026** — khanh_do, POS Windows DEV **1.1.58** (build CI 26/10, có commit merge volt-pos#3133):
**7/7 PASS – 0 FAIL**.

| Test case (doc) | TC trên Linear | Kết quả   | Ghi chú                                                   |
| --------------- | -------------- | --------- | --------------------------------------------------------- |
| TC-VP4039-01    | TC01           | PASS      | Version 1.1.58                                            |
| TC-VP4039-02    | TC02           | PASS      | Lidasy, Dark Queen, Express Pedicure…                     |
| TC-VP4039-03    | TC03           | PASS      | 23 tile, 3 trang                                          |
| TC-VP4039-04    | TC04           | PASS      | Thợ Pamela, `rgb(47, 44, 53)`                             |
| TC-VP4039-05    | TC05           | PASS      | 22 card kết quả                                           |
| TC-VP4039-06    | TC06           | PASS      | Có ghi chú tương phản thấp ở nền tím đậm (không phải bug) |
| TC-VP4039-07    | TC07           | PASS      | So với 1.1.57                                             |
| TC-VP4039-08    | —              | Chưa chạy | Ca hồi quy bổ sung                                        |

Không phát hiện bug. Lưu ý: nếu tiệm phản hồi về độ tương phản trên category nền tím đậm thì cần xem lại.

## Lịch sử chạy

### 2026-10-26

- QC tay trên POS Windows DEV 1.1.58 — 7/7 PASS (TC-01 … -07). TC-08 chưa chạy. Request 2 (Employees filter) không
  test vì đã gạch khỏi ticket.
