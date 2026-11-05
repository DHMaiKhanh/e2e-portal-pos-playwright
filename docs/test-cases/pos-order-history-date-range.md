# VP-2105 — Order History: lịch chọn khoảng ngày bị trùng ngày giữa 2 tháng (POS)

> Bộ lọc khoảng ngày ở màn Order History mở 2 lịch tháng cạnh nhau. Trước khi sửa, ngày giáp ranh (vd 29, 30/6) hiện ở
> cả lịch tháng 6 lẫn lịch tháng 7, và ngày kết thúc đang chọn được tô ở cả 2 lịch (`showOutsideDays` không thống nhất
> giữa lịch trái và lịch phải trong `src/components/date-range-picker.tsx`). Sau khi sửa, mỗi lịch chỉ hiện ngày của
> tháng mình. ID test case: `TC-VP2105-NN`.

|                           |                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Ticket**                | [VP-2105](https://linear.app/fastboy/issue/VP-2105) — QC Completed                                     |
| **PR**                    | #3210 (merge 27/10/2026, theo comment QC; repo không ghi trong ticket)                                 |
| **Nền tảng**              | POS Windows                                                                                            |
| **Màn hình / Thành phần** | Order History → ô khoảng ngày → popover 2 lịch (`date-range-picker`), nút _Apply_ / _Today_ / _Cancel_ |
| **Môi trường**            | POS DEV, bản ≥ 1.1.67                                                                                  |
| **Tự động hoá**           | Không — app POS, test tay                                                                              |
| **Tổng test case**        | 12                                                                                                     |

---

## A. Phạm vi & dữ liệu

- **Trong phạm vi:** hiển thị ngày trong 2 lịch cạnh nhau, highlight ngày đầu/cuối khoảng, điều hướng tháng/năm, kết
  quả lọc đơn sau _Apply_, nút _Today_ / _Cancel_.
- **Ngoài phạm vi:** bộ lọc ngày ở các màn khác dùng chung component (chưa được nêu trong ticket).
- **Dữ liệu:** store DEV có đơn rải qua nhiều tháng (đặc biệt cuối tháng 6 và cuối tháng 9/2026). Vào Order History
  bằng staff code.
- **Ghi nhớ:** đơn được lọc theo **ngày tạo**, không theo ngày thanh toán lại (vd đơn tạo 29/6, reopen thanh toán 1/7 vẫn
  thuộc khoảng 15/06 – 30/06).

---

## B. Test case

### B1. Phiên bản

#### TC-VP2105-01 — POS đã lên bản có fix · High

| Bước | Thao tác                | Kết quả mong đợi                                   |
| ---- | ----------------------- | -------------------------------------------------- |
| 1    | Menu ≡ → Version Update | Hiện "You're Up to Date", Current version ≥ 1.1.67 |

### B2. Hiển thị lịch

#### TC-VP2105-02 — Mở bộ lọc mặc định: 2 lịch không trùng ngày · High

| Bước | Thao tác                          | Kết quả mong đợi                                                                                               |
| ---- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | Order History → bấm ô khoảng ngày | Popover mở 2 lịch tháng liền nhau                                                                              |
| 2    | Quan sát 2 lịch                   | Lịch trái chỉ có ngày của tháng trái, lịch phải chỉ có ngày của tháng phải; ô trống không hiện ngày tháng khác |

#### TC-VP2105-03 — Kịch bản lỗi gốc: cuối tháng 6 / tháng 7 · High

| Bước | Thao tác                                     | Kết quả mong đợi                                                                |
| ---- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| 1    | Lùi lịch trái về 6/2026, lịch phải về 7/2026 |                                                                                 |
| 2    | Chọn 15/06 và 30/06                          | 29, 30/6 chỉ hiện ở lịch tháng 6; lịch tháng 7 bắt đầu từ 1/7, không có 29/30/6 |

#### TC-VP2105-04 — Ngày kết thúc chỉ được tô ở 1 lịch · High

| Bước | Thao tác                           | Kết quả mong đợi                                                |
| ---- | ---------------------------------- | --------------------------------------------------------------- |
| 1    | Giữ khoảng 15/06 – 30/06, quan sát | 30/6 chỉ được tô ở lịch tháng 6; lịch tháng 7 không tô ngày nào |

#### TC-VP2105-05 — Chuyển năm (12/2025 – 1/2026) · Medium

| Bước | Thao tác                       | Kết quả mong đợi                                             |
| ---- | ------------------------------ | ------------------------------------------------------------ |
| 1    | Điều hướng về 12/2025 + 1/2026 | Mỗi lịch chỉ hiện ngày của tháng mình                        |
| 2    | Chọn 29/12/2025 – 04/01/2026   | 29–31/12 chỉ tô ở lịch tháng 12; 1–4/1 chỉ tô ở lịch tháng 1 |

#### TC-VP2105-06 — Tháng 2 (28 ngày) / tháng 3 · Low

| Bước | Thao tác                       | Kết quả mong đợi                                                       |
| ---- | ------------------------------ | ---------------------------------------------------------------------- |
| 1    | Điều hướng tới 2/2026 + 3/2026 | Tháng 2 chỉ 1–28, tháng 3 chỉ 1–31; ô trống không hiện ngày tháng khác |

### B3. Chọn khoảng & lọc đơn

#### TC-VP2105-07 — Apply lọc đơn đúng khoảng (15/06 – 30/06) · High

| Bước | Thao tác                       | Kết quả mong đợi                                                                          |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| 1    | Chọn 15/06 – 30/06 → **Apply** | Ô ngày hiện `06/15/2026 - 06/30/2026`                                                     |
| 2    | Xem danh sách đơn              | Chỉ có đơn tạo trong khoảng; đơn tạo 29/6 nhưng thanh toán lại 1/7 vẫn có trong danh sách |

#### TC-VP2105-08 — Mở lại bộ lọc sau khi Apply · Medium

| Bước | Thao tác                  | Kết quả mong đợi                                                |
| ---- | ------------------------- | --------------------------------------------------------------- |
| 1    | Sau TC-07, bấm lại ô ngày | Hiện lịch 6/2026 + 7/2026, khoảng chọn giữ nguyên               |
| 2    | Quan sát                  | Không trùng ngày giữa 2 lịch, ngày cuối không bị tô ở cả 2 lịch |

#### TC-VP2105-09 — Khoảng ngày vắt qua 2 lịch (28/09 – 03/10) · High

| Bước | Thao tác                                | Kết quả mong đợi                                             |
| ---- | --------------------------------------- | ------------------------------------------------------------ |
| 1    | Chọn 28/9 ở lịch trái, 3/10 ở lịch phải | 28–30/9 chỉ tô ở lịch tháng 9; 1–3/10 chỉ tô ở lịch tháng 10 |
| 2    | **Apply**                               | Danh sách chỉ có đơn trong khoảng, không có đơn ngoài khoảng |

#### TC-VP2105-10 — Nút Today / Cancel · Medium

| Bước | Thao tác                              | Kết quả mong đợi                                               |
| ---- | ------------------------------------- | -------------------------------------------------------------- |
| 1    | Mở popover → **Today**                | Lọc đúng ngày hôm nay                                          |
| 2    | Mở lại, đổi tháng/khoảng → **Cancel** | Popover đóng, khoảng đang lọc giữ nguyên (không áp khoảng mới) |

#### TC-VP2105-11 — Khoảng 1 ngày ở ngày cuối tháng · Low

| Bước | Thao tác                                               | Kết quả mong đợi                                                      |
| ---- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| 1    | Chọn 30/06 làm cả ngày bắt đầu và kết thúc → **Apply** | Chỉ ô 30/6 ở lịch tháng 6 được tô; danh sách chỉ có đơn tạo ngày 30/6 |

#### TC-VP2105-12 — Ngày bắt đầu là ngày 1 của tháng bên phải · Low

| Bước | Thao tác                                 | Kết quả mong đợi                                                 |
| ---- | ---------------------------------------- | ---------------------------------------------------------------- |
| 1    | Lịch 6/2026 + 7/2026, chọn 01/07 – 05/07 | Chỉ lịch tháng 7 có ngày được tô; lịch tháng 6 không tô ngày nào |
| 2    | **Apply**                                | Danh sách chỉ có đơn tạo 1–5/7                                   |

---

## C. Kết quả QC trên Linear

**27/10/2026** — khanh_do, POS Windows DEV **1.1.67** (đã có PR #3210): **10/10 PASS – 0 FAIL**.

| Test case (doc)   | TC trên Linear | Kết quả   | Ghi chú                                               |
| ----------------- | -------------- | --------- | ----------------------------------------------------- |
| TC-VP2105-01      | TC-01          | PASS      | Version 1.1.67                                        |
| TC-VP2105-02      | TC-02          | PASS      | Mặc định lịch 10/2026 + 11/2026                       |
| TC-VP2105-03      | TC-03          | PASS      |                                                       |
| TC-VP2105-04      | TC-04          | PASS      |                                                       |
| TC-VP2105-05      | TC-08          | PASS      |                                                       |
| TC-VP2105-06      | TC-09          | PASS      |                                                       |
| TC-VP2105-07      | TC-05          | PASS      | Đơn OD260629 (tạo 29/6, reopen 1/7) vẫn thuộc khoảng  |
| TC-VP2105-08      | TC-06          | PASS      |                                                       |
| TC-VP2105-09      | TC-07          | PASS      | 271 đơn, mã đơn từ 28/9 → 2/10 (UTC)                  |
| TC-VP2105-10      | TC-10          | PASS      | Today lọc 10/27/2026; Cancel giữ khoảng 09/28 – 10/03 |
| TC-VP2105-11, -12 | —              | Chưa chạy | Ca bổ sung trong doc, chưa có trên Linear             |

Không phát hiện bug.

## Lịch sử chạy

### 2026-10-27

- QC tay trên POS Windows DEV 1.1.67 — 10/10 PASS (TC-01 … -10). TC-11, -12 chưa chạy.
