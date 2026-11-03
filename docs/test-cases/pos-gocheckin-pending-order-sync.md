# VP-4823 — Check-in GoCheckin kiosk phải lên order pending trên POS (POS)

> Bug: check-in trên kiosk GoCheckin (GAP, tiệm 14) thành công nhưng không hiện thành order trên màn **Pending Orders**
> của Volt POS — 1/18 check-in bị mất (`Bulk017 T76605`). Doc này kiểm tra mọi check-in kiosk đều lên Pending Orders,
> đúng thông tin, kể cả khi tạo liên tiếp. ID test case: `TC-VP4823-NN`.

|                    |                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------- |
| **Ticket**         | [VP-4823](https://linear.app/fastboy/issue/VP-4823) — QC Completed                  |
| **PR**             | Không ghi trong Linear                                                              |
| **Nền tảng**       | Windows (Volt POS desktop) / Android (chưa có kết quả)                              |
| **Màn hình**       | GAP `gap.gocheckin.net` › mini app **GoCheckin** (kiosk) · POS › **Pending Orders** |
| **Môi trường**     | DEV, merchant/tiệm `14` (GAP đăng nhập OWNER; Volt POS cùng tiệm 14)                |
| **Tự động hoá**    | Không — app POS, test tay                                                           |
| **Tổng test case** | 8                                                                                   |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** check-in trên kiosk GoCheckin → order pending trên POS; check-in liên tiếp số lượng lớn; thông
  tin order (tên, SĐT, dịch vụ, thợ); mở lại app.
- **Ngoài phạm vi:** checkout/thanh toán order; appointment.
- **Dữ liệu:** khách mới, tên dạng `BulkNNN T<runId>`, SĐT dạng `876605NNNN`; dịch vụ **Gel Shellac**, thợ
  **1001vvv**. Mỗi check-in: SĐT → tên → skip email/birthday → chọn dịch vụ → chọn thợ → ký consent → NEXT.
- **Ca lỗi gốc:** `Bulk017 T76605`, SĐT 876-605-0017 (app hiển thị `***-***-0017`), tạo 20/10/2026 10:08:52 giờ VN
  (03:08:52 UTC). Check-in #016 và #018 (`Bulk018 T76605`, 8766050018) vẫn lên bình thường → không phải do sync chậm.
- **Nguyên nhân / cách fix:** không ghi trong Linear.

---

## B. Test case

#### TC-VP4823-01 — Một check-in kiosk lên Pending Orders · Critical

| Bước | Thao tác                                                      | Kết quả mong đợi                          |
| ---- | ------------------------------------------------------------- | ----------------------------------------- |
| 1    | GAP → GoCheckin, check-in 1 khách mới (Gel Shellac / 1001vvv) | Kiosk quay về màn nhập SĐT, không báo lỗi |
| 2    | POS tiệm 14 → Pending Orders                                  | Có order pending của khách vừa check-in   |

#### TC-VP4823-02 — Thông tin order đúng với check-in · High

| Bước | Thao tác                    | Kết quả mong đợi                                                                          |
| ---- | --------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | Mở order của TC-01 trên POS | Đúng tên khách, SĐT hiển thị dạng `***-***-<4 số cuối>`, dịch vụ Gel Shellac, thợ 1001vvv |

#### TC-VP4823-03 — 18 check-in liên tiếp đều lên POS · Critical

| Bước | Thao tác                                                   | Kết quả mong đợi                                       |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------ |
| 1    | Tạo 18 check-in liên tiếp (~1 phút/cái), ghi lại tên + SĐT |                                                        |
| 2    | POS → Pending Orders, đối chiếu từng khách                 | Đủ **18/18** order; không thiếu khách nào (kể cả #017) |

#### TC-VP4823-04 — Batch 100 check-in · High

| Bước | Thao tác                                       | Kết quả mong đợi                    |
| ---- | ---------------------------------------------- | ----------------------------------- |
| 1    | Tạo 100 check-in (tên dạng `BulkNNN T<runId>`) |                                     |
| 2    | Đối chiếu Pending Orders                       | Đủ **100/100** order, tỉ lệ mất = 0 |

#### TC-VP4823-05 — Check-in sát nhau (dưới 1 phút) · Medium

| Bước | Thao tác                                    | Kết quả mong đợi                     |
| ---- | ------------------------------------------- | ------------------------------------ |
| 1    | Tạo 5 check-in nhanh nhất có thể, liền nhau |                                      |
| 2    | Đối chiếu Pending Orders                    | Đủ 5 order, không trùng, không thiếu |

#### TC-VP4823-06 — Mở lại app vẫn thấy order · Medium

| Bước | Thao tác                           | Kết quả mong đợi                                           |
| ---- | ---------------------------------- | ---------------------------------------------------------- |
| 1    | Sau TC-03, đóng và mở lại Volt POS | Pending Orders vẫn đủ các order, không mất, không nhân đôi |

#### TC-VP4823-07 — Khách đã có trong tiệm check-in kiosk · Medium

| Bước | Thao tác                                 | Kết quả mong đợi                                                 |
| ---- | ---------------------------------------- | ---------------------------------------------------------------- |
| 1    | Check-in kiosk bằng SĐT khách đã tồn tại | Order pending lên POS, gắn đúng khách cũ (không tạo khách trùng) |

#### TC-VP4823-08 — Kiosk submit lỗi phải báo lỗi, không im lặng · Medium

| Bước | Thao tác                                         | Kết quả mong đợi                                                                       |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1    | Ngắt mạng kiosk ngay trước bước NEXT, rồi submit | Kiosk báo lỗi / cho thử lại; không quay về màn SĐT như đã thành công mà không có order |

---

## C. Kết quả QC trên Linear

- **20/10/2026** — phát hiện bug: 18 check-in, **17/18** lên Pending Orders, thiếu `Bulk017 T76605`. Đã quét Pending
  Orders 22 lần trong hơn 3 phút, qua 1 lần mở lại app. Batch 100 check-in (`BulkNNN T02785`) được nhắc là đang chạy,
  **chưa có kết quả** trong Linear.
- **22/10/2026 — POS dev 1.1.56**: QC xác nhận pass ("verified that the task passed on dev"). Comment không kèm bảng
  test case nên không rõ đã chạy lại những case nào và với bao nhiêu check-in.
- Kết quả từng test case trong doc này: chưa có.
- Không có bug mở.

## Lịch sử chạy

### 2026-10-22 (UTC+7)

- POS dev 1.1.56, tiệm 14: QC verify pass (không có chi tiết từng case).
