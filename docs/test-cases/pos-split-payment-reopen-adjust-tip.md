# VP-4912 / VP-4913 — Re-Open và Adjust Tip sau Split Payment (POS)

> **VP-4912:** Re-Open order đã thanh toán split lần đầu không có option Close Ticket, chỉ cho sửa order hoặc Void All
> Payments. Logic mới: Re-Open đơn split mở thẳng màn sửa, **không** hỏi Void giao dịch, **khoá sửa tiền** (chỉ sửa staff,
> khách, note), có nút **Re-Open Done / Close Ticket**. **VP-4913:** Adjust Tip sau split payment phải cho chọn payment
> (Cash / Other / Card) để thu tip thay vì tự cộng vào payment đầu tiên. ID test case: `TC-VP4912-NN` (Re-Open) và
> `TC-VP4913-NN` (Adjust Tip).

|                    |                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4912](https://linear.app/fastboy/issue/VP-4912) — QC Completed · [VP-4913](https://linear.app/fastboy/issue/VP-4913) — QC Completed · hồi quy 1.1.85: VP-5286 / VP-5287 |
| **PR**             | Chưa ghi trên Linear                                                                                                                                                        |
| **Nền tảng**       | Windows (QC chạy trên Windows; Android chưa có kết quả)                                                                                                                     |
| **Màn hình**       | Checkout › **Split Order** · Payment Success › **Adjust Tip** · Order History › **Re-Open** / **Adjust Tip**                                                                |
| **Môi trường**     | DEV, tiệm test #14 (ticket gốc SS: account test 20258)                                                                                                                      |
| **Tự động hoá**    | Không — app POS, test tay                                                                                                                                                   |
| **Tổng test case** | 21 (VP-4912: 11 · VP-4913: 10)                                                                                                                                              |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:**
  - VP-4912: Re-Open đơn đã thanh toán split (successful, chưa settle) — không popup "Void Order Transactions", có Re-Open
    Done, khoá sửa tiền, giữ nguyên các giao dịch; khoá sửa tiền cả với đơn có promotion / reward / campaign / custom
    discount / cashback (yêu cầu chốt ngày 21/10).
  - VP-4913: Adjust Tip sau split ở Payment Success và Order History, chọn payment nhận tip; đơn 1 payment; gift card
    không nằm trong danh sách.
- **Ngoài phạm vi:** Void All Payments; đơn đã settle; settle batch.
- **Dữ liệu:**
  - Bật **tip sau thanh toán** (Adjust Tip).
  - Staff Pamela / Zelene Doyle; dịch vụ tổng $100 + tax $5 (= $105) cho VP-4912; dịch vụ ~$60 (đơn $63) cho VP-4913.
  - Gift card đủ $35 cho TC-VP4913-08; máy có **card terminal** cho TC-VP4913-10.
- **Lưu ý hồi quy:** QC 30/10 sáng trên **1.1.85** FAIL 6/10 (vẫn popup Void, không có Re-Open Done, Subtotal/Tax bị tính
  lại) — VP-5286 / VP-5287. Bản **1.1.68** đúng. Chạy lại toàn bộ B1 trên mỗi bản release.

---

## B. Test case

### B1. Re-Open sau Split Payment — VP-4912

#### TC-VP4912-01 — Thanh toán split Equally 2 check thành công · High

| Bước | Thao tác                                                          | Kết quả mong đợi                             |
| ---- | ----------------------------------------------------------------- | -------------------------------------------- |
| 1    | Tạo order $100 + tax $5 → Pay → **Split Order** → Equally 2 check |                                              |
| 2    | Check 1 trả Cash $52.49, check 2 trả Other $52.51                 | **All checks paid** → **Payment Successful** |

#### TC-VP4912-02 — Re-Open lần đầu không hiện popup "Void Order Transactions" · Critical

| Bước | Thao tác                                     | Kết quả mong đợi                                                                                                         |
| ---- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | Order History → mở đơn ở TC-01 → **Re-Open** | Popup xác nhận ghi _"Items and prices are locked. Staff, customer and notes can still change."_; **không** có popup Void |

#### TC-VP4912-03 — Có nút Re-Open Done / Close Ticket · Critical

| Bước | Thao tác                 | Kết quả mong đợi                                     |
| ---- | ------------------------ | ---------------------------------------------------- |
| 1    | Xác nhận Re-Open ở TC-02 | Màn sửa order có nút **Re-Open Done / Close Ticket** |

#### TC-VP4912-04 — Re-Open Done không sửa gì: đóng ticket, không bị ép Void · Critical

| Bước | Thao tác             | Kết quả mong đợi                                                                       |
| ---- | -------------------- | -------------------------------------------------------------------------------------- |
| 1    | Bấm **Re-Open Done** | Đơn về **Successful - Unsettled $105**; vẫn giữ 2 giao dịch Cash $52.49 + Other $52.51 |

#### TC-VP4912-05 — Subtotal / Tax giữ nguyên khi re-open · High

| Bước | Thao tác                    | Kết quả mong đợi                                    |
| ---- | --------------------------- | --------------------------------------------------- |
| 1    | Re-Open đơn split, xem tổng | Subtotal **$100.00**, Tax **$5.00**, không tính lại |

#### TC-VP4912-06 — Khoá sửa tiền trên đơn split · High

| Bước | Thao tác                             | Kết quả mong đợi                         |
| ---- | ------------------------------------ | ---------------------------------------- |
| 1    | Re-Open đơn split → thử thêm service | Catalog mờ, không thêm được              |
| 2    | Thử xoá một dòng                     | Nút xoá dòng disabled; Subtotal giữ $100 |

#### TC-VP4912-07 — Đổi staff rồi Re-Open Done, không bị void · High

| Bước | Thao tác                                            | Kết quả mong đợi                                               |
| ---- | --------------------------------------------------- | -------------------------------------------------------------- |
| 1    | Re-Open đơn split → đổi staff Zelene Doyle → Pamela |                                                                |
| 2    | **Re-Open Done**                                    | Staff: Pamela; đơn Successful - Unsettled; 2 giao dịch vẫn còn |

#### TC-VP4912-08 — Tái hiện với split Cash + Cash · Medium

| Bước | Thao tác                                                       | Kết quả mong đợi                                                    |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | Order $60 + tax $3 → split Cash $31.49 + Cash $31.51 → Re-Open | Không popup Void; có Re-Open Done; Subtotal/Tax $60 / $3 giữ nguyên |

#### TC-VP4912-09 — Đơn có promotion / reward / campaign / custom discount: khoá sửa tiền khi re-open · High

| Bước | Thao tác                                                                                  | Kết quả mong đợi                                                                              |
| ---- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1    | Checkout đơn (không split) có áp lần lượt promotion / reward / campaign / custom discount |                                                                                               |
| 2    | Re-Open                                                                                   | Chỉ cho sửa thông tin không phải tiền (staff, khách, note); không thêm/xoá món, không đổi giá |

#### TC-VP4912-10 — Đơn có cashback: khoá sửa tiền khi re-open · High

| Bước | Thao tác                                            | Kết quả mong đợi        |
| ---- | --------------------------------------------------- | ----------------------- |
| 1    | Checkout đơn có dùng / được cộng cashback → Re-Open | Khoá sửa tiền như TC-09 |

#### TC-VP4912-11 — Đơn thường 1 payment (không coupling) vẫn sửa được tiền khi re-open · Medium

| Bước | Thao tác                                                 | Kết quả mong đợi                                         |
| ---- | -------------------------------------------------------- | -------------------------------------------------------- |
| 1    | Checkout đơn 1 payment Cash, không promo/reward/cashback |                                                          |
| 2    | Re-Open                                                  | Hành vi re-open cũ: sửa được món/giá theo luồng hiện tại |

### B2. Adjust Tip sau Split Payment — VP-4913

#### TC-VP4913-01 — Hiện Adjust Tip sau Split Payment · High

| Bước | Thao tác                                                           | Kết quả mong đợi                                 |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------ |
| 1    | Split Order 2 check: Cash $31.49 + Other (Zelle) $31.51 → Complete | Màn **Payment Success** hiện link **Adjust Tip** |

#### TC-VP4913-02 — Adjust Tip cho chọn nguồn tiền · Critical

| Bước | Thao tác           | Kết quả mong đợi                                                                          |
| ---- | ------------------ | ----------------------------------------------------------------------------------------- |
| 1    | Bấm **Adjust Tip** | Popup **"Adjust Order Tip"** liệt kê cả Cash và Other; không tự cộng vào payment đầu tiên |

#### TC-VP4913-03 — Tip vào đúng payment Other · Critical

| Bước | Thao tác                                             | Kết quả mong đợi                                                    |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | Chọn Adjust Tip ở dòng Other → nhập **10.00** → Save | Other: $31.51 + **$10.00** Tip; Cash vẫn Tip $0.00; tổng **$73.00** |

#### TC-VP4913-04 — Tip vào đúng payment Cash · Critical

| Bước | Thao tác                                           | Kết quả mong đợi                                       |
| ---- | -------------------------------------------------- | ------------------------------------------------------ |
| 1    | Chọn Adjust Tip ở dòng Cash → nhập **5.00** → Save | Cash: Tip **$5.00**; Other giữ $10.00; tổng **$78.00** |

#### TC-VP4913-05 — Order History hiển thị tip theo từng payment · High

| Bước | Thao tác                         | Kết quả mong đợi                                                                     |
| ---- | -------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Order History → mở đơn TC-01..04 | Tip **$15.00** (Pamela - $15.00); Check -1 Cash Tip $5.00; Check -2 Other Tip $10.00 |

#### TC-VP4913-06 — Adjust Tip ở Order History vẫn hoạt động · Medium

| Bước | Thao tác                                   | Kết quả mong đợi                              |
| ---- | ------------------------------------------ | --------------------------------------------- |
| 1    | Order History → đơn split → **Adjust Tip** | Popup liệt kê đúng 2 payment với tip hiện tại |

#### TC-VP4913-07 — Đơn 1 payment mở keypad trực tiếp · Medium

| Bước | Thao tác                                              | Kết quả mong đợi                                            |
| ---- | ----------------------------------------------------- | ----------------------------------------------------------- |
| 1    | Thanh toán Cash $31.50 → Payment Success → Adjust Tip | Mở thẳng keypad Adjust Tip, **không** có popup chọn payment |

#### TC-VP4913-08 — Gift Card không nằm trong danh sách, nút vẫn hiện khi check 1 là Gift Card · High

| Bước | Thao tác                                                               | Kết quả mong đợi                                   |
| ---- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| 1    | Split 3 check: Gift Card $35 + Cash $35 + Other (Venmo) $35 → Complete | Payment Success vẫn hiện **Adjust Tip**            |
| 2    | Bấm Adjust Tip                                                         | Popup chỉ có Cash và Other, **không** có Gift Card |

#### TC-VP4913-09 — Version POS đúng bản có fix · Medium

| Bước | Thao tác                  | Kết quả mong đợi                              |
| ---- | ------------------------- | --------------------------------------------- |
| 1    | Menu → **Version Update** | Current version ≥ 1.1.62, "You're Up to Date" |

#### TC-VP4913-10 — Split có Card payment → chọn Card để adjust tip · High

| Bước | Thao tác                                           | Kết quả mong đợi                                        |
| ---- | -------------------------------------------------- | ------------------------------------------------------- |
| 1    | Máy có card terminal; split Card + Cash → Complete |                                                         |
| 2    | Adjust Tip                                         | Popup liệt kê payment Card; tip vào đúng giao dịch Card |

---

## C. Kết quả QC trên Linear

### VP-4912 — 30/10/2026, POS Windows DEV 1.1.68, tiệm #14 — **8 Pass / 0 Fail**

| Test case              | Kết quả                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| TC-VP4912-01 … -08     | Pass (QC TC-02 → TC-09; đơn OD261030-37013950 và OD261030-37253988)                               |
| TC-VP4912-09, -10, -11 | Chưa có kết quả trên Linear (yêu cầu khoá tiền cho promo/reward/cashback nêu trong comment 21/10) |

- Server xác nhận OD261030-37013950 vẫn giữ 2 giao dịch (Cash $52.49, Other $52.51) sau 2 lần re-open.
- **Hồi quy:** cùng ngày, bản **1.1.85** FAIL 6/10 (popup Void, không có Re-Open Done, Subtotal/Tax bị tính lại) —
  VP-5286 / VP-5287. QC đề nghị dev kiểm tra 1.1.85 trước khi release.

### VP-4913 — 26/10/2026, POS Windows 1.1.62, merchant DEV — **9 Pass / 0 Fail / 1 chưa test**

| Test case          | Kết quả                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| TC-VP4913-01 … -09 | Pass (đơn OD261026-36469109, OD261026-36791082, OD261026-36873074)        |
| TC-VP4913-10       | Chưa test — máy test không có card terminal (nút Pay của Card bị disable) |

## Lịch sử chạy

### 2026-10-30 (UTC+7) — VP-4912

- POS Windows DEV 1.1.68, tiệm #14: **8 Pass / 0 Fail** (TC-VP4912-01 … -08). Bản 1.1.85 cùng ngày: FAIL 6/10.

### 2026-10-26 (UTC+7) — VP-4913

- POS Windows 1.1.62: **9 Pass / 0 Fail**, TC-VP4913-10 chưa test (thiếu card terminal).
