# VP-4376 — Guard huỷ đơn gift card không chặn nhầm khi tra mã ra card rỗng (POS)

> Khi huỷ order có bán/top-up gift card, guard của VP-3727 tra số dư hiện tại theo từng mã (`giftCard.code` →
> `history.code` → `posGiftCard.code`). Với mã không tìm thấy, API `GET /gift_card/code/{code}` trả **card rỗng**
> (`id: ""`, `currentBalance: 0`) thay vì 404/null; production coi đó là số dư $0, dừng ở mã đầu và chặn huỷ với thông báo
> sai "không đủ số dư". Bản sửa riêng cho production (develop đã sửa kèm trong #2844 / VP-4176). ID test case:
> `TC-VP4376-NN`.

|                    |                                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4376](https://linear.app/fastboy/issue/VP-4376) — Done · gốc [VP-3727](https://linear.app/fastboy/issue/VP-3727) · ship kèm [VP-4176](https://linear.app/fastboy/issue/VP-4176) |
| **PR**             | Bản sửa production: chưa ghi trên Linear. Develop: volt-pos #2844 (VP-4176). Lỗi lên production qua volt-pos #2905 (06/10)                                                          |
| **Nền tảng**       | Windows (Android không có guard này)                                                                                                                                                |
| **Màn hình**       | Order History › mở order › **Cancel**                                                                                                                                               |
| **Môi trường**     | DEV/QC, tiệm test #14                                                                                                                                                               |
| **Tự động hoá**    | Không — app POS, test tay                                                                                                                                                           |
| **Tổng test case** | 6                                                                                                                                                                                   |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** guard kiểm tra số dư khi huỷ order bán / top-up gift card trên Windows: thử lần lượt các mã, coi card
  rỗng (không có `id`) là "chưa biết" để thử mã kế tiếp, phân biệt "không kiểm tra được" với "không đủ số dư".
- **Ngoài phạm vi:** Android (không có guard); số dư gift card trên receipt (VP-4176); đổi hành vi API trả card rỗng.
- **Dữ liệu:** order bán (hoặc top-up) **1 gift card $50**, đã thanh toán.
- **Cách làm mã không tra được:** xoá/đổi mã thẻ trong hệ thống gift card, hoặc dùng Fiddler/Charles trả cho
  `GET …/gift_card/code/<mã thẻ>` body `{"id":"","code":"","currentBalance":0,"status":"","initialBalance":0}`.
- **Thông báo:**
  - Không kiểm tra được: _"Không kiểm tra được số dư thẻ quà tặng. Kiểm tra kết nối và thử lại."_
  - Không đủ số dư: _"Không thể huỷ đơn hàng — Số dư thẻ quà tặng không đủ để hoàn lại giao dịch nạp tiền này."_

---

## B. Test case

#### TC-VP4376-01 — Mã đầu ra card rỗng, mã `posGiftCard` đủ số dư: cho huỷ · Critical

| Bước | Thao tác                                                                             | Kết quả mong đợi                                               |
| ---- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 1    | Tạo order bán 1 gift card $50, thanh toán xong                                       |                                                                |
| 2    | Làm mã đầu (`giftCard.code`) trả card rỗng; mã `posGiftCard` vẫn tra được, số dư $50 |                                                                |
| 3    | Order History → mở order → **Cancel**                                                | Guard thử tiếp mã kế; **cho huỷ**; không hiện "không đủ số dư" |

#### TC-VP4376-02 — Không mã nào tra được: báo "Không kiểm tra được số dư" · Critical

| Bước | Thao tác                                              | Kết quả mong đợi                                                                                             |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1    | Order bán gift card $50; làm **mọi mã** trả card rỗng |                                                                                                              |
| 2    | Order History → **Cancel**                            | Báo _"Không kiểm tra được số dư thẻ quà tặng. Kiểm tra kết nối và thử lại."_; **không** báo "không đủ số dư" |

#### TC-VP4376-03 — Thẻ thật sự thiếu số dư vẫn bị chặn · Critical

| Bước | Thao tác                                                           | Kết quả mong đợi                                                                 |
| ---- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1    | Bán gift card $50; dùng thẻ thanh toán đơn khác để số dư còn < $50 | Mã thẻ tra được, số dư thật < $50                                                |
| 2    | Order History → mở order bán thẻ → **Cancel**                      | Chặn huỷ với _"Số dư thẻ quà tặng không đủ để hoàn lại giao dịch nạp tiền này."_ |

#### TC-VP4376-04 — Order top-up gift card: cùng hành vi như order bán · High

| Bước | Thao tác                                            | Kết quả mong đợi           |
| ---- | --------------------------------------------------- | -------------------------- |
| 1    | Tạo order **top-up** gift card $50, thanh toán xong |                            |
| 2    | Lặp lại TC-01 và TC-02 với order top-up             | Kết quả giống TC-01, TC-02 |

#### TC-VP4376-05 — Mã tra được bình thường, đủ số dư: huỷ được (regression) · High

| Bước | Thao tác                                     | Kết quả mong đợi              |
| ---- | -------------------------------------------- | ----------------------------- |
| 1    | Order bán gift card $50, không can thiệp API |                               |
| 2    | Order History → **Cancel**                   | Huỷ thành công, không báo lỗi |

#### TC-VP4376-06 — Mất kết nối khi huỷ: báo "Không kiểm tra được số dư" · Medium

| Bước | Thao tác                                                          | Kết quả mong đợi                                                                 |
| ---- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1    | Order bán gift card $50; chặn request `gift_card/code` (lỗi mạng) |                                                                                  |
| 2    | Order History → **Cancel**                                        | Báo _"Không kiểm tra được số dư…"_, không báo "không đủ số dư"; đơn không bị huỷ |

---

## C. Kết quả QC trên Linear

Chưa có kết quả QC. Ticket ở trạng thái **Done**; comment 08/10 (Thien Duy): bản sửa sẽ lên production cùng
[VP-4176](https://linear.app/fastboy/issue/VP-4176). Mô tả ticket ghi đã xác nhận lỗi bằng cách chạy test của develop trên
code production: ca _"treats a code the API answers with an empty card (no id, balance 0) as unresolved, not as zero"_
fail (production trả `insufficient`, develop trả `unverified`).

## Lịch sử chạy

_Chưa chạy._
